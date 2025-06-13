{% if content %}
  <div class="container">
    <div class="row">
      <div class="col-md-8 col-md-offset-2">
        <div class="well {% if site['rtl'] %} rtl-content {% endif %} bg-white-contianer">
          {{ content }}
        </div>
      </div>
    </div>
  </div>
{% endif %}

<script>
const cooldownManager = {
    COOLDOWN_TIME: 60,
    cooldownKey: 'ksdIgFollowerCooldown',
    ipLimitKey: 'ksdIgIpRateLimit',

    getRemainingCooldown: function() {
        const lastSearchTime = localStorage.getItem(this.cooldownKey);
        if (!lastSearchTime) return 0;
        const elapsed = Math.floor((Date.now() - parseInt(lastSearchTime)) / 1000);
        return Math.max(this.COOLDOWN_TIME - elapsed, 0);
    },
    setSearchTime: function() {
        localStorage.setItem(this.cooldownKey, Date.now().toString());
    },
    checkIpRateLimit: function() {
        const recordStr = localStorage.getItem(this.ipLimitKey);
        const now = Date.now();
        const windowMs = 60 * 60 * 1000; // 60 分鐘
        let record = recordStr ? JSON.parse(recordStr) : [];
        record = record.filter(ts => now - ts < windowMs);
        if (record.length >= 5) return false;
        record.push(now);
        localStorage.setItem(this.ipLimitKey, JSON.stringify(record));
        return true;
    }
};

const historyStorage = {
    getHistory: () => JSON.parse(localStorage.getItem('ksdIgFollowerHistory') || '[]'),
    addToHistory: function(data) {
        const history = this.getHistory();
        const item = {
            userName: data.userName,
            userFullName: data.userFullName || '',
            userId: data.userId || '',
            profilePic: data.profilePic || '',
            userUrl: data.userUrl || '',
            followersCount: data.followersCount || 0,
            followsCount: data.followsCount || 0,
            originalTimestamp: data.originalTimestamp || data.timestamp || '',
            formattedTimestamp: data.formattedTimestamp || ''
        };
        const index = history.findIndex(i => i.userName === data.userName);
        if (index !== -1) history[index] = item;
        else {
            history.unshift(item);
            while (history.length > 6) history.pop();
        }
        localStorage.setItem('ksdIgFollowerHistory', JSON.stringify(history));
        this.render();
    },
    saveCurrentDisplayData: data => localStorage.setItem('ksdIgFollowerLastDisplay', JSON.stringify(data)),
    getCurrentDisplayData: () => JSON.parse(localStorage.getItem('ksdIgFollowerLastDisplay') || 'null'),
    render: function() {
        const history = this.getHistory();
        const container = document.getElementById('historyList');
        container.innerHTML = '';
        if (!history.length) return document.getElementById('history').style.display = 'none';
        document.getElementById('history').style.display = 'block';
        history.forEach(item => {
            const div = document.createElement('div');
            div.className = 'ksd-history-item';
            div.innerHTML = `<span class="ksd-history-user">@${item.userName}</span>
                             <span class="ksd-history-count">${item.followersCount.toLocaleString()} 粉絲</span>`;
            div.onclick = () => displayResults({ ...item, isNewSearch: false });
            container.appendChild(div);
        });
    }
};

function formatTimestamp(timestamp) {
    if (!timestamp) return '';
    const clean = timestamp.replace(' - ', ' ');
    const parsed = new Date(clean);
    if (isNaN(parsed)) return '';
    return new Intl.DateTimeFormat('zh-TW', {
        year: 'numeric', month: 'numeric', day: 'numeric',
        hour: 'numeric', minute: '2-digit', hour12: false
    }).format(parsed);
}

function convertInstagramImageUrl(url) {
    if (!url) return null;
    if (url.includes('apifyusercontent.com')) return url;
    return `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
}

async function getInstagramData(username) {
    document.getElementById('loading').style.display = 'block';
    const apiUrl = `https://apify-proxy-server.onrender.com/instagram-followers?username=${encodeURIComponent(username)}`;
    try {
        const response = await fetch(apiUrl, {
            headers: { 'X-KSD-Auth': 'ksd_secret_2025' }
        });
        if (!response.ok) throw new Error(`API請求失敗 (${response.status})`);
        const data = await response.json();
        if (!data) throw new Error('查無用戶資料');
        const now = new Date();
        return {
            ...data,
            isNewSearch: true,
            originalTimestamp: data.timestamp || now.toISOString(),
            formattedTimestamp: formatTimestamp(data.timestamp || now.toISOString())
        };
    } catch (e) {
        throw e;
    } finally {
        document.getElementById('loading').style.display = 'none';
    }
}

function displayResults(data) {
    document.getElementById('displayName').textContent = '@' + data.userName;
    const profilePic = document.getElementById('profilePic');
    profilePic.onerror = () => profilePic.src = `https://via.placeholder.com/100/FF9800/FFFFFF/?text=${data.userName.charAt(0).toUpperCase()}`;
    profilePic.src = convertInstagramImageUrl(data.profilePic) || profilePic.onerror();
    document.getElementById('fullName').textContent = data.userFullName;
    document.getElementById('userId').textContent = '用戶ID: ' + data.userId;
    document.getElementById('profileLink').href = data.userUrl || '#';
    document.getElementById('profileLink').style.display = data.userUrl ? 'inline-flex' : 'none';
    document.getElementById('followersCount').textContent = data.followersCount.toLocaleString();
    document.getElementById('followingCount').textContent = data.followsCount.toLocaleString();
    document.getElementById('lastUpdated').textContent = data.formattedTimestamp;
    document.getElementById('result').style.display = 'block';
    historyStorage.addToHistory(data);
    historyStorage.saveCurrentDisplayData(data);
}

function disableSearchButton() {
    const btn = document.getElementById('checkBtn');
    btn.disabled = true;
    btn.classList.add('disabled');
}
function enableSearchButton() {
    const btn = document.getElementById('checkBtn');
    btn.disabled = false;
    btn.classList.remove('disabled');
}

function restoreLastDisplayIfAny() {
    const last = historyStorage.getCurrentDisplayData();
    if (!last) return;
    last.isNewSearch = false;
    if (!last.formattedTimestamp && last.originalTimestamp)
        last.formattedTimestamp = formatTimestamp(last.originalTimestamp);
    displayResults(last);
}

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('checkBtn').addEventListener('click', async function() {
        const username = document.getElementById('username').value.trim();
        if (!username) return showError('請輸入有效的用戶名');
        const wait = cooldownManager.getRemainingCooldown();
        if (wait > 0) return showError(`請等待 ${wait} 秒後再次搜尋`);
        const allowed = cooldownManager.checkIpRateLimit();
        if (!allowed) return showError('查詢過於頻繁，請稍後再試');

        disableSearchButton();
        hideError();
        document.getElementById('result').style.display = 'none';
        try {
            const data = await getInstagramData(username);
            displayResults(data);
            cooldownManager.setSearchTime();
        } catch (e) {
            showError(`查詢錯誤：${e.message}`);
        } finally {
            enableSearchButton();
        }
    });

    document.getElementById('username').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') document.getElementById('checkBtn').click();
    });

    historyStorage.render();
    restoreLastDisplayIfAny();
    enableSearchButton();
});

function showError(msg) {
    const el = document.getElementById('error');
    el.textContent = msg;
    el.style.display = 'block';
}
function hideError() {
    document.getElementById('error').style.display = 'none';
}
</script>
