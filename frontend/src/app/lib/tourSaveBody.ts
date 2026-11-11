import type { Tour } from "@/app/types";

export function tourSaveBody<T>(payload:T, tour:Partial<Tour>): string | FormData {
  const files=tour.pendingTourImages || [];
  const images=(payload as {configuration?:{images?:string[]};images?:string[]}).configuration?.images
    ?? (payload as {images?:string[]}).images ?? [];
  const local=images.filter(url=>url.startsWith("blob:") || url.startsWith("data:"));
  if(!local.length)return JSON.stringify(payload);
  const form=new FormData();
  const replacements=new Map<string,string>();
  local.forEach((url,index)=>{
    const file=files.find(entry=>entry.url===url)?.file;
    if(!file)throw new Error("Ảnh xem trước không còn hợp lệ. Vui lòng chọn lại ảnh.");
    replacements.set(url,`upload:${index}`);form.append("images",file);
  });
  form.append("payload",JSON.stringify(payload,(_key,value)=>typeof value==="string" ? replacements.get(value) ?? value : value));
  return form;
}
