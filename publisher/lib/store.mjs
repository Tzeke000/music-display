/**
 * Tiny JSON-backed job store. Lives in publisher/.data/ (gitignored) because
 * it is local runtime state that references local video files. Swap for SQLite
 * later if volume grows.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = join(ROOT, '.data');
const JOBS_FILE = join(DATA_DIR, 'jobs.json');

function read() {
  if (!existsSync(JOBS_FILE)) return { jobs: [] };
  try {
    return JSON.parse(readFileSync(JOBS_FILE, 'utf8'));
  } catch {
    return { jobs: [] };
  }
}

function write(state) {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(JOBS_FILE, JSON.stringify(state, null, 2));
}

export function all() {
  return read().jobs;
}

export function get(id) {
  return read().jobs.find((j) => j.id === id || j.id.startsWith(id)) || null;
}

export function add(job) {
  const state = read();
  state.jobs.push(job);
  write(state);
  return job;
}

export function update(id, patch) {
  const state = read();
  const job = state.jobs.find((j) => j.id === id || j.id.startsWith(id));
  if (!job) return null;
  Object.assign(job, patch, { updatedAt: new Date().toISOString() });
  write(state);
  return job;
}
