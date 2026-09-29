const {cleanText}=require('./context');
// Merge only overlapping retrieved neighbors; preserve provenance for sentences
// that span chunk boundaries. No extra database context is fetched.
function evidenceCatalog(retrieved) {
 const groups=[];
 for(const chunk of [...retrieved].sort((a,b)=>a.index-b.index)) {
  const text=chunk.text;const previous=groups.at(-1);let overlap=0;
  if(previous && Number.isInteger(chunk.startToken) && chunk.startToken<=previous.endToken) {
   for(let n=Math.min(previous.text.length,text.length,2000);n>=8;n--)if(previous.text.endsWith(text.slice(0,n))){overlap=n;break;}
  }
  if(overlap){const start=previous.text.length-overlap;previous.text+=text.slice(overlap);previous.spans.push({start,end:start+text.length,chunk});previous.endToken=chunk.endToken;}
  else groups.push({text,endToken:chunk.endToken,spans:[{start:0,end:text.length,chunk}]});
 }
 const catalog=[];let blockId=0;let groupId=0;
 for(const group of groups) {
  groupId++;
  let normalized='';const positions=[];
  for(let i=0;i<group.text.length;i++) {
   const char=group.text[i];
   if(/\s/.test(char)){if(normalized && !normalized.endsWith(' ')){normalized+=' ';positions.push(i);}}
   else {normalized+=char;positions.push(i);}
  }
  const offset=raw=>{let lo=0,hi=positions.length;while(lo<hi){const mid=(lo+hi)>>1;if(positions[mid]<raw)lo=mid+1;else hi=mid;}return lo;};
  let cursor=0,blockStart=null,blockEnd=0;
  const add=(start,end,heading=false)=>{
   const block=++blockId;
   const a=offset(start),b=offset(end);const blockText=normalized.slice(a,b);
   const parts=heading?[{segment:blockText,index:0}]:Array.from(new Intl.Segmenter('en',{granularity:'sentence'}).segment(blockText));
   for(const part of parts) {
    const text=cleanText(part.segment);if(!text)continue;
    const begin=positions[a+part.index]??start;const finish=positions[a+part.index+part.segment.length-1]+1;
    const sources=group.spans.filter(s=>s.start<finish && s.end>begin).map(s=>s.chunk);
    catalog.push({text,sources,heading,blockId:block,groupId});
   }
  };
  const flush=()=>{if(blockStart!==null)add(blockStart,blockEnd);blockStart=null;};
  for(const line of group.text.split('\n')) {
   const words=line.trim().split(/\s+/);
   const heading=!/[.!?]$/.test(line.trim()) && words.length>1 && words.length<=12 && words.every(w=>/^(?:[A-Z][\w-]*|\d+\.?|[&/—-]|of|the|to|and|for|in|or|with)$/.test(w));
   if(heading || /^\s*•/.test(line)){flush();add(cursor,cursor+line.length,heading);}
   else if(line.trim()){if(blockStart===null)blockStart=cursor;blockEnd=cursor+line.length;}
   cursor+=line.length+1;
  }
  flush();
 }
 let id=0;let parent='',heading='',lastGroup=null;return catalog.map(c=>{if(lastGroup!==c.groupId){parent='';heading='';lastGroup=c.groupId;}if(c.heading){heading=c.text;if(/^(?:Project|Chapter|Part|Section)\s+\d/i.test(heading))parent=heading;}return {...c,id:c.heading?null:++id,section:[parent,heading].filter(Boolean).join(' / ')};});
}
module.exports={evidenceCatalog};
