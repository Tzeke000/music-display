import { hasToken } from '../tokens.mjs';
import { NotConnectedError, NotWiredError } from './base.mjs';

export default {
  id: 'x',
  label: 'X (Twitter)',
  formats: ['16:9', '1:1'],
  maxPerDay: 25, // policy/tier dependent — verify current limits
  needs: 'video',

  setupSteps: [
    'Create a project + app in the X developer portal (a PAID tier is required for meaningful posting volume).',
    'Enable OAuth 2.0; set scopes: tweet.read, tweet.write, users.read, offline.access, media.write.',
    'Put client id/secret in publisher/.env (X_CLIENT_ID, X_CLIENT_SECRET).',
    'Run `connect x` for OAuth 2.0 PKCE (loopback redirect).',
  ],

  connect() {
    return ['X (Twitter) setup:', ...this.setupSteps.map((s, i) => `  ${i + 1}. ${s}`)].join('\n');
  },

  async publish(job) {
    if (!hasToken('x')) throw new NotConnectedError('x');
    // Wiring spec (laptop):
    //   1) chunked media upload (INIT/APPEND/FINALIZE) -> media_id
    //   2) POST https://api.twitter.com/2/tweets { text, media:{ media_ids:[id] } }
    throw new NotWiredError('x', '  See chunked media upload + POST /2/tweets in publish().');
  },
};
