import Link from 'next/link';
import PageHeader from '../components/PageHeader';
import UploadZone from '../components/UploadZone';
import Icon from '../components/Icon';
export default function HomePage(){return <div className="upload-page"><PageHeader eyebrow="UPLOAD" title="Make room for your next discovery." description="Your PDFs hold the knowledge. Let’s make it a conversation." action={<Link className="button secondary" href="/documents">View library <Icon name="arrow" size={17}/></Link>}/><div className="upload-page-card"><UploadZone/></div><div className="upload-benefits"><div><Icon name="file"/><h3>Bring your document</h3><p>Text-based PDFs, up to 10 MB.</p></div><div><Icon name="spark"/><h3>Let local AI do the work</h3><p>Your document becomes searchable knowledge.</p></div><div><Icon name="chat"/><h3>Ask. Discover. Verify.</h3><p>Every supported answer links back to its source.</p></div></div></div>;}
