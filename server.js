const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 10000;

// 限流設定：每 IP 每小時最多 5次
const limiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: '請求過於頻繁，請稍後再試。' }
});

app.use(limiter);
app.use(cors());

// 健康檢查用
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

    const whitelist = (process.env.CLIENT_WHITELIST || '')
      .split(',')
      .map(s => s.trim());

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
  const url = `https://api.apify.com/v2/actor-tasks/fish891016~instagram-followers-count-scraper-task/run-sync?token=${process.env.APIFY_API_KEY}`;

  const payload = {
    input: {
      instagramUsernames: [username]
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
  const item = data.data?.[0];
  if (!item) throw new Error('Apify 回傳資料異常或查無資料');

  return {
    userName: item.username || username,
    userFullName: item.fullName || '',
    userId: item.id || '',
    profilePic: item.profilePicUrl || '',
    userUrl: `https://instagram.com/${item.username}`,
    followersCount: item.followersCount || 0,
    followsCount: item.followsCount || 0,
    timestamp: new Date().toISOString()
  };
}

app.listen(PORT, () => {
  console.log(`✅ Server is running at http://localhost:${PORT}`);
});
