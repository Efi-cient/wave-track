from flask import Flask, request, jsonify
import requests
import os

app = Flask(__name__)

# Vercel requires this variable for the serverless function
# It must be named 'app'
# https://vercel.com/docs/functions/serverless-functions/runtimes/python

BASE_URL = 'https://ws.audioscrobbler.com/2.0/'
LASTFM_API_KEY = os.environ.get('LASTFM_API_KEY')

@app.route('/api/lastfm', methods=['GET'])
def proxy_lastfm():
    if not LASTFM_API_KEY:
        return jsonify({'error': 'Configuration Error', 'message': 'API Key not configured on server'}), 500

    # Get all query parameters from the request
    params = request.args.to_dict()
    
    # Inject API Key and Format
    params['api_key'] = LASTFM_API_KEY
    params['format'] = 'json'

    try:
        # Forward the request to Last.fm
        response = requests.get(BASE_URL, params=params)
        
        # Return the JSON response from Last.fm
        return jsonify(response.json()), response.status_code

    except requests.RequestException as e:
        return jsonify({'error': 'Proxy Error', 'message': str(e)}), 502
    except Exception as e:
         return jsonify({'error': 'Server Error', 'message': str(e)}), 500

# For local testing
if __name__ == '__main__':
    app.run(port=5000)
