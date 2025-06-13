require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 10000;

// 信任代理（重要！）
app.set('trust proxy', true);

// IP 限流：每小時最多 5 次
const limiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: '請求過於頻繁，請稍後再試。' },
  standardHeaders: true,
  legacyHeaders: false,
  // 確保使用正確的 IP
  keyGenerator: (req) => {
    // 優先使用 X-Forwarded-For 標頭
    return req.headers['x-forwarded-for']?.split(',')[0].trim() || 
           req.headers['x-real-ip'] || 
           req.connection.remoteAddress || 
           req.ip;
  }
});

app.use(cors());
app.use(express.json());

// 測試路由
app.get('/', (req, res) => {
  res.send('✅ IG Proxy Server Online');
});

// 除錯路由：查看 IP 資訊
app.get('/debug-ip', (req, res) => {
  res.json({
    ip: req.ip,
    ips: req.ips,
    headers: {
      'x-forwarded-for': req.headers['x-forwarded-for'],
      'x-real-ip': req.headers['x-real-ip'],
      'x-forwarded-proto': req.headers['x-forwarded-proto'],
      'cf-connecting-ip': req.headers['cf-connecting-ip']  // Cloudflare
    },
    remoteAddress: req.connection.remoteAddress
  });
});

// 主 API 路由（套用限流）
app.get('/instagram-followers', limiter, async (req, res) => {
  // 記錄請求資訊（除錯用）
  console.log('請求來自 IP:', req.ip);
  console.log('X-Forwarded-For:', req.headers['x-forwarded-for']);
  
  try {
    const { username } = req.query;
    const authHeader = req.headers['x-ksd-auth'];
    const origin = req.get('origin') || '';

    if (!username || typeof username !== 'string') {
      return res.status(400).json({ error: '缺少 username 參數' });
    }
    if (authHeader !== process.env.KSD_SECRET) {
      return res.status(401).json({ error: '未授權的請求' });
    }
    const whitelist = (process.env.CLIENT_WHITELIST || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    if (!whitelist.some(domain => origin.includes(domain))) {
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
  const TASK_ID = 'fish891016~instagram-followers-count-scraper-task';
  const token = process.env.APIFY_API_KEY;
  const url = `https://api.apify.com/v2/actor-tasks/${TASK_ID}/run-sync-get-dataset-items?token=${token}&clean=1`;

  const payload = {
    usernames: [username],
    resultsLimit: 1,
    includeFollowers: true,
    includeFollowing: true
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
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
    userName:       item.userName     || item.username       || username,
    userFullName:   item.userFullName || item.fullName       || '',
    userId:         item.userId       || item.id             || '',
    profilePic:     item.profilePic   || item.profilePicUrl  || '',
    userUrl:        item.userUrl      || `https://www.instagram.com/${item.userName || item.username || username}`,
    followersCount: item.followersCount || 0,
    followsCount:   item.followsCount   || 0,
    timestamp:      item.timestamp    || new Date().toISOString()
  };
}

app.listen(PORT, () => {
  console.log(`✅ Server is running at http://localhost:${PORT}`);
});