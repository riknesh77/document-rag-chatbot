import {getDb} from '../../lib/db';
export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Use GET.'});}
  try {
    const documents=await getDb().document.findMany({orderBy:{createdAt:'desc'},take:100,select:{id:true,title:true,filename:true,pageCount:true,createdAt:true,_count:{select:{chunks:true}}}});
    return res.status(200).json({documents});
  } catch {return res.status(503).json({error:'Could not load documents. Check database access.'});}
}
