import {useRouter} from 'next/router';
import Link from 'next/link';
import useDocuments from '../../hooks/useDocuments';
import ChatPanel from '../../components/ChatPanel';
import Icon from '../../components/Icon';
export default function ChatDocPage(){const router=useRouter();const id=Number(router.query.docId);const {documents}=useDocuments();const document=documents?.find(d=>d.id===id);return <div className="chat-page"><div className="chat-page-heading"><div><p className="eyebrow">DOCUMENT CHAT</p><h1>Knowledge, one question away.</h1></div><Link className="button secondary compact" href="/documents"><Icon name="library" size={16}/>Library</Link></div>{router.isReady&&<ChatPanel key={id} document={document} documentId={id}/>}</div>;}

export { protectPage as getServerSideProps } from '../../lib/auth';
