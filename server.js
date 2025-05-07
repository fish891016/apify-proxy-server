// index.js 或 server.js
const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// 配置CORS以允許跨域請求
app.use(cors());
app.use(express.json());

// 測試路由
app.get('/', (req, res) => {
  res.send('Apify代理服務器正常運行中');
});

// Instagram粉絲計數API代理
app.get('/instagram-followers', async (req, res) => {
  const { username } = req.query;
  
  if (!username) {
    return res.status(400).json({ error: '用戶名必須提供' });
  }
  
  const APIFY_API_KEY = process.env.APIFY_API_KEY || 'apify_api_yBCcJlwPijXWnHkbDcGP5cOUN7y4GE1xjRcL';
  const ACTOR_ID = 'apify/instagram-followers-count-scraper';
  
  try {
    console.log(`正在獲取用戶 ${username} 的數據...`);
    
    // 方法1: 使用run-sync端點（推薦）
    const response = await axios.post(
      `https://api.apify.com/v2/acts/${ACTOR_ID}/run-sync?token=${APIFY_API_KEY}`,
      {
        username: [username]
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Apify API響應:', response.status);
    
    if (response.data && response.data.items && response.data.items.length > 0) {
      // 返回第一個結果
      return res.json(response.data.items[0]);
    } else {
      console.log('沒有找到數據:', response.data);
      return res.status(404).json({ error: '未找到用戶數據' });
    }
  } catch (error) {
    console.error('Apify API錯誤:', error.response ? error.response.data : error.message);
    
    // 提供更詳細的錯誤信息
    return res.status(500).json({ 
      error: '獲取數據失敗', 
      details: error.response ? error.response.data : error.message,
      statusCode: error.response ? error.response.status : null
    });
  }
});

app.listen(port, () => {
  console.log(`服務器運行在端口 ${port}`);
});
