import * as dotenv from 'dotenv';
import { EBayClient } from './packages/adapters/src/ebay.client';

dotenv.config({ path: '/home/workspace/Arbitrain.com/secrets/.env.ebay' });

const ebayClient = new EBayClient(
  process.env.EBAY_PROD_APP_ID || '',
  process.env.EBAY_PROD_CERT_ID || ''
);

async function debug() {
  const comps = await ebayClient.searchSoldListings('14k gold ring', 'new');
  console.log('First comp:', JSON.stringify(comps[0], null, 2));
}

debug().catch(console.error);
