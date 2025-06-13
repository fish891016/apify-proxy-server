// server.js
const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// 啟用跨來源請求
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Instagram Follower Count Proxy Server is running.');
});

// 主要 API：透過 Apify 查詢 Instagram 粉絲數
app.get('/instagram-followers', async (req, res) => {
  const { username } = req.query;

  if (!username) {
    return res.status(400).json({ error: '缺少 username 參數' });
  }

  try {
    const APIFY_TOKEN = process.env.APIFY_API_KEY;
    const TASK_ID = 'fish891016~instagram-followers-count-scraper-task';

    const apifyUrl = `https://api.apify.com/v2/actor-tasks/${TASK_ID}/run-sync-get-dataset-items?token=${APIFY_TOKEN}`;

    const apifyRes = await axios.post(apifyUrl, {
      usernames: [username]
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const items = apifyRes.data;

    if (!items || items.length === 0) {
      return res.status(404).json({ error: `無法找到用戶 ${username} 的資料` });
    }

    res.json(items[0]); // 傳回第一筆結果
  } catch (error) {
    console.error('Apify API 錯誤:', error.response?.data || error.message);
    res.status(500).json({
      error: '伺服器錯誤，請稍後再試',
      details: error.response?.data || error.message
    });
  }
});

app.listen(port, () => {
  console.log(`伺服器已啟動於 port ${port}`);
});
