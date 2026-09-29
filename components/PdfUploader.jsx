import {useRef,useState,useId} from 'react';
import Icon from './Icon';
export default function PdfUploader({onUpload,disabled=false}){
 const input=useRef(null);const [drag,setDrag]=useState(false);const id=useId();
 const choose=files=>{if(!disabled&&files?.[0])onUpload(files[0]);};
 return <div className={`upload-dropzone ${drag?'dragging':''} ${disabled?'disabled':''}`} onDragOver={e=>{e.preventDefault();if(!disabled)setDrag(true);}} onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget))setDrag(false);}} onDrop={e=>{e.preventDefault();setDrag(false);choose(e.dataTransfer.files);}}><span className="upload-cloud"><Icon name="upload" size={44}/></span><h2>Drop your PDF here</h2><p>or click to browse files</p><span className="upload-support">Supports PDF files up to 4 MB</span><input ref={input} id={id} className="sr-only" tabIndex={-1} type="file" accept="application/pdf,.pdf" aria-label="Upload a PDF" onChange={e=>{choose(e.target.files);e.target.value='';}} disabled={disabled}/><button type="button" className="button primary" onClick={()=>input.current?.click()} disabled={disabled}><Icon name="plus" size={16}/>Browse Files</button></div>;
}
