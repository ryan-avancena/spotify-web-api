import express from 'express';
import querystring from 'querystring';
import 'dotenv/config'; 
import fetch from 'node-fetch'; // if Node 18+, fetch is built-in, otherwise install node-fetch

const app = express();
const port = process.env.PORT || 8000;

const client_id = process.env.CLIENT_ID;
const client_secret = process.env.CLIENT_SECRET;
const redirect_uri = `http://127.0.0.1:${port}/callback`;

// console.log(client_id, client_secret, redirect_uri)

function generateRandomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

app.get('/login', (req, res) => {
  const state = generateRandomString(16);
  const scope = 'user-read-private user-top-read user-read-email user-read-playback-state';

  const authURL =
    'https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id,
      scope,
      redirect_uri,
      state,
    });

  res.redirect(authURL);
});

app.get('/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.send('No authorization code received');

  try {
    const tokenResponse = await fetch(
      'https://accounts.spotify.com/api/token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization':
            'Basic ' +
            Buffer.from(`${client_id}:${client_secret}`).toString('base64'),
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri,
        }),
      }
    );

    const tokenData = await tokenResponse.json(); 

    if (!tokenResponse.ok) {
      console.error('Token error:', tokenData);
      return res.status(400).send('Token exchange failed');
    }

    const access_token = tokenData.access_token;

    const type = 'artists';
    const time_range = 'medium_term';

    const topItemsResponse = await fetch(
      `https://api.spotify.com/v1/me/top/${type}?time_range=${time_range}`,
      {
        headers: { Authorization: `Bearer ${access_token}` },
      }
    );

    const topItemsData = await topItemsResponse.json();

    res.json({
      access_token,
      topItemsContent: topItemsData,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Something broke');
  }
});



// starting the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Open http://127.0.0.1:${port}/login to start Spotify auth`);
});
