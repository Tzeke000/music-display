import { hasToken } from '../tokens.mjs';
import { NotConnectedError, NotWiredError } from './base.mjs';

export default {
  id: 'instagram',
  label: 'Instagram',
  formats: ['1:1', '4:5', '9:16'], // 9:16 = Reels
  maxPerDay: 25, // Graph API content publishing limit per 24h
  needs: 'media', // video (Reels) or image

  setupSteps: [
    'Convert the Instagram account to Business or Creator and link it to a Facebook Page.',
    'Create a Meta app, add the "Instagram Graph API" product.',
    'Request permissions: instagram_content_publish, pages_read_engagement (App Review for Advanced Access).',
    'Generate a long-lived access token; put it + IG user id in publisher/.env (IG_TOKEN, IG_USER_ID).',
    'Run `connect instagram` to validate the token.',
  ],

  connect() {
    return ['Instagram setup:', ...this.setupSteps.map((s, i) => `  ${i + 1}. ${s}`)].join('\n');
  },

  async publish(job) {
    if (!hasToken('instagram')) throw new NotConnectedError('instagram');
    // Wiring spec (laptop): media must be reachable at a public URL.
    //   1) POST /{ig-user-id}/media  (media_type=REELS&video_url=... | image_url=...) -> creation_id
    //   2) poll status, then POST /{ig-user-id}/media_publish { creation_id }
    throw new NotWiredError('instagram', '  See create-container + media_publish in publish().');
  },
};
