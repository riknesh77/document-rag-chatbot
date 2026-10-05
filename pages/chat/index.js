import useDocuments from '../../hooks/useDocuments';
import PageHeader from '../../components/PageHeader';
import DocumentCard from '../../components/DocumentCard';
import EmptyState,{LoadingIndicator} from '../../components/EmptyState';
import Link from 'next/link';
export default function ChatIndex(){const {documents,error}=useDocuments();return <div className="chat-select-page"><PageHeader eyebrow="CHAT" title="Where would you like to begin?" description="Choose a document to start a grounded conversation."/>{error&&<p className="alert error" role="alert">{error}</p>}{!documents&&!error&&<LoadingIndicator text="Loading documents..."/>}<div className="document-list">{documents?.map(d=><DocumentCard key={d.id} document={d}/>)}{documents?.length===0&&<><EmptyState title="Your next answer starts with a PDF." description="Upload a document to start chatting." icon="chat"/><Link href="/documents" className="button primary">Upload PDF</Link></>}</div></div>;}

export { protectPage as getServerSideProps } from '../../lib/auth';
