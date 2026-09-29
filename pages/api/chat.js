import { answerQuestion } from '../../lib/rag';
import { getDb } from '../../lib/db';
export const config = { runtime: 'nodejs', maxDuration: 300, api: { bodyParser: { sizeLimit: '16kb' } } };
export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Use POST.'});}
  const {documentId,question}=req.body || {};
  if(!Number.isSafeInteger(documentId)||documentId<1||typeof question!=='string'||!question.trim()||question.length>1000) return res.status(400).json({error:'Provide a document ID and a question of 1–1000 characters.'});
  try {
    const document=await getDb().document.findUnique({where:{id:documentId},select:{id:true}});
    if(!document)return res.status(404).json({error:'Document not found.'});
    return res.status(200).json(await answerQuestion(documentId,question.trim()));
  } catch {return res.status(503).json({error:'Could not answer. Check database access and inference provider availability, then retry.'});}
}
