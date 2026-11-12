import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
export function AgencyLogo({name,logo,className="h-7 w-7"}:{name?:string;logo?:string|null;className?:string}) {
 const label=name||"Agency";
 return <Avatar title={label} aria-label={label} className={`${className} inline-flex border border-slate-200 bg-white align-middle`}>
   {logo&&<AvatarImage src={logo} alt={label} className="object-contain p-0.5"/>}
   <AvatarFallback className="bg-sky-50 text-[10px] font-semibold text-sky-800">{label.split(/\s+/).filter(Boolean).slice(0,2).map(s=>s[0]).join("").toUpperCase()}</AvatarFallback>
 </Avatar>;
}
