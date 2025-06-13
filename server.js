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
    const APIFY_API_KEY = process.env.APIFY_API_KEY || 'apify_api_TUggrdG6k3oiw9kTSTKArd5dfmraPP1XVL3x';
    // 注意：actorId 要用 ~，且 endpoint 要用 /runs
    const ACTOR_ID = 'apify~instagram-followers-count-scraper';
    // 使用Apify API
    const response = await axios.post(
      `https://api.apify.com/v2/acts/${ACTOR_ID}/runs?token=${APIFY_API_KEY}`,
      { username: [username] },
      { headers: { 'Content-Type': 'application/json' } }
    );
    console.log('Apify API響應狀態:', response.status);
    // 這裡會回傳 run 資訊，你可能要輪詢結果
    const runId = response.data.data.id;
    // 等待執行結束並取得結果
    let finished = false;
    let output = null;
    while (!finished) {
      const statusRes = await axios.get(
        `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_API_KEY}`
      );
      if (statusRes.data.data.status === 'SUCCEEDED') {
        finished = true;
        // 取得結果資料
        const resultRes = await axios.get(
          `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${APIFY_API_KEY}`
        );
        output = resultRes.data && resultRes.data.length > 0 ? resultRes.data[0] : null;
      } else if (statusRes.data.data.status === 'FAILED') {
        throw new Error('Apify run failed');
      } else {
        // 等待2秒再查詢
        await new Promise(r => setTimeout(r, 2000));
      }
    }
    if (output) {
      return output;
    } else {
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

// 啟動服務器
app.listen(port, () => {
  console.log(`服務器運行在端口 ${port}`);
});
