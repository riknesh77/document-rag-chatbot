import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import useDocuments from '../hooks/useDocuments';
import useAuth from '../hooks/useAuth';
import PageHeader from '../components/PageHeader';
import { LoadingIndicator } from '../components/EmptyState';
export { protectPage as getServerSideProps } from '../lib/auth';
export default function Dashboard() {
  const { documents, error, refresh } = useDocuments();
  const { user } = useAuth();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState('');
  const requirements = documents?.flatMap(d => d.requirements) || [];
  async function create(event) {
    event.preventDefault(); if (pending) return;
    setPending(true); setFormError('');
    try {
      const values = Object.fromEntries(new FormData(event.currentTarget));
      const response = await fetch('/api/briefs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create', ...values }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      await router.push(`/brief/${data.documentId}`);
    } catch (err) { setFormError(err.message); } finally { setPending(false); }
  }
  return <div className="workspace-page"><PageHeader eyebrow="PROJECT CLARITY" title={`Your next deliverable starts here${user?.name && !user.isDemo ? ', ' + user.name.split(' ')[0] : ''}.`} description="Bring the brief. Find the commitments. Keep the proof." />{user?.isDemo && <div className="info-banner">You’re in your own demo workspace. The sample checklist is preloaded, not a live AI result. Create a new brief to try AI extraction. <Link href="/auth">Create a lasting account →</Link></div>}<div className="stats-grid"><div><small>PROJECT BRIEFS</small><strong>{documents?.length ?? '—'}</strong></div><div><small>REQUIREMENTS FOUND</small><strong>{documents ? requirements.length : '—'}</strong></div><div><small>COMPLETED</small><strong>{documents ? requirements.filter(r => r.done).length : '—'}</strong></div></div><div className="dashboard-grid"><section><div className="section-heading"><h2>Your briefs</h2><Link href="/documents">Upload a PDF →</Link></div>{error && <p className="alert error" role="alert">{error} <button onClick={refresh} className="text-button">Retry</button></p>}{!documents && !error && <LoadingIndicator text="Loading your briefs…" />}{documents?.length === 0 && <div className="empty-state"><h2>Give your project a clear starting point.</h2><p>Paste a brief beside this panel, or upload a PDF. Your private checklist will appear here.</p></div>}<div className="brief-list">{documents?.map(d => { const total = d.requirements.length, done = d.requirements.filter(r => r.done).length; return <Link className="brief-card" key={d.id} href={`/brief/${d.id}`}><span className="brief-card-kind">{d.filename.endsWith('.pdf') ? 'PDF BRIEF' : 'PROJECT BRIEF'}</span><h3>{d.title}</h3><p>{total ? `${done} of ${total} requirements complete` : 'Ready for AI review'}</p><div className="brief-progress"><span style={{ width: `${total ? done / total * 100 : 0}%` }} /></div><span className="brief-card-bottom">{new Date(d.createdAt).toLocaleDateString()} <b>Open brief →</b></span></Link>; })}</div></section><section className="create-brief"><p className="eyebrow">NEW PROJECT</p><h2>What does done look like?</h2><p className="muted">Paste a project brief, assignment rubric or client scope.</p><form onSubmit={create}><label>Project title<input name="title" placeholder="e.g. Campus Repair Hub" required maxLength={120} /></label><label>Project brief<textarea name="content" placeholder="Include the expected features, deliverables, constraints and success measures…" required minLength={50} maxLength={22000} rows={10} /></label><p className="microcopy">50–22,000 characters. Brief content is sent to Groq when you request AI extraction or source questions.</p>{formError && <p className="alert error" role="alert">{formError}</p>}<button className="button primary" disabled={pending}>{pending ? 'Saving brief…' : 'Save brief & review →'}</button></form></section></div></div>;
}
