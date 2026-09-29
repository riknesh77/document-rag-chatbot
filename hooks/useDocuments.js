import {useState,useEffect,useCallback} from 'react';
export default function useDocuments(){
 const [documents,setDocuments]=useState(null);const [error,setError]=useState('');
 const refresh=useCallback(async()=>{setError('');try{const r=await fetch('/api/documents');const data=await r.json();if(!r.ok)throw new Error(data.error||'Could not load documents.');setDocuments(data.documents);}catch(e){setError(e.message);}},[]);
 useEffect(()=>{refresh();},[refresh]);return {documents,error,refresh};
}
