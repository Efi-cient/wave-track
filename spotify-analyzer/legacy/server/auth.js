import { CONFIG } from './config.js';
import axios from 'axios';
import querystring from 'querystring';

/* Step 2: OAuth Flow & Token Exchange */

const { CLIENT_ID, CLIENT_SECRET, REDIRECT_URI } = CONFIG;

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
const generateRandomString = (length) => {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};

const stateKey = 'spotify_auth_state';


/**
 * Redirects the user to the Spotify Accounts Service to authorize the app.
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
export const login = (req, res) => {
    const state = generateRandomString(16);
    res.cookie(stateKey, state);

    // Request authorization for these scopes
    const scope = 'user-read-private user-read-email user-top-read user-library-read user-read-recently-played';

    const authUrl = 'https://accounts.spotify.com/authorize?' +
        querystring.stringify({
            response_type: 'code',
            client_id: CLIENT_ID,
            scope: scope,
            redirect_uri: REDIRECT_URI,
            state: state,
            show_dialog: true // Force re-authorization
        });
    console.log('[Auth] Redirecting to Spotify with scopes:', scope);
    console.log('[Auth] Redirecting URL:', authUrl);
    res.redirect(authUrl);
};

/**
 * Handles the callback from Spotify, exchanges the code for an access token.
 * Validates the state parameter to prevent CSRF attacks.
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
export const callback = async (req, res) => {
    const code = req.query.code || null;
    const state = req.query.state || null;
    const storedState = req.cookies ? req.cookies[stateKey] : null;

    if (state === null || state !== storedState) {
        res.redirect('/#' +
            querystring.stringify({
                error: 'state_mismatch'
            }));
    } else {
        res.clearCookie(stateKey);
        const authOptions = {
            url: 'https://accounts.spotify.com/api/token',
            method: 'post',
            data: querystring.stringify({
                code: code,
                redirect_uri: REDIRECT_URI,
                grant_type: 'authorization_code'
            }),
            headers: {
                'content-type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + (new Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64'))
            },
        };

        try {
            const response = await axios(authOptions);
            if (response.status === 200) {
                const access_token = response.data.access_token;
                const refresh_token = response.data.refresh_token;

                // Redirect to the frontend with the access token in the URL fragment
                // This keeps the token out of the server logs and history slightly better than query params
                res.redirect('/#' +
                    querystring.stringify({
                        access_token: access_token,
                        refresh_token: refresh_token
                    }));
            } else {
                res.redirect('/#' +
                    querystring.stringify({
                        error: 'invalid_token'
                    }));
            }
        } catch (error) {
            console.error('Error exchanging code for token:', error.response ? error.response.data : error.message);
            res.redirect('/#' +
                querystring.stringify({
                    error: 'invalid_token'
                }));
        }
    }
};
