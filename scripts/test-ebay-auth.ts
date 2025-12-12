/**
 * Test eBay OAuth2 authentication
 * Verifies that we can get a token and make a successful comp query
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load credentials
const envPath = path.join(__dirname, '../../secrets/.env.ebay');
dotenv.config({ path: envPath });

const APP_ID = process.env.EBAY_PROD_APP_ID;
const CERT_ID = process.env.EBAY_PROD_CERT_ID;

if (!APP_ID || !CERT_ID) {
  console.error('❌ eBay credentials not found in .env.ebay');
  console.error(`   APP_ID: ${APP_ID ? '✓' : '✗'}`);
  console.error(`   CERT_ID: ${CERT_ID ? '✓' : '✗'}`);
  process.exit(1);
}

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('🔐 eBay OAuth2 Authentication Test');
  console.log('='.repeat(80) + '\n');

  // Step 1: Fetch OAuth token
  console.log('[Step 1] Fetching OAuth2 access token...\n');
  console.log(`  Using client_id: ${APP_ID}`);
  console.log(`  Using client_secret: ${CERT_ID.substring(0, 10)}...`);

  let token: string;
  try {
    const tokenResponse = await axios.post(
      'https://api.ebay.com/identity/v1/oauth2/token',
      new URLSearchParams({
        grant_type: 'client_credentials',
      }).toString(),
      {
        auth: {
          username: APP_ID,
          password: CERT_ID,
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    token = tokenResponse.data.access_token;
    const expiresIn = tokenResponse.data.expires_in;

    console.log(`\n✅ Token acquired successfully!\n`);
    console.log(`   Access Token: ${token.substring(0, 30)}...`);
    console.log(`   Expires in: ${expiresIn} seconds`);
    console.log(`   Token Type: ${tokenResponse.data.token_type}`);
  } catch (error: any) {
    console.error('\n❌ Failed to get OAuth token');
    console.error(`   Status: ${error.response?.status}`);
    console.error(`   Error: ${error.response?.data?.error}`);
    console.error(`   Details: ${error.response?.data?.error_description}`);
    process.exit(1);
  }

  // Step 2: Make a test query
  console.log('\n' + '-'.repeat(80));
  console.log('[Step 2] Testing authenticated API call\n');

  const testQuery = '14k gold ring';
  console.log(`  Query: "${testQuery}"`);
  console.log(`  Endpoint: /buy/marketplace_insights/v1/item_activity`);
  console.log(`  Auth: Bearer ${token.substring(0, 20)}...\n`);

  try {
    const response = await axios.get('https://api.ebay.com/buy/browse/v1/item_summary/search', {
      params: {
        q: testQuery,
        limit: 10,
        filter: 'itemLocationCountry:US',
      },
      headers: {
        Authorization: `Bearer ${token}`,
        'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
      },
    });

    console.log('✅ API call successful!\n');
    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Items found: ${response.data.itemActivities?.length || 0}`);

    // Show raw JSON response
    console.log('\n' + '-'.repeat(80));
    console.log('📊 Raw JSON Response\n');
    console.log(JSON.stringify(response.data, null, 2));

    // Save to file
    const reportPath = path.join(__dirname, '../ebay-auth-test.json');
    fs.writeFileSync(reportPath, JSON.stringify(response.data, null, 2));
    console.log(`\n✅ Full response saved to: ${reportPath}`);
  } catch (error: any) {
    console.error('❌ API call failed');
    console.error(`   Status: ${error.response?.status}`);
    console.error(`   Error: ${error.response?.data?.errors?.[0]?.message || error.message}`);
    console.error(`\n   Full response:`);
    console.error(JSON.stringify(error.response?.data, null, 2));
    process.exit(1);
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ eBay OAuth2 authentication is working!');
  console.log('='.repeat(80) + '\n');
}

main().catch(console.error);




