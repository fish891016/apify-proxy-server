const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const app = express();
const port = process.env.PORT || 3000;

// 🧠 IP 限制記錄區
const ipRateLimitMap = new Map();
function isIpRateLimited(ip) {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000;
  const limit = 5;
  const history = ipRateLimitMap.get(ip) || [];
  const recent = history.filter(ts => now - ts < windowMs);
  if (recent.length >= limit) return true;
  recent.push(now);
  ipRateLimitMap.set(ip, recent);
  return false;
}

// ✅ 基本中介軟體
app.use(cors());
app.use(express.json());

// 📡 主 API 路由
app.get('/instagram-followers', async (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  // 限制同 IP 請求次數
  if (isIpRateLimited(ip)) {
    return res.status(429).json({ error: '請求過於頻繁，請稍後再試。' });
  }

  // Header 金鑰檢查
  const authHeader = req.headers['x-ksd-auth'];
  if (!authHeader || authHeader !== 'ksd_secret_2025') {
    return res.status(403).json({ error: '未授權的請求' });
  }

  const username = req.query.username;
  if (!username) {
    return res.status(400).json({ error: '缺少 username 參數' });
  }

  try {
    const apiKey = process.env.APIFY_API_TOKEN || 'apify_api_TUggrdG6k3oiw9kTSTKArd5dfmraPP1XVL3x';
    const actorTaskId = 'apify/instagram-followers-count-scraper';

    // 啟動任務並等待完成
    const runResponse = await fetch(`https://api.apify.com/v2/acts/${actorTaskId}/runs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        input: { usernames: [username] },
        waitForFinish: true
      })
    });

    const runData = await runResponse.json();
    const { defaultDatasetId } = runData.data || {};

    if (!defaultDatasetId) {
      return res.status(500).json({ error: '任務執行失敗或未產生資料集' });
    }

    // 取得資料集
    const datasetRes = await fetch(`https://api.apify.com/v2/datasets/${defaultDatasetId}/items?format=json`, {
      headers: {
        Authorization: `Bearer ${apiKey}`
      }
    });
    const dataset = await datasetRes.json();

    if (!dataset || !dataset.length) {
      return res.status(404).json({ error: '查無用戶資料' });
    }

    const user = dataset[0];
    res.json({
      userName: user.username,
      userFullName: user.fullName,
      userId: user.userId,
      profilePic: user.profilePicUrl,
      userUrl: user.profileUrl,
      followersCount: user.followers,
      followsCount: user.following,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('API 錯誤:', err.message);
    res.status(500).json({ error: '伺服器錯誤，請稍後再試' });
  }
});

// 🏠 主頁測試路由
app.get('/', (req, res) => {
  res.send('✅ Instagram Followers Proxy Server 運作中');
});

app.listen(port, () => {
  console.log(`✅ Server is running at http://localhost:${port}`);
});