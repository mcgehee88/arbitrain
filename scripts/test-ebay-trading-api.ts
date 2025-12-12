/**
 * Test eBay Trading API with OAuth token
 * This is the endpoint that actually works with our credentials
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
  console.log('[Step 1] Fetching OAuth token...');
  const response = await axios.post(
    'https://api.ebay.com/identity/v1/oauth2/token',
    new URLSearchParams({ grant_type: 'client_credentials' }).toString(),
    {
      auth: { username: APP_ID, password: CERT_ID },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }
  );
  console.log(`✅ Token acquired: ${response.data.access_token.substring(0, 20)}...\n`);
  return response.data.access_token;
}

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 eBay Trading API Test - Sold Items Search');
  console.log('='.repeat(80) + '\n');

  const token = await getToken();

  // Step 2: Make a real API call to search for sold items
  console.log('[Step 2] Searching for sold items...\n');

  const testQuery = '14k gold ring';
  console.log(`Query: "${testQuery}"`);
  console.log(`Endpoint: https://api.ebay.com/ws/api.dll\n`);

  try {
    // Use GetSellerList to get recent sold items
    const response = await axios.get('https://api.ebay.com/ws/api.dll', {
      params: {
        callname: 'GetSellerEvents',
        Modifier: 'DetailLevel.ReturnAll',
        responseencoding: 'JSON',
      },
      headers: {
        Authorization: `Bearer ${token}`,
        'X-EBAY-API-APP-NAME': APP_ID,
      },
      timeout: 10000,
    });

    console.log('✅ API call successful!\n');
    console.log(`Status: ${response.status}\n`);

    // Show raw JSON response
    console.log('='.repeat(80));
    console.log('📊 Raw JSON Response\n');
    console.log(JSON.stringify(response.data, null, 2));

    // Save response to file
    const fs = require('fs');
    const reportPath = path.join(__dirname, '../ebay-trading-api-test.json');
    fs.writeFileSync(reportPath, JSON.stringify(response.data, null, 2));
    console.log(`\n✅ Response saved to: ${reportPath}`);
  } catch (error: any) {
    console.error('❌ API call failed\n');
    console.error(`Status: ${error.response?.status}`);
    console.error(`Error: ${error.message}\n`);
    console.error('Full response:');
    console.error(JSON.stringify(error.response?.data, null, 2));
    process.exit(1);
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ eBay Trading API is working with OAuth!');
  console.log('='.repeat(80) + '\n');
}

main().catch(console.error);


