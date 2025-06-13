const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// 只允許 https://ksdshop.com 的 CORS 請求
app.use(cors({
  origin: 'https://ksdshop.com'
}));

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Instagram粉絲計數API代理服務器已啟動');
});

app.get('/instagram-followers', async (req, res) => {
  const { username } = req.query;
  if (!username) {
    return res.status(400).json({ error: '請提供用戶名參數' });
  }
  try {
    const data = await fetchInstagramData(username);
    res.json(data);
  } catch (error) {
    console.error('API錯誤:', error.message);
    res.status(500).json({ error: '伺服器錯誤，請稍後再試' });
  }
});

app.post('/api/instagram-followers', async (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ error: '請提供用戶名參數' });
  }
  try {
    const data = await fetchInstagramData(username);
    res.json(data);
  } catch (error) {
    console.error('API錯誤:', error.message);
    res.status(500).json({ error: '伺服器錯誤，請稍後再試' });
  }
});

async function fetchInstagramData(username) {
  try {
    console.log('正在獲取用戶數據:', username);
    const APIFY_API_KEY = process.env.APIFY_API_KEY || 'apify_api_yBCcJlwPijXWnHkbDcGP5cOUN7y4GE1xjRcL';
    const ACTOR_ID = 'apify/instagram-followers-count-scraper';
    const response = await axios.post(
      `https://api.apify.com/v2/acts/${ACTOR_ID}/run-sync?token=${APIFY_API_KEY}`,
      { username: [username] },
      { headers: { 'Content-Type': 'application/json' } }
    );
    console.log('Apify API響應狀態:', response.status);
    if (response.data && response.data.items && response.data.items.length > 0) {
      return response.data.items[0];
    } else {
      console.error('未找到數據:', response.data);
      throw new Error('未找到用戶數據');
    }
  } catch (error) {
    console.error('Apify API錯誤:', error.message);
    if (error.response) {
      console.error('API錯誤響應:', error.response.data);
      console.error('API錯誤狀態:', error.response.status);
    }
    throw error;
  }
}

app.listen(port, () => {
  console.log(`服務器運行在端口 ${port}`);
});
