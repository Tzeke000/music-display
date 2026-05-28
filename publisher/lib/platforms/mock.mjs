/**
 * A fake platform with no credentials, so the full draft -> approve -> publish
 * loop can be exercised locally (even from mobile). Never posts anywhere.
 */
export default {
  id: 'mock',
  label: 'Mock (local test)',
  formats: ['any'],
  maxPerDay: Infinity,
  needs: 'none',

  connect() {
    return 'Mock platform needs no setup — it always "publishes" successfully.';
  },

  async publish(job) {
    const id = `mock_${job.id}`;
    return { publishedId: id, publishedUrl: `https://example.test/${id}` };
  },
};
