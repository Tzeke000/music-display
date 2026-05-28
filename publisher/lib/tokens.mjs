/**
 * Credential storage abstraction.
 *
 * SECURITY: tokens live in publisher/.secrets/ (gitignored) and never in the
 * repo or in chat. This file is the single seam to upgrade later to the OS
 * keychain (e.g. `keytar`) or an age-encrypted file — callers only use
 * get/set/has, so the backing store can change without touching connectors.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SECRETS_DIR = join(ROOT, '.secrets');
const TOKENS_FILE = join(SECRETS_DIR, 'tokens.json');

function read() {
  if (!existsSync(TOKENS_FILE)) return {};
  try {
    return JSON.parse(readFileSync(TOKENS_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function write(data) {
  if (!existsSync(SECRETS_DIR)) mkdirSync(SECRETS_DIR, { recursive: true });
  writeFileSync(TOKENS_FILE, JSON.stringify(data, null, 2));
  try {
    chmodSync(TOKENS_FILE, 0o600);
  } catch {
    /* best-effort on platforms without POSIX perms */
  }
}

export function hasToken(platform) {
  return Boolean(read()[platform]);
}

export function getToken(platform) {
  return read()[platform] || null;
}

export function setToken(platform, data) {
  const all = read();
  all[platform] = data;
  write(all);
}
