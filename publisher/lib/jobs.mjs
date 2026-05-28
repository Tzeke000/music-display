/**
 * Job lifecycle. Because the chosen policy is "approve every post", a fresh
 * draft starts as `pending` and must be approved before it can publish.
 *
 *   pending ──approve──▶ approved ──publish──▶ published
 *      │                     │                     ▲
 *      └──reject──▶ rejected └──(publish error)──▶ failed ──retry──▶ approved
 */
import { randomUUID } from 'node:crypto';
import * as store from './store.mjs';

export const STATUSES = ['pending', 'approved', 'published', 'failed', 'rejected'];

export function createDraft({ platform, type = 'post', video = null, image = null, caption = '', hashtags = [], scheduledAt = null, meta = {} }) {
  if (!platform) throw new Error('createDraft: platform is required');
  const now = new Date().toISOString();
  return store.add({
    id: randomUUID().slice(0, 8),
    platform,
    type, // teaser | release | clip | post
    video,
    image,
    caption,
    hashtags,
    scheduledAt, // ISO string or null (= as soon as approved)
    status: 'pending',
    publishedId: null,
    publishedUrl: null,
    error: null,
    meta,
    createdAt: now,
    updatedAt: now,
  });
}

export function approve(id) {
  const job = store.get(id);
  if (!job) throw new Error(`No job matching "${id}"`);
  if (!['pending', 'failed'].includes(job.status)) {
    throw new Error(`Job ${job.id} is "${job.status}", cannot approve`);
  }
  return store.update(job.id, { status: 'approved', error: null });
}

export function reject(id) {
  const job = store.get(id);
  if (!job) throw new Error(`No job matching "${id}"`);
  return store.update(job.id, { status: 'rejected' });
}

/** Approved jobs whose scheduled time has arrived (or that have no schedule). */
export function due(now = Date.now()) {
  return store.all().filter(
    (j) => j.status === 'approved' && (!j.scheduledAt || new Date(j.scheduledAt).getTime() <= now),
  );
}

export function markPublished(id, { publishedId, publishedUrl }) {
  return store.update(id, { status: 'published', publishedId, publishedUrl, error: null });
}

export function markFailed(id, error) {
  return store.update(id, { status: 'failed', error: String(error?.message || error) });
}
