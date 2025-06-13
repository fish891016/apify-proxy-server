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
  message: { error: '請求過於頻繁，請稍後再試。' }
});

app.use(limiter);
app.use(cors());

// 測試路由
app.get('/', (req, res) => {
  res.send('✅ IG Proxy Server Online');
});

// 主 API 路由
app.get('/instagram-followers', async (req, res) => {
  try {
    const { username } = req.query;
    const authHeader = req.headers['x-ksd-auth'];
    const origin = req.get('origin') || '';

    if (!username || typeof username !== 'string') {
      return res.status(400).json({ error: '缺少 username' });
    }

    if (authHeader !== process.env.KSD_SECRET) {
      return res.status(401).json({ error: '未授權的請求' });
    }

    const whitelist = (process.env.CLIENT_WHITELIST || '').split(',').map(s => s.trim());
    const isAllowedOrigin = whitelist.some(domain => origin.includes(domain));
    if (!isAllowedOrigin) {
      return res.status(403).json({ error: '來源不在白名單內' });
    }

    const result = await fetchFromApify(username);
    res.json(result);
  } catch (error) {
    console.error('❌ 發生錯誤：', error);
    res.status(500).json({ error: '伺服器錯誤', message: error.message });
  }
});

async function fetchFromApify(username) {
  const url = `https://api.apify.com/v2/actor-tasks/fish891016~instagram-followers-count-scraper-task/run-sync-get-dataset-items?token=${process.env.APIFY_API_KEY}`;

  const payload = {
    input: {
      userId: username,
      resultsLimit: 1,
      includeFollowers: false,
      includeFollowing: false
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' }
  });

  if (!response.ok) {
    throw new Error(`Apify 請求失敗 (${response.status})`);
  }

  const data = await response.json();
  if (!Array.isArray(data) || !data[0]) {
    throw new Error('Apify 回傳資料格式異常或查無資料');
  }

  const item = data[0];

  return {
    userName: item.userName || item.username || username,
    userFullName: item.userFullName || item.fullName || '',
    userId: item.userId || item.id || '',
    profilePic: item.profilePic || item.profilePicUrl || '',
    userUrl: item.userUrl || `https://www.instagram.com/${item.userName || item.username || username}`,
    followersCount: item.followersCount || 0,
    followsCount: item.followsCount || 0,
    timestamp: item.timestamp || new Date().toISOString()
  };
}

app.listen(PORT, () => {
  console.log(`✅ Server is running at http://localhost:${PORT}`);
});
