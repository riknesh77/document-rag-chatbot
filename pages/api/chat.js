import { answerQuestion } from '../../lib/rag';
import { getDb } from '../../lib/db';
import { requireUser, checkOrigin, rateLimit, apiError, HttpError } from '../../lib/auth';
export const config = { runtime: 'nodejs', maxDuration: 300, api: { bodyParser: { sizeLimit: '16kb' } } };
export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Use POST.'});}
  const {documentId,question}=req.body || {};
  if(!Number.isSafeInteger(documentId)||documentId<1||typeof question!=='string'||!question.trim()||question.length>1000) return res.status(400).json({error:'Provide a document ID and a question of 1–1000 characters.'});
  try {
    checkOrigin(req);
    const user = await requireUser(req);
    const document=await getDb().document.findFirst({where:{id:documentId,ownerId:user.id},select:{id:true}});
    if(!document)return res.status(404).json({error:'Document not found.'});
    await rateLimit(req, `chat-${user.id}`, 20);
    if (!await getDb().chunk.count({where:{documentId}})) throw new HttpError(409, 'Enable source questions from the brief workspace first.');
    const result = await answerQuestion(documentId,question.trim());
    await getDb().answer.create({data:{documentId,question:question.trim(),result}});
    return res.status(200).json(result);
  } catch (error) {return apiError(res, error);}
}
