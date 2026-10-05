import {getDb, logDbError} from '../../lib/db';
import {requireUser, apiError, HttpError} from '../../lib/auth';
export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Use GET.'});}
  try {
    const user = await requireUser(req);
    const documents=await getDb().document.findMany({where:{ownerId:user.id},orderBy:{createdAt:'desc'},take:100,select:{id:true,title:true,filename:true,pageCount:true,createdAt:true,requirements:{select:{id:true,done:true}},_count:{select:{chunks:true}}}});
    return res.status(200).json({documents});
  } catch (err) {
    if (!(err instanceof HttpError)) logDbError('listDocuments', err);
    return apiError(res, err);
  }
}
