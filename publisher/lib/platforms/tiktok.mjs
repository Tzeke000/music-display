import { hasToken } from '../tokens.mjs';
import { NotConnectedError, NotWiredError } from './base.mjs';

export default {
  id: 'tiktok',
  label: 'TikTok',
  formats: ['9:16'],
  maxPerDay: 15,
  needs: 'video',

  // IMPORTANT: until the app passes TikTok's audit, posts can only be created
  // as private/draft (SELF_ONLY). Start the audit early.
  setupSteps: [
    'Create a TikTok developer app; add the Content Posting API.',
    'Request scopes: video.publish, video.upload (Direct Post needs audit approval).',
    'Put client key/secret in publisher/.env (TT_CLIENT_KEY, TT_CLIENT_SECRET).',
    'Run `connect tiktok` for OAuth. Note: unaudited apps post as private only.',
  ],

  connect() {
    return [
      'TikTok setup:',
      ...this.setupSteps.map((s, i) => `  ${i + 1}. ${s}`),
      '',
      '  Audit lead time is the long pole — begin it as soon as the app exists.',
    ].join('\n');
  },

  async publish(job) {
    if (!hasToken('tiktok')) throw new NotConnectedError('tiktok');
    // Wiring spec (laptop): POST /v2/post/publish/video/init/ -> upload -> status poll.
    throw new NotWiredError('tiktok', '  See /v2/post/publish/video/init/ flow in publish().');
  },
};
