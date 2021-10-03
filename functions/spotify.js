const { default: axios }    = require("axios");
const { base64Encode }      = require("./general");
const qs                    = require('qs');
const CONFIG_FILE           = '../config.json';

const { 
    SPOTIFY_CLIENT_ID,
    SPOTIFY_CLIENT_SECRET
} = require(CONFIG_FILE);

async function getSpotifyAuthToken() {
    const auth_token = base64Encode(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`);

    try{
        //make post request to SPOTIFY API for access token, sending relavent info
        const token_url = 'https://accounts.spotify.com/api/token';
        const data = qs.stringify({'grant_type':'client_credentials'});

        const response = await axios.post(token_url, data, {
            headers: { 
            'Authorization': `Basic ${auth_token}`,
            'Content-Type': 'application/x-www-form-urlencoded' 
            }
        })

        //return access token
        return response.data.access_token;
    } catch(error) {
        //on fail, log the error in console
        console.log(error);
    }
}

async function getSpotifyTrackIdFromUrl(spotifyUrl) {
    if(spotifyUrl.match(/\/track\/.+?\?/)) {
        return spotifyUrl.match(/\/track\/.+?\?/)[0].replace(/\/track\//,'').replace('\?','');
    }
}

async function getSpotifyTrack(spotifyTrackId) {
    try {
        const spotifyToken = await getSpotifyAuthToken();
        const response = await axios.get(`https://api.spotify.com/v1/tracks/${spotifyTrackId}`, {
            headers: { 
                'Authorization': `Bearer ${spotifyToken}`,
            }
        });
        return response.data;
    } catch(error) {
        console.log(error);
        return null;
    }
}

exports.getSpotifyAuthToken         = getSpotifyAuthToken;
exports.getSpotifyTrack             = getSpotifyTrack;
exports.getSpotifyTrackIdFromUrl    = getSpotifyTrackIdFromUrl;