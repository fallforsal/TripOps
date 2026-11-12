export type TimelineEntry = { key: string; minutes: number };

// Manual order belongs to the editor. Moving a card never changes its scheduled time.
export function orderTimeline<T extends TimelineEntry>(entries: T[], manual?: string[]): T[] {
  const chronological = [...entries].sort((a,b)=>a.minutes-b.minutes);
  if (!manual) return chronological;
  const byKey = new Map(entries.map(entry=>[entry.key,entry]));
  const ordered = manual.flatMap(key=>byKey.has(key) ? [byKey.get(key)!] : []);
  const existing = new Set(manual);
  return [...ordered,...chronological.filter(entry=>!existing.has(entry.key))];
}
export function moveTimeline(entries: TimelineEntry[], from: number, to: number): string[] {
  const keys=entries.map(entry=>entry.key);
  if(from<0 || from>=keys.length || to<0 || to>=keys.length)return keys;
  const [moved]=keys.splice(from,1);keys.splice(to,0,moved);return keys;
}

export function appendTimeline(entries: TimelineEntry[], manual: string[] | undefined, key: string): string[] {
  return [...orderTimeline(entries, manual).map(entry => entry.key).filter(existing => existing !== key), key];
}
