import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../secrets/.env.ebay') });

console.log('ENV Path:', path.resolve(__dirname, '../../../secrets/.env.ebay'));
console.log('EBAY_PROD_APP_ID:', process.env.EBAY_PROD_APP_ID || 'NOT SET');
console.log('EBAY_PROD_CERT_ID:', process.env.EBAY_PROD_CERT_ID || 'NOT SET');
