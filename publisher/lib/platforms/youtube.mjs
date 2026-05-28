import { getToken, hasToken } from '../tokens.mjs';
import { NotConnectedError, NotWiredError } from './base.mjs';

export default {
  id: 'youtube',
  label: 'YouTube',
  formats: ['16:9'],
  maxPerDay: 6, // default Data API quota: ~1600 units/upload, 10k/day
  needs: 'video',

  setupSteps: [
    'Create a Google Cloud project and enable "YouTube Data API v3".',
    'Configure the OAuth consent screen (External, add yourself as a test user).',
    'Create an OAuth client of type "Desktop app".',
    'Put the client id/secret in publisher/.env (YT_CLIENT_ID, YT_CLIENT_SECRET).',
    'Run `connect youtube` for the loopback OAuth (scope: youtube.upload).',
  ],

  connect() {
    return [
      'YouTube setup:',
      ...this.setupSteps.map((s, i) => `  ${i + 1}. ${s}`),
      '',
      'On success the refresh token is saved via tokens.setToken("youtube", ...).',
    ].join('\n');
  },

  async publish(job) {
    if (!hasToken('youtube')) throw new NotConnectedError('youtube');
    getToken('youtube');
    // Wiring spec (laptop): videos.insert resumable upload
    //   POST https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable
    //     part=snippet,status  Authorization: Bearer <access from refresh>
    //   snippet: { title, description, tags, categoryId:'10'(Music) }
    //   status: { privacyStatus:'private'|'public', publishAt:<ISO for scheduled> }
    //   then PUT the video bytes to the returned upload URL.
    throw new NotWiredError('youtube', '  See videos.insert resumable upload in publish().');
  },
};
