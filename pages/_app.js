import Head from 'next/head';
import AppShell from '../components/AppShell';
import '../styles/globals.css';
export default function App({Component,pageProps}){return <><Head><title>DocuRAG — Your documents, smarter answers</title><meta name="viewport" content="width=device-width, initial-scale=1"/><meta name="theme-color" content="#0b0b13"/></Head><AppShell><Component {...pageProps}/></AppShell></>;}
