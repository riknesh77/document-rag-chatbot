import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Icon, { BrandMark } from './Icon';
import useAuth from '../hooks/useAuth';
export default function AppShell({ children }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const { user, setUser } = useAuth();
  const publicPage = ['/', '/auth', '/404', '/_error'].includes(router.pathname);
  async function signOut() {
    setError('');
    try {
      const response = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'logout' }) });
      if (!response.ok) throw new Error('Could not sign out. Please retry.');
      setUser(null); await router.push('/');
    } catch (err) { setError(err.message); }
  }
  if (publicPage) return <><header className="public-nav"><Link href="/" className="wordmark"><BrandMark small /><strong>BriefProof<span>by DocuRAG</span></strong></Link><nav aria-label="Main navigation"><Link href="/auth?mode=login">Sign in</Link><Link href={user ? '/dashboard' : '/auth'} className="button primary">{user ? 'Open workspace' : 'Get started'} <Icon name="arrow" size={16} /></Link></nav></header><main>{children}</main><footer className="public-footer">BriefProof · Scope clarity, backed by evidence. <span>Built for project teams and capstone builders.</span></footer></>;
  const nav = [['/dashboard', 'Overview', 'library'], ['/documents', 'PDF library', 'file'], ['/chat', 'Source questions', 'chat']];
  return <div className="app-shell"><button className={`sidebar-scrim ${open ? 'visible' : ''}`} aria-label="Close navigation" onClick={() => setOpen(false)} /><aside className={`sidebar ${open ? 'open' : ''}`}><Link href="/dashboard" className="brand" onClick={() => setOpen(false)}><BrandMark /><span><strong>BriefProof</strong><span className="brand-description">Know the scope.<br />Prove the delivery.</span></span></Link><nav aria-label="Workspace navigation">{nav.map(([href, label, icon]) => <Link key={href} href={href} className={`nav-item ${router.pathname === href ? 'active' : ''}`} aria-current={router.pathname === href ? 'page' : undefined} onClick={() => setOpen(false)}><Icon name={icon} />{label}</Link>)}</nav><div className="sidebar-bottom"><div className="sidebar-art" aria-hidden="true" /><p className="sidebar-quote">Every requirement has a source.<br />Every deliverable has a home.</p><div className="profile"><span className="profile-avatar">{user?.name?.[0] || 'B'}</span><span><strong>{user?.name || 'Your workspace'}</strong><small>{user?.isDemo ? 'Private demo · 24-hour session' : 'Private workspace'}</small></span></div><button className="button secondary signout" onClick={signOut}>Sign out</button>{error && <p role="alert" className="alert error">{error}</p>}</div></aside><div className="app-main"><header className="topbar"><button className="icon-button menu-toggle" onClick={() => setOpen(!open)} aria-label="Toggle navigation" aria-expanded={open}><Icon name="menu" /></button><div className="topbar-breadcrumb">Workspace <span>/</span><strong>{router.pathname.startsWith('/brief/') ? 'Brief review' : 'Project clarity'}</strong></div><span className="local-badge"><Icon name="shield" size={12} /> Source-backed AI</span></header><main>{children}</main></div></div>;
}
