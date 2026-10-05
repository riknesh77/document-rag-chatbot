export default function Icon({name,size=20,...props}) {
 const paths={
  spark:<path d="M12 2c1.4 6.2 3.8 8.6 10 10-6.2 1.4-8.6 3.8-10 10C10.6 15.8 8.2 13.4 2 12c6.2-1.4 8.6-3.8 10-10Z"/>,
  library:<><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/></>,
  upload:<><path d="M7 16H6a4 4 0 0 1-1-7.9 7 7 0 0 1 13.5-1.4A4.7 4.7 0 0 1 19 16h-2M12 21V11m-4 4 4-4 4 4"/></>,
  chat:<path d="M21 11a8 8 0 0 1-8 8H7l-5 3 1.5-6A8 8 0 1 1 21 11ZM8 10h8m-8 4h5"/>,
  file:<><path d="M14 2H5v20h14V7ZM14 2v6h5M8 13h8m-8 4h5"/></>,
  layers:<><path d="m12 3 10 5-10 5L2 8Zm-9 10 9 5 9-5M3 18l9 5 9-5"/></>,
  clock:<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  search:<><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
  plus:<path d="M12 5v14M5 12h14"/>,
  arrow:<path d="M4 12h16m-6-6 6 6-6 6"/>,
  send:<path d="m3 3 19 9-19 9 4-9Zm4 9h15"/>,
  chevron:<path d="m6 9 6 6 6-6"/>,
  check:<path d="m5 12 4 4L19 6"/>,
  shield:<path d="m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6Zm-4 10 3 3 5-6"/>,
  menu:<path d="M4 6h16M4 12h16M4 18h16"/>,
  close:<path d="m6 6 12 12M6 18 18 6"/>,
  more:<><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
 };
 return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]||paths.file}</svg>;
}
export function BrandMark({small=false}){return <span className={`brand-mark ${small?'small':''}`}><Icon name="spark" size={small?20:28}/></span>;}
export function PdfIcon(){return <span className="pdf-icon"><Icon name="file" size={29}/><span>PDF</span></span>;}
