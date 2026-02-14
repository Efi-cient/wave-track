/**
 * Spotify Analyzer PWA - Backend Server
 *
 * This is the main entry point for the Express backend.
 * It handles the OAuth 2.0 flow securely and proxies API requests.
 */

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import path from 'path';
import { fileURLToPath } from 'url';

// Import Config (Loads environment variables)
import { CONFIG } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = CONFIG.PORT || 8888;

// Middleware Configuration
app.use(express.static(path.join(__dirname, '../public'))); // Serve frontend
app.use(cors())
    .use(cookieParser());

// Import Auth Logic
import { login, callback } from './auth.js';
import apiRoutes from './api.js';

// Auth Routes
app.get('/login', login);
app.get('/callback', callback);

// API Routes
app.use('/api', apiRoutes);

// Health Check
app.get('/health', (req, res) => {
    res.send('Spotify Analyzer Backend is healthy 🚀');
});

// Start the server (HTTP)
app.listen(PORT, '0.0.0.0', () => {
    console.log(`[${new Date().toISOString()}] Server is running on http://localhost:${PORT}`);
    console.log('Ensure you have re-logged in if scopes changed!');
});

