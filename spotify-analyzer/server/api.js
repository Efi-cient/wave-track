import express from 'express';
import axios from 'axios';
import querystring from 'querystring';
import { CONFIG } from './config.js';

const router = express.Router();
const { CLIENT_ID, CLIENT_SECRET } = CONFIG;


/**
 * Endpoint to refresh the access token.
 * The frontend sends the refresh_token, and we use the Client Secret to get a new access_token.
 */
router.get('/refresh_token', async (req, res) => {
    const refresh_token = req.query.refresh_token;

    if (!refresh_token) {
        return res.status(400).json({ error: 'Refresh token is required' });
    }

    const authOptions = {
        url: 'https://accounts.spotify.com/api/token',
        method: 'post',
        data: querystring.stringify({
            grant_type: 'refresh_token',
            refresh_token: refresh_token
        }),
        headers: {
            'content-type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + (new Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64'))
        },
    };

    try {
        const response = await axios(authOptions);
        res.json({
            access_token: response.data.access_token,
            expires_in: response.data.expires_in
        });
    } catch (error) {
        console.error('Error refreshing token:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Failed to refresh token' });
    }
});

export default router;
