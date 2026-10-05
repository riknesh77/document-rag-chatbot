import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import useAuth from '../hooks/useAuth';
export default function AuthPage() {
  const router = useRouter();
  const signup = router.query.mode !== 'login';
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const { setUser } = useAuth();
  async function submit(action, event) {
    event?.preventDefault(); if (pending) return;
    setPending(true); setError('');
    const values = event ? Object.fromEntries(new FormData(event.currentTarget)) : {};
    try {
      const response = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...values }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not open your workspace.');
      setUser(data.user); await router.push('/dashboard');
    } catch (err) { setError(err.message); } finally { setPending(false); }
  }
  return <div className="auth-layout"><section className="auth-story"><p className="eyebrow">A WORKSPACE WITH CONTEXT</p><h1>Less “did we miss that?”<br />More “here’s the proof.”</h1><p>Keep project commitments, original evidence and delivery progress together.</p><blockquote>One brief. A clear checklist. A team that knows what done means.</blockquote></section><section className="auth-card"><p className="eyebrow">{signup ? 'GET STARTED' : 'WELCOME BACK'}</p><h2>{signup ? 'Create your workspace' : 'Sign in to BriefProof'}</h2><p className="muted">{signup ? 'Your briefs and progress stay in your account.' : 'Pick up where your project left off.'}</p><form onSubmit={event => submit(signup ? 'signup' : 'login', event)}>{signup && <label>Your name<input name="name" autoComplete="name" required maxLength={80} /></label>}<label>Email address<input type="email" name="email" autoComplete="email" required maxLength={254} /></label><label>Password<input type="password" name="password" autoComplete={signup ? 'new-password' : 'current-password'} required minLength={10} maxLength={128} /></label><p className="microcopy">Use 10–128 characters. Email verification and password recovery are not yet available.</p>{error && <p className="alert error" role="alert">{error}</p>}<button className="button primary" disabled={pending}>{pending ? 'Opening workspace…' : signup ? 'Create account' : 'Sign in'}</button></form><p className="auth-switch">{signup ? 'Already have an account?' : 'New to BriefProof?'} <Link href={signup ? '/auth?mode=login' : '/auth'}>{signup ? 'Sign in' : 'Create an account'}</Link></p><div className="demo-divider"><span>Or take a look around</span></div><button onClick={() => submit('demo')} disabled={pending} className="button secondary">Open a private demo</button><p className="microcopy">An isolated sample project with a preloaded checklist. Demo access lasts 24 hours in this browser; no credentials needed.</p></section></div>;
}
