// API time-of-day fields use .NET TimeSpan's HH:mm:ss representation.
export function toTourApiTime(value: string | null | undefined, context: string): string | null {
  const text=value?.trim();
  if(!text)return null;
  const input=text.replace(/\s*([:hH])\s*/g,"$1");
  const match=input.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/)
    ?? input.match(/^(\d{1,2})[hH](\d{1,2})?$/)
    ?? input.match(/^(\d{1,2})$/);
  if(match) {
    const hours=Number(match[1]),minutes=Number(match[2]??0),seconds=Number(match[3]??0);
    if(hours<=23 && minutes<=59 && seconds<=59)
      return [hours,minutes,seconds].map(part=>String(part).padStart(2,"0")).join(":");
  }
  throw new Error(`${context}: giờ "${text}" không hợp lệ. Nhập giờ từ 00:00 đến 23:59 (ví dụ 09:00 hoặc 9h30).`);
}
