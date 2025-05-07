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
        const response = await fetch(`https://api.apify.com/v2/acts/${APIFY_ACTOR_ID}/run-sync-get-dataset-items?token=${APIFY_API_TOKEN}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usernames: [username] })
        });

        if (!response.ok) {
            throw new Error(`Apify error: ${response.statusText}`);
        }

        const items = await response.json();

        if (!items || items.length === 0) {
            return res.status(404).json({ error: '未找到用戶數據' });
        }

        res.json(items[0]); // 回傳單一用戶資料

    } catch (err) {
        console.error('Proxy error:', err);
        res.status(500).json({ error: '伺服器錯誤，請稍後再試' });
    }
});

const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Apify Proxy Server is running.'));
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
