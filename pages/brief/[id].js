import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import PageHeader from '../../components/PageHeader';
import ChatPanel from '../../components/ChatPanel';
import { LoadingIndicator } from '../../components/EmptyState';
export { protectPage as getServerSideProps } from '../../lib/auth';
export default function BriefPage() {
  const router = useRouter();
  const id = Number(router.query.id);
  const [document, setDocument] = useState(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState('');
  const [success, setSuccess] = useState('');
  const [chat, setChat] = useState(false);
  async function load(signal) {
    const response = await fetch(`/api/briefs?id=${id}`, { signal }); const data = await response.json();
    if (!response.ok) throw new Error(data.error); setDocument(data.document);
  }
  useEffect(() => {
    if (!Number.isSafeInteger(id) || id < 1) return;
    const controller = new AbortController();
    load(controller.signal).catch(err => { if (err.name !== 'AbortError') setError(err.message); });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  async function mutate(action, item) {
    if (pending) return;
    setPending(item?.id || action); setError(''); setSuccess('');
    try {
      const response = await fetch('/api/briefs', { method: item ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, documentId: id, ...(item && { requirementId: item.id, done: !item.done }) }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      await load();
      if (action === 'index') setChat(true);
      setSuccess(item ? 'Progress saved.' : action === 'extract' ? `${data.count} source-backed requirements saved. Review the AI labels against the quotes.` : 'Source questions are ready.');
    } catch (err) { setError(err.message); } finally { setPending(''); }
  }
  function exportChecklist() {
    const text = `# ${document.title}\n\n` + document.requirements.map(r => `- [${r.done ? 'x' : ' '}] ${r.title} (${r.category})\n  Source: ${r.quote}`).join('\n\n');
    const url = URL.createObjectURL(new Blob([text], { type: 'text/markdown' }));
    const link = window.document.createElement('a'); link.href = url; link.download = 'briefproof-checklist.md'; link.click(); URL.revokeObjectURL(url);
  }
  if (!document) return <div className="workspace-page">{error ? <div className="alert error" role="alert">{error} <Link href="/dashboard">Return to overview</Link></div> : <LoadingIndicator text="Opening your brief…" />}</div>;
  const done = document.requirements.filter(r => r.done).length;
  return <div className="workspace-page"><Link className="back-link" href="/dashboard">← All briefs</Link><PageHeader eyebrow="BRIEF REVIEW" title={document.title} description="Original evidence beside every commitment. Progress saved to your workspace." /><div className="brief-actions"><button className="button primary" disabled={!!pending || !!document.requirements.length} onClick={() => mutate('extract')}>{pending === 'extract' ? 'AI is reading your brief…' : document.requirements.length ? 'Checklist generated' : 'Generate AI checklist'}</button><button className="button secondary" disabled={!!pending} onClick={() => mutate('index')}>{pending === 'index' ? 'Preparing source questions…' : 'Ask source questions'}</button><button className="button secondary" onClick={exportChecklist} disabled={!document.requirements.length}>Export checklist</button></div>{error && <p className="alert error" role="alert">{error}</p>}{success && <p className="info-banner" role="status">{success}</p>}<div className="review-grid"><section><div className="section-heading"><h2>Commitments to deliver</h2><span>{done}/{document.requirements.length} complete</span></div><p className="microcopy">AI titles are interpretations. Exact source quotes are verified against the brief; review them before acting.</p>{!document.requirements.length && <div className="empty-state"><h2>The brief is saved. Let’s clarify the scope.</h2><p>Generate a checklist to find explicit features, constraints, deliverables and success metrics. Nothing is marked complete automatically.</p></div>}<div className="requirements-list">{document.requirements.map(r => <article key={r.id} className={`requirement-card ${r.done ? 'done' : ''}`}><label className="requirement-title"><input type="checkbox" checked={r.done} disabled={!!pending} onChange={() => mutate('toggle', r)} /><strong>{r.title}</strong></label><span className="category-tag">{r.category}</span><details><summary>View original evidence</summary><blockquote>{r.quote}</blockquote></details></article>)}</div></section><aside><details className="original-brief" open><summary>Original brief</summary><p>{document.content}</p></details><p className="microcopy">A checklist can miss requirements. The original brief remains the source of truth.</p></aside></div>{chat && <div className="brief-chat"><ChatPanel key={id} document={document} initialMessages={document.answers.map(a => ({ question: a.question, questionTime: new Date(a.createdAt).getTime(), ...a.result, time: new Date(a.createdAt).getTime() }))} /></div>}</div>;
}
