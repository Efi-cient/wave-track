
import selfsigned from 'selfsigned';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const attrs = [{ name: 'commonName', value: 'localhost' }];
console.log('Generating keys...');

// Check if it's a promise
let result = selfsigned.generate(attrs, { days: 365 });
if (result instanceof Promise) {
    console.log('Result is a promise, waiting...');
    result = await result;
}

const pems = result;
console.log('Generated keys:', Object.keys(pems));


const certDir = path.join(__dirname, '../server/certs');
if (!fs.existsSync(certDir)) {
    fs.mkdirSync(certDir, { recursive: true });
}

fs.writeFileSync(path.join(certDir, 'cert.pem'), pems.cert);
fs.writeFileSync(path.join(certDir, 'key.pem'), pems.private);

console.log('Certificates generated in server/certs/');
