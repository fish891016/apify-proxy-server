const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
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
    const APIFY_API_KEY = process.env.APIFY_API_KEY || 'apify_api_TUggrdG6k3oiw9kTSTKArd5dfmraPP1XVL3x';
    const ACTOR_ID = 'apify~instagram-followers-count-scraper';

    // 1. 啟動 Actor
    const runRes = await axios.post(
      `https://api.apify.com/v2/acts/${ACTOR_ID}/runs?token=${APIFY_API_KEY}`,
      { username: [username] },
      { headers: { 'Content-Type': 'application/json' } }
    );

    const runId = runRes.data.data.id;

    // 2. 輪詢 Actor 狀態直到 SUCCEEDED
    let status = '';
    let output = null;
    while (true) {
      const statusRes = await axios.get(
        `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_API_KEY}`
      );
      status = statusRes.data.data.status;
      if (status === 'SUCCEEDED') {
        // 3. 取得結果資料
        const resultRes = await axios.get(
          `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${APIFY_API_KEY}`
        );
        output = resultRes.data && resultRes.data.length > 0 ? resultRes.data[0] : null;
        break;
      } else if (status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') {
        throw new Error(`Apify run failed: ${status}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 2000)); // 每2秒查詢一次
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

app.listen(port, () => {
  console.log(`服務器運行在端口 ${port}`);
});
