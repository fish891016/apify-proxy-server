const express = require('express');
const cors = require('cors');
const { ApifyClient } = require('apify-client');
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

// POST方法 - Instagram粉絲計數
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

// 使用ApifyClient獲取Instagram數據的函數
async function fetchInstagramData(username) {
  try {
    console.log('正在獲取用戶數據:', username);
    
    // 初始化ApifyClient
    const APIFY_API_KEY = process.env.APIFY_API_KEY || 'apify_api_yBCcJlwPijXWnHkbDcGP5cOUN7y4GE1xjRcL';
    const TASK_ID = '7RQ4RlfRihUhflQtJ'; // 使用您提供的Task ID
    
    const client = new ApifyClient({
      token: APIFY_API_KEY,
    });
    
    // 準備輸入參數
    const input = {
      usernames: [username]
    };
    
    console.log('調用Apify Task...');
    
    // 執行Task並等待完成
    const run = await client.task(TASK_ID).call(input);
    
    console.log('Task執行完成，獲取數據...');
    
    // 獲取結果
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    
    console.log('成功獲取數據項數:', items.length);
    
    if (items.length > 0) {
      return items[0]; // 返回第一個結果
    } else {
      throw new Error('未找到用戶數據');
    }
  } catch (error) {
    console.error('Apify Client錯誤:', error.message);
    throw error;
  }
}

// 啟動服務器
app.listen(port, () => {
  console.log(`服務器運行在端口 ${port}`);
});
