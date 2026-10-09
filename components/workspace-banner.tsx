import type {CSSProperties,ReactNode} from 'react';
import type {LucideIcon} from 'lucide-react';
type Props={title:string;kicker:string;description:string;icon:LucideIcon;actions?:ReactNode;variant?:string;meta?:string};
const colors:Record<string,string>={summary:'#185881',services:'#1c6075',quotations:'#46518a',certificates:'#1c6885',performance:'#225a75',instructors:'#28686a',support:'#35566f',history:'#455982',trash:'#52617b',users:'#205879'};
export default function WorkspaceBanner({title,kicker,description,icon:Icon,actions,variant='summary',meta}:Props){
 return <section className="workspace-banner overview-banner" data-workspace={variant} aria-label={`Presentación de ${variant==='users'?'Usuarios':'la herramienta'}`} style={{'--banner-end':colors[variant]||colors.summary} as CSSProperties}><div className="workspace-banner-copy"><span className="overview-kicker">{kicker}</span><h2>{title}</h2><p>{description}</p>{actions&&<div className="overview-actions">{actions}</div>}{meta&&<span className="workspace-banner-meta">{meta}</span>}</div><div className="overview-mark" aria-hidden="true"><Icon size={58} strokeWidth={1.65}/><span>CONSITEC</span></div></section>;
}
