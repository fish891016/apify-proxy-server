require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 10000;

// IP 限流：每小時最多 5 次
const limiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: '請求過於頻繁，請稍後再試。' },
});
app.use(limiter);

// 允許跨域
app.use(cors());
// 支援 JSON body（雖然我們目前只用 GET，但加上以防日後 POST）
app.use(express.json());

// 健康檢查路由
app.get('/', (req, res) => {
  res.send('✅ IG Proxy Server Online');
});

// 主要 API 路由
app.get('/instagram-followers', async (req, res) => {
  try {
    const { username } = req.query;
    const authHeader = req.headers['x-ksd-auth'];
    const origin = req.get('origin') || '';

    // 驗證參數
    if (!username) {
      return res.status(400).json({ error: '缺少 username 參數' });
    }
    // 驗證金鑰
    if (authHeader !== process.env.KSD_SECRET) {
      return res.status(401).json({ error: '未授權的請求' });
    }
    // 驗證 referer 白名單（可選）
    const whitelist = (process.env.CLIENT_WHITELIST || '').split(',').map(s => s.trim());
    if (whitelist.length && !whitelist.some(d => origin.includes(d))) {
      return res.status(403).json({ error: '來源不在白名單內' });
    }

    // 呼叫 Apify
    const result = await fetchFromApify(username);
    return res.json(result);
  } catch (err) {
    console.error('❌ 發生錯誤：', err);
    return res.status(500).json({ error: '伺服器錯誤', message: err.message });
  }
});

async function fetchFromApify(username) {
  // 呼叫 run-sync-get-dataset-items，直接回傳 dataset
  const url = `https://api.apify.com/v2/actor-tasks/fish891016~instagram-followers-count-scraper-task/run-sync-get-dataset-items?token=${process.env.APIFY_API_KEY}`;

  // 正確的 input 格式：不包裹在 "input" 下，直接送 actor input
  const payload = {
    // 注意：這邊的欄位要用 actor 要求的名稱
    usernames: [username],
    resultsLimit: 1,
    includeFollowers: false,
    includeFollowing: false,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Apify 請求失敗 (${response.status})`);
  }

  const data = await response.json();
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('Apify 回傳資料格式異常或查無資料');
  }

  const item = data[0];
  return {
    userName:    // 可能是 item.userName，也保留舊 key 兼容
      item.userName || item.username || username,
    userFullName:
      item.userFullName || item.fullName || '',
    userId:
      item.userId || item.id || '',
    profilePic:
      item.profilePic || item.profilePicUrl || '',
    userUrl:
      item.userUrl || `https://www.instagram.com/${item.userName || item.username || username}`,
    followersCount:
      item.followersCount || 0,
    followsCount:
      item.followsCount || 0,
    timestamp:
      item.timestamp || new Date().toISOString(),
  };
}

app.listen(PORT, () => {
  console.log(`✅ Server is running at http://localhost:${PORT}`);
});
