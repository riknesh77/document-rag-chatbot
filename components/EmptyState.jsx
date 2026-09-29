import Icon,{BrandMark} from './Icon';
export function LoadingIndicator({text='Loading...'}){return <div className="loading-indicator" role="status"><span className="spinner"/>{text}</div>;}
export default function EmptyState({title,description,icon='file'}){return <div className="empty-state"><span className="empty-icon"><Icon name={icon} size={28}/></span><h2>{title}</h2><p>{description}</p></div>;}
