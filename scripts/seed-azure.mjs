// Seeds the Sonnenblume knowledge base into Azure Cosmos DB.
// Usage (PowerShell):
//   $env:COSMOS_ENDPOINT="https://<account>.documents.azure.com:443/"
//   $env:COSMOS_KEY="<primary key>"
//   npm install
//   node scripts/seed-azure.mjs
import { CosmosClient } from '@azure/cosmos';
import { readFile } from 'node:fs/promises';

const endpoint = process.env.COSMOS_ENDPOINT, key = process.env.COSMOS_KEY;
if (!endpoint || !key) { console.error('Set COSMOS_ENDPOINT and COSMOS_KEY first.'); process.exit(1); }
const dbName = process.env.COSMOS_DATABASE || 'sonnenblume';
const containerName = process.env.COSMOS_CONTAINER || 'knowledge';

const client = new CosmosClient({ endpoint, key });
const { database } = await client.databases.createIfNotExists({ id: dbName });
const { container } = await database.containers.createIfNotExists({ id: containerName, partitionKey: { paths: ['/type'] } });

const index = JSON.parse(await readFile(new URL('../data/index.json', import.meta.url), 'utf8'));
let n = 0;
for (const f of index.files) {
  const { records } = JSON.parse(await readFile(new URL('../data/' + f, import.meta.url), 'utf8'));
  for (const r of records) { await container.items.upsert(r); n++; }
  console.log(`${f}: ${records.length} records`);
}
console.log(`Done. ${n} records in ${dbName}/${containerName}.`);
