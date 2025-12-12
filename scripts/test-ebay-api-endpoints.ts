/**
 * Test different eBay API endpoints to find one that works
 * Try multiple endpoints in sequence
 */

import axios from 'axios';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load credentials
const envPath = path.join(__dirname, '../../secrets/.env.ebay');
dotenv.config({ path: envPath });

const APP_ID = process.env.EBAY_PROD_APP_ID;
const CERT_ID = process.env.EBAY_PROD_CERT_ID;

if (!APP_ID || !CERT_ID) {
  console.error('Missing eBay credentials');
  process.exit(1);
}

async function getToken(): Promise<string> {
  const response = await axios.post(
    'https://api.ebay.com/identity/v1/oauth2/token',
    new URLSearchParams({ grant_type: 'client_credentials' }).toString(),
    {
      auth: { username: APP_ID, password: CERT_ID },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }
  );
  return response.data.access_token;
}

async function testEndpoint(token: string, name: string, url: string, params: any): Promise<boolean> {
  console.log(`\n📡 Testing: ${name}`);
  console.log(`   URL: ${url}`);

  try {
    const response = await axios.get(url, {
      params,
      headers: { Authorization: `Bearer ${token}`, 'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US' },
      timeout: 5000,
    });

    console.log(`   ✅ SUCCESS (Status: ${response.status})`);
    console.log(`   Response keys: ${Object.keys(response.data).join(', ')}`);
    return true;
  } catch (error: any) {
    const status = error.response?.status;
    const msg = error.response?.data?.errors?.[0]?.longMessage || error.response?.data?.error_description || error.message;
    console.log(`   ❌ FAILED (Status: ${status})`);
    console.log(`   Error: ${msg}`);
    return false;
  }
}

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 eBay API Endpoint Discovery');
  console.log('='.repeat(80));

  const token = await getToken();
  console.log(`\n✅ Got OAuth token: ${token.substring(0, 20)}...`);

  const endpoints = [
    {
      name: 'Browse API - Search (current)',
      url: 'https://api.ebay.com/buy/browse/v1/item_summary/search',
      params: { q: '14k gold ring', limit: 1 },
    },
    {
      name: 'Marketplace Insights - Item Activity',
      url: 'https://api.ebay.com/buy/marketplace_insights/v1/item_activity',
      params: { q: '14k gold ring', limit: 1 },
    },
    {
      name: 'Commerce Catalog - Search',
      url: 'https://api.ebay.com/commerce/catalog/v1/product_summary/search',
      params: { q: '14k gold ring', limit: 1 },
    },
    {
      name: 'Trading API - GetItemStatus (legacy)',
      url: 'https://api.ebay.com/ws/api.dll',
      params: { callname: 'GetSellingManagerSoldListings', responseencoding: 'JSON' },
    },
  ];

  let anySuccess = false;
  for (const endpoint of endpoints) {
    const success = await testEndpoint(token, endpoint.name, endpoint.url, endpoint.params);
    if (success) anySuccess = true;
  }

  console.log('\n' + '='.repeat(80));
  if (anySuccess) {
    console.log('✅ At least one endpoint is working');
  } else {
    console.log('⚠️  No endpoints returned success - credentials may not have the right permissions');
    console.log('\nThe credentials appear to be valid for OAuth (token acquired),');
    console.log('but they may not have Browse API or Marketplace Insights scope.');
    console.log('\nYou may need to:');
    console.log('1. Create new eBay app with Browse API scope');
    console.log('2. Or use REST/XML Trading API which might have different scope requirements');
  }
  console.log('='.repeat(80) + '\n');
}

main().catch(console.error);

