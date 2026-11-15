// Vercel serverless function: reads the reference library from Azure Cosmos DB.
// It only serves public reference data (medications, protocols, shielding). No user data ever reaches it.
// Needs COSMOS_ENDPOINT and COSMOS_KEY (use the READ-ONLY key) in Vercel environment variables.

const DB = process.env.COSMOS_DATABASE || 'sonnenblume';
const CONTAINER = process.env.COSMOS_CONTAINER || 'knowledge';
const TYPES = ['medication', 'protocol', 'shielding', 'condition', 'countermeasure', 'radiation_event', 'dose_rate', 'source'];
let container = null;

async function getContainer() {
  if (container) return container;
  const endpoint = process.env.COSMOS_ENDPOINT, key = process.env.COSMOS_KEY;
  if (!endpoint || !key || !/^https:\/\/[a-z0-9-]+\.documents\.azure\.com(:443)?\/?$/.test(endpoint)) return null;
  const { CosmosClient } = await import('@azure/cosmos');   // loaded only when a database is configured
  container = new CosmosClient({ endpoint, key, connectionPolicy: { requestTimeout: 4000, retryOptions: { maxRetryAttemptCount: 2, maxWaitTimeInSeconds: 6 } } }).database(DB).container(CONTAINER);
  return container;
}

export default async function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.setHeader('Allow', 'GET, HEAD'); return res.status(405).json({ error: 'method-not-allowed' }); }
  const c = await getContainer();
  // Not configured yet: answer normally with no records; the site then uses its bundled library.
  if (!c) return res.status(200).json({ source: 'none', count: 0, records: [] });

  const one = v => (Array.isArray(v) ? v[0] : v);
  const type = one(req.query.type), id = one(req.query.id), q = one(req.query.q);
  if (type !== undefined && !TYPES.includes(type)) return res.status(400).json({ error: 'bad-type' });
  if (id !== undefined && !/^[a-z]+-[a-z0-9-]{1,60}$/.test(String(id))) return res.status(400).json({ error: 'bad-id' });
  if (q !== undefined && (typeof q !== 'string' || q.length > 80)) return res.status(400).json({ error: 'bad-query' });

  try {
    const where = [], parameters = [];
    if (type) { where.push('c.type = @type'); parameters.push({ name: '@type', value: type }); }
    if (id) { where.push('c.id = @id'); parameters.push({ name: '@id', value: id }); }
    if (q) { where.push('(CONTAINS(LOWER(c.title), @q) OR CONTAINS(LOWER(c.summary), @q))'); parameters.push({ name: '@q', value: q.toLowerCase() }); }
    // Parameterised query: user input is never concatenated into SQL.
    const query = 'SELECT TOP 500 c.id, c.type, c.title, c.summary, c.tags, c.indicators, c.zones, c.data FROM c' + (where.length ? ' WHERE ' + where.join(' AND ') : '');
    const timeout = new Promise((_, rej) => setTimeout(() => rej(Object.assign(new Error('timeout'), { code: 'TIMEOUT' })), 8000));
    const { resources } = await Promise.race([c.items.query({ query, parameters }, { maxItemCount: 500 }).fetchAll(), timeout]);
    return res.status(200).json({ source: 'azure-cosmos', count: resources.length, records: resources });
  } catch (e) {
    console.error('kb query failed', e && e.code);
    return res.status(502).json({ error: 'database-error' });   // no internal details leak to the client
  }
}
