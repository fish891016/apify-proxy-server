const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;
const APIFY_ACTOR_ID = 'apify/instagram-followers-count-scraper';

app.post('/api/instagram-followers', async (req, res) => {
    const { username } = req.body;

    if (!username) {
        return res.status(400).json({ error: 'Missing username' });
    }

    try {
        const response = await fetch(`https://api.apify.com/v2/acts/${APIFY_ACTOR_ID}/run-sync?token=${APIFY_API_TOKEN}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usernames: [username] })
        });

        if (!response.ok) {
            return res.status(response.status).json({ error: 'Failed to fetch from Apify' });
        }

        const result = await response.json();
        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
