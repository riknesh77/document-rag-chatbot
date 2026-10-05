import Head from 'next/head';
import AppShell from '../components/AppShell';
import '../styles/globals.css';
import { AuthProvider } from '../hooks/useAuth';
export default function App({Component,pageProps}){return <AuthProvider><Head><title>BriefProof — Deliver what the brief actually asks for</title><meta name="description" content="Turn project briefs into source-backed checklists. Track deliverables and verify every requirement against its original source."/><meta name="viewport" content="width=device-width, initial-scale=1"/><meta name="theme-color" content="#0b0b13"/></Head><AppShell><Component {...pageProps}/></AppShell></AuthProvider>;}
