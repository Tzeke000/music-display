#!/usr/bin/env node
/**
 * Publisher CLI — drafts, approval queue, and (on the laptop) posting.
 *
 *   npm run pub -- <command> [args]
 *
 * Commands:
 *   platforms                 List platforms and their formats.
 *   draft --platform <p> ...  Create a draft (starts as "pending").
 *   queue [--status <s>]      List jobs.
 *   show <id>                 Show one job.
 *   approve <id>              Approve a pending/failed job.
 *   reject <id>               Reject a job.
 *   publish [--id <id>] [--due] [--dry]   Publish approved jobs.
 *   campaign <file> [--apply] Expand a release file into draft jobs.
 *   connect <platform>        Print account setup / OAuth steps.
 *   status                    Summary counts.
 */
import * as jobs from './lib/jobs.mjs';
import * as store from './lib/store.mjs';
import * as campaign from './lib/campaign.mjs';
import { PLATFORMS, getPlatform } from './lib/platforms/index.mjs';
import { NotConnectedError, NotWiredError } from './lib/platforms/base.mjs';

const BOOL = new Set(['due', 'dry', 'apply']);

function parse(argv) {
  const flags = {};
  const pos = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      if (BOOL.has(key)) flags[key] = true;
      else flags[key] = argv[++i];
    } else pos.push(a);
  }
  return { pos, flags };
}

function fmtJob(j) {
  const when = j.scheduledAt ? new Date(j.scheduledAt).toISOString().replace('T', ' ').slice(0, 16) : 'asap';
  const media = j.video || j.image || '—';
  return `  ${j.id}  [${j.status.padEnd(9)}] ${j.platform.padEnd(9)} ${j.type.padEnd(7)} @${when}  ${media}\n            "${j.caption}"${j.error ? `\n            ! ${j.error.split('\n')[0]}` : ''}`;
}

const commands = {
  platforms() {
    for (const p of Object.values(PLATFORMS)) {
      console.log(`  ${p.id.padEnd(10)} ${p.label.padEnd(16)} formats: ${p.formats.join(', ')}  max/day: ${p.maxPerDay}`);
    }
  },

  draft(_, flags) {
    if (!flags.platform) return fail('draft requires --platform');
    getPlatform(flags.platform); // validate
    const job = jobs.createDraft({
      platform: flags.platform,
      type: flags.type || 'post',
      video: flags.video || null,
      image: flags.image || null,
      caption: flags.caption || '',
      hashtags: flags.hashtags ? flags.hashtags.split(',').map((s) => s.trim()) : [],
      scheduledAt: flags.at || null,
    });
    console.log(`Created draft ${job.id} (pending approval).`);
    console.log(fmtJob(job));
  },

  queue(_, flags) {
    let list = store.all();
    if (flags.status) list = list.filter((j) => j.status === flags.status);
    if (!list.length) return console.log('  (no jobs)');
    list.sort((a, b) => new Date(a.scheduledAt || a.createdAt) - new Date(b.scheduledAt || b.createdAt));
    list.forEach((j) => console.log(fmtJob(j)));
  },

  show([id]) {
    const j = store.get(id);
    if (!j) return fail(`No job matching "${id}"`);
    console.log(JSON.stringify(j, null, 2));
  },

  approve([id]) {
    if (!id) return fail('approve requires a job id');
    const j = jobs.approve(id);
    console.log(`Approved ${j.id}.`);
  },

  reject([id]) {
    if (!id) return fail('reject requires a job id');
    const j = jobs.reject(id);
    console.log(`Rejected ${j.id}.`);
  },

  async publish(_, flags) {
    let targets;
    if (flags.id) {
      const j = store.get(flags.id);
      if (!j) return fail(`No job matching "${flags.id}"`);
      if (j.status !== 'approved') return fail(`Job ${j.id} is "${j.status}", not approved.`);
      targets = [j];
    } else {
      targets = jobs.due();
    }
    if (!targets.length) return console.log('  Nothing approved & due to publish.');

    for (const job of targets) {
      const platform = getPlatform(job.platform);
      if (flags.dry) {
        console.log(`  [dry] would publish ${job.id} -> ${platform.label}: "${job.caption}"`);
        continue;
      }
      try {
        const res = await platform.publish(job);
        jobs.markPublished(job.id, res);
        console.log(`  ✓ ${job.id} published to ${platform.label}: ${res.publishedUrl}`);
      } catch (err) {
        if (err instanceof NotConnectedError || err instanceof NotWiredError) {
          console.log(`  … ${job.id} held (${platform.label}): ${err.message.split('\n')[0]}`);
        } else {
          jobs.markFailed(job.id, err);
          console.log(`  ✗ ${job.id} failed: ${err.message}`);
        }
      }
    }
  },

  campaign([file], flags) {
    if (!file) return fail('campaign requires a release file path');
    const release = campaign.loadRelease(file);
    const drafts = campaign.expand(release);
    console.log(`Release "${release.song}" — drop ${release.dropAt}  (${drafts.length} posts)`);
    for (const d of drafts) {
      const when = new Date(d.scheduledAt).toISOString().replace('T', ' ').slice(0, 16);
      console.log(`  ${d.type.padEnd(7)} ${d.platform.padEnd(10)} @${when}  "${d.caption}"`);
    }
    if (flags.apply) {
      drafts.forEach((d) => jobs.createDraft(d));
      console.log(`\nCreated ${drafts.length} draft jobs (pending approval). Review with: queue`);
    } else {
      console.log('\n(plan only — re-run with --apply to create the draft jobs)');
    }
  },

  connect([id]) {
    if (!id) return fail('connect requires a platform');
    console.log(getPlatform(id).connect());
  },

  status() {
    const counts = {};
    for (const j of store.all()) counts[j.status] = (counts[j.status] || 0) + 1;
    const order = ['pending', 'approved', 'published', 'failed', 'rejected'];
    console.log('  ' + order.map((s) => `${s}: ${counts[s] || 0}`).join('   '));
  },
};

function fail(msg) {
  console.error(`Error: ${msg}`);
  process.exitCode = 1;
}

function help() {
  console.log(
    [
      'Publisher — usage: npm run pub -- <command> [args]',
      '',
      '  platforms                              list platforms',
      '  draft --platform <p> [--type t] [--video f] [--image f] [--caption "..."] [--hashtags a,b] [--at ISO]',
      '  queue [--status pending|approved|published|failed|rejected]',
      '  show <id>',
      '  approve <id>',
      '  reject <id>',
      '  publish [--id <id>] [--due] [--dry]',
      '  campaign <release.json> [--apply]',
      '  connect <youtube|x|instagram|tiktok>',
      '  status',
    ].join('\n'),
  );
}

const { pos, flags } = parse(process.argv.slice(2));
const cmd = pos.shift();
if (!cmd || cmd === 'help') {
  help();
} else if (commands[cmd]) {
  await commands[cmd](pos, flags);
} else {
  fail(`Unknown command "${cmd}"`);
  help();
}
