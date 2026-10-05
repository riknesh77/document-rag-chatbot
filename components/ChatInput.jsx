import {useState} from 'react';
import Icon from './Icon';
export default function ChatInput({onSend,loading,disabled=false}){
 const [value,setValue]=useState('');
 async function submit(e){e?.preventDefault();const q=value.trim();if(!q||loading||disabled)return;setValue('');const okay=await onSend(q);if(!okay)setValue(q);}
 return <div className="composer-area"><form className="chat-composer" onSubmit={submit}><label className="sr-only" htmlFor="chat-question">Ask a question</label><textarea id="chat-question" placeholder="Ask a question about this document..." rows={2} maxLength={1000} value={value} onChange={e=>setValue(e.target.value)} disabled={loading||disabled} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();submit();}}}/><div className="composer-bottom"><span className="composer-hint"><Icon name="shield" size={15}/>Document-grounded answers</span><button className="send-button" type="submit" disabled={loading||disabled||!value.trim()} aria-label="Send question">{loading?<span className="spinner"/>:<Icon name="send" size={19}/>}</button></div></form><p className="composer-note">Answers come from your document. Always verify important information.</p></div>;
}
