const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// 啟用CORS
app.use(cors());
app.use(express.json());

// 主頁路由
app.get('/', (req, res) => {
  res.send('Instagram粉絲計數API代理服務器已啟動');
});

// GET方法 - Instagram粉絲計數
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

// POST方法 - Instagram粉絲計數（與GET功能相同，提供兼容性）
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

// 從Apify獲取Instagram數據的函數
async function fetchInstagramData(username) {
  try {
    console.log('正在獲取用戶數據:', username);
    // Apify API設置
    const APIFY_API_KEY = process.env.APIFY_API_KEY || 'apify_api_yBCcJlwPijXWnHkbDcGP5cOUN7y4GE1xjRcL';
    const ACTOR_ID = 'apify/instagram-followers-count-scraper';
    // 使用Apify API
    const response = await axios.post(
      `https://api.apify.com/v2/acts/${ACTOR_ID}/run-sync?token=${APIFY_API_KEY}`,
      { username: [username] },
      { headers: { 'Content-Type': 'application/json' } }
    );
    console.log('Apify API響應狀態:', response.status);
    // 檢查響應數據
    if (response.data && response.data.items && response.data.items.length > 0) {
      // 返回第一個結果
      return response.data.items[0];
    } else {
      console.error('未找到數據:', response.data);
      throw new Error('未找到用戶數據');
    }
  } catch (error) {
    console.error('Apify API錯誤:', error.message);
    // 提供更詳細的錯誤信息
    if (error.response) {
      console.error('API錯誤響應:', error.response.data);
      console.error('API錯誤狀態:', error.response.status);
    }
    throw error;
  }
}

// 啟動服務器
app.listen(port, () => {
  console.log(`服務器運行在端口 ${port}`);
});
