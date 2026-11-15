# Connect Sonnenblume to Azure Cosmos DB

The site works without a database: it loads the bundled knowledge base from `/data`.
Once these steps are done, the Library reads live from Azure, and its badge shows "LIVE: AZURE COSMOS DB".

## 1. Create the database (free tier, about 3 minutes)

In PowerShell, with the Azure CLI installed (`winget install Microsoft.AzureCLI`):

```powershell
az login
az group create -n sonnenblume-rg -l eastasia
az cosmosdb create -n sonnenblume-db-<yourname> -g sonnenblume-rg --enable-free-tier true --default-consistency-level Session
```

Free tier covers 1000 RU/s and 25 GB. Only one free-tier account is allowed per subscription.

## 2. Get the endpoint and key

```powershell
az cosmosdb show -n sonnenblume-db-<yourname> -g sonnenblume-rg --query documentEndpoint -o tsv
az cosmosdb keys list -n sonnenblume-db-<yourname> -g sonnenblume-rg --query primaryReadonlyMasterKey -o tsv
az cosmosdb keys list -n sonnenblume-db-<yourname> -g sonnenblume-rg --query primaryMasterKey -o tsv
```

## 3. Load all the data

```powershell
cd C:\Users\myagm\aegis-crew-health
npm install
$env:COSMOS_ENDPOINT="<documentEndpoint>"
$env:COSMOS_KEY="<primaryMasterKey>"
npm run seed
```

This creates database `sonnenblume`, container `knowledge` (partition key `/type`) and upserts every record. Safe to run again.

## 4. Give Vercel read access

Use the **read-only** key for the website:

```powershell
npx vercel env add COSMOS_ENDPOINT production
npx vercel env add COSMOS_KEY production
npx vercel deploy --prod
```

Never commit keys to git. `.env*` files are already in `.gitignore`.
