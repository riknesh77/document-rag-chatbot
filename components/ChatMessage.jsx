import {BrandMark} from './Icon';
import ChunkSourceList from './ChunkSourceList';
export default function ChatMessage({sender,message,sources=[],time}){const user=sender==='You';return <div className={`message-row ${user?'user':'assistant'}`}>{!user&&<BrandMark small/>}<div className="message-content"><div className="message-bubble"><p>{message}</p>{!user&&<ChunkSourceList sources={sources}/>}</div>{time&&<time className="message-time" dateTime={new Date(time).toISOString()}>{new Date(time).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</time>}</div></div>;}
