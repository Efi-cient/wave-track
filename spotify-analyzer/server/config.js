import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve the path to the .env file in the server directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '.env');

// Check if .env file exists (optional logic, but dotenv handles it gracefully)
dotenv.config({ path: envPath });

// Export configuration
export const CONFIG = {
    CLIENT_ID: process.env.CLIENT_ID,
    CLIENT_SECRET: process.env.CLIENT_SECRET,
    REDIRECT_URI: process.env.REDIRECT_URI,
    PORT: process.env.PORT || 8888
};

// Log for debugging
console.log(`[Config] Loaded environment from ${envPath}`);
console.log(`[Config] CLIENT_ID length: ${CONFIG.CLIENT_ID ? CONFIG.CLIENT_ID.length : 'MISSING'}`);
console.log(`[Config] REDIRECT_URI: ${CONFIG.REDIRECT_URI || 'MISSING'}`);

if (!CONFIG.CLIENT_ID) {
    console.error('[Config] CRITICAL ERROR: CLIENT_ID is missing!');
}
if (!CONFIG.REDIRECT_URI) {
    console.error('[Config] CRITICAL ERROR: REDIRECT_URI is missing!');
}
