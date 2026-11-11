import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeMessages, chatTime } from '../src/app/lib/chatMessages.ts';
const message = (id: number, readAt: string | null = null) => ({id,conversationId:1,senderId:'sender',content:`message ${id}`,createdAt:'2026-11-10T12:00:00Z',readAt,clientMessageId:`key-${id}`});
test('REST and SignalR delivery plus retries render each server message once and in order', () => {
  const rows = mergeMessages([message(2),message(1)], [message(2),message(3),message(1)]);
  assert.deepEqual(rows.map(m => m.id), [1,2,3]);
});
test('late REST response and duplicate delivery cannot undo a read receipt', () => {
  const readAt='2026-11-10T12:01:00Z';
  const rows=mergeMessages([message(1,readAt)], [message(1)]);
  assert.equal(rows[0].readAt,readAt);
  assert.equal(mergeMessages([message(1)], [message(1,readAt)])[0].readAt,readAt);
});
test('chat timestamps accept SQL UTC, explicit UTC, offsets and legacy null values', () => {
  assert.equal(chatTime(null),'');
  assert.equal(chatTime('2026-11-10T12:00:00'),chatTime('2026-11-10T12:00:00Z'));
  assert.equal(chatTime('2026-11-10T12:00:00Z'),chatTime('2026-11-10T19:00:00+07:00'));
});
