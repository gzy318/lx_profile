/**
 * LX Profile - V10.0 (Native Zero-Dependency Edition)
 * 1. 0 CDN: 移除 Tailwind, 移除所有外部 CSS/JS 库
 * 2. 纯手写 CSS: 极致轻量，国内秒开
 * 3. 稳健的年份进度逻辑
 */
import { Hono } from 'hono'
import { handle } from 'hono/cloudflare-pages'
import { setCookie, getCookie } from 'hono/cookie'

interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
  ADMIN_PASSWORD?: string;
}

const app = new Hono<{ Bindings: Env }>()

async function getConfig(db: D1Database, key: string) {
  try { return await db.prepare("SELECT value FROM config WHERE key = ?").bind(key).first('value') } catch (e) { return null }
}

// ------ CSS 样式表 (内置，无需下载) ------
const globalStyle = `
:root {
  --bg-color: #f5f7fa;
  --text-main: #333;
  --text-sub: #666;
  --card-bg: rgba(255, 255, 255, 0.85);
  --glass-border: rgba(255, 255, 255, 0.6);
  --accent: #2563eb;
  --accent-hover: #1d4ed8;
  --pill-bg: rgba(0,0,0,0.8);
  --pill-text: #fff;
  --shadow: 0 8px 30px rgba(0,0,0,0.08);
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg-color: #050505;
    --text-main: #eee;
    --text-sub: #aaa;
    --card-bg: rgba(20, 20, 20, 0.8);
    --glass-border: rgba(255, 255, 255, 0.1);
    --accent: #3b82f6;
    --accent-hover: #60a5fa;
    --pill-bg: rgba(255,255,255,0.15);
    --pill-text: #fff;
    --shadow: 0 8px 30px rgba(0,0,0,0.5);
  }
}
.dark-mode-force {
    --bg-color: #050505; --text-main: #eee; --text-sub: #aaa; --card-bg: rgba(20, 20, 20, 0.8); --glass-border: rgba(255, 255, 255, 0.1); --shadow: 0 8px 30px rgba(0,0,0,0.5);
}
.light-mode-force {
    --bg-color: #f5f7fa; --text-main: #333; --text-sub: #666; --card-bg: rgba(255, 255, 255, 0.85); --glass-border: rgba(255, 255, 255, 0.6); --shadow: 0 8px 30px rgba(0,0,0,0.08);
}

* { box-sizing: border-box; margin: 0; padding: 0; outline: none; -webkit-tap-highlight-color: transparent; }
body {
  font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif;
  background-color: var(--bg-color);
  color: var(--text-main);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  transition: background-color 0.3s;
}
.bg-img {
  position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: -1;
  background-size: cover; background-position: center; opacity: 1; transition: filter 0.3s;
}
body.dark-mode-force .bg-img, @media (prefers-color-scheme: dark) { body:not(.light-mode-force) .bg-img { filter: brightness(0.4); } }

.container { width: 100%; max-width: 480px; z-index: 1; animation: fadeIn 0.5s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

/* 卡片通用样式 */
.card {
  background: var(--card-bg);
  backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--glass-border);
  border-radius: 24px;
  padding: 24px;
  margin-bottom: 20px;
  box-shadow: var(--shadow);
  text-align: center;
}

/* 顶部栏 */
.top-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.status-pill {
  background: var(--card-bg); backdrop-filter: blur(10px); border: 1px solid var(--glass-border);
  padding: 8px 16px; border-radius: 50px; font-size: 12px; font-weight: bold;
  display: flex; align-items: center; gap: 10px;
}
.icon-btn {
  width: 36px; height: 36px; border-radius: 50%; border: 1px solid var(--glass-border);
  background: var(--card-bg); display: flex; align-items: center; justify-content: center;
  cursor: pointer; font-size: 16px; transition: transform 0.2s;
}
.icon-btn:active { transform: scale(0.9); }

/* 公告 */
.notice-bar {
  background: var(--card-bg); border-radius: 12px; padding: 10px 16px; margin-bottom: 20px;
  border-left: 4px solid var(--accent); overflow: hidden; white-space: nowrap; font-size: 14px; color: var(--accent); font-weight: bold;
}

/* 头像区 */
.avatar-box { width: 100px; height: 100px; margin: 0 auto 16px; position: relative; }
.avatar-img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; transition: transform 0.5s; }
.avatar-img:hover { transform: rotate(360deg); }
.status-dot { position: absolute; bottom: 5px; right: 5px; width: 16px; height: 16px; background: #22c55e; border: 3px solid #fff; border-radius: 50%; }

/* 社交区 */
.social-row { display: flex; justify-content: center; gap: 20px; margin: 20px 0; align-items: center; }
.social-icon { width: 24px; height: 24px; color: var(--text-sub); transition: color 0.2s; }
.social-icon:hover { color: var(--accent); }
.email-btn {
  background: var(--text-main); color: var(--bg-color); padding: 8px 20px; border-radius: 12px;
  text-decoration: none; font-size: 12px; font-weight: bold; display: inline-block;
}

/* 进度条 */
.progress-box { background: rgba(128,128,128,0.1); border-radius: 8px; padding: 12px; margin-top: 10px; }
.progress-header { display: flex; justify-content: space-between; font-size: 10px; font-weight: bold; text-transform: uppercase; margin-bottom: 5px; opacity: 0.7; }
.progress-track { width: 100%; height: 6px; background: rgba(128,128,128,0.1); border-radius: 3px; overflow: hidden; }
.progress-fill { height: 100%; background: var(--accent); border-radius: 3px; width: 0%; transition: width 1s ease; }

/* 标签 */
.tags-scroll { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 10px; margin-bottom: 10px; -ms-overflow-style: none; scrollbar-width: none; justify-content: center;}
.tags-scroll::-webkit-scrollbar { display: none; }
.tag-btn {
  background: var(--card-bg); border: 1px solid var(--glass-border); padding: 6px 14px; border-radius: 20px;
  font-size: 12px; font-weight: bold; cursor: pointer; white-space: nowrap; transition: all 0.2s; color: var(--text-main);
}
.tag-btn.active { background: var(--accent); color: #fff; border-color: var(--accent); }

/* 搜索 */
.search-input {
  width: 100%; padding: 14px 20px; border-radius: 16px; border: 1px solid var(--glass-border);
  background: var(--card-bg); color: var(--text-main); font-size: 14px; margin-bottom: 20px;
  backdrop-filter: blur(10px);
}

/* 链接列表 */
.link-list { display: flex; flex-direction: column; gap: 12px; }
.link-item {
  display: flex; align-items: center; gap: 15px; padding: 15px;
  background: var(--card-bg); border: 1px solid var(--glass-border); border-radius: 16px;
  text-decoration: none; color: inherit; transition: transform 0.2s, background 0.2s; position: relative;
}
.link-item:active { transform: scale(0.98); }
.link-item:hover { transform: translateY(-3px); background: rgba(255,255,255,0.95); z-index: 2; }
.dark-mode-force .link-item:hover, @media (prefers-color-scheme: dark) { body:not(.light-mode-force) .link-item:hover { background: rgba(60,60,60,0.9); } }

.link-icon { width: 48px; height: 48px; border-radius: 12px; object-fit: cover; background: rgba(128,128,128,0.1); flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 24px; }
.link-info { flex: 1; min-width: 0; text-align: left; }
.link-title { font-weight: bold; font-size: 15px; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.link-desc { font-size: 11px; color: var(--text-sub); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.link-tag { font-size: 9px; padding: 2px 4px; background: rgba(37,99,235,0.1); color: var(--accent); border-radius: 4px; margin-left: 5px; vertical-align: middle; }
.copy-btn { padding: 8px; border-radius: 8px; border: none; background: transparent; cursor: pointer; opacity: 0.5; }
.copy-btn:hover { background: rgba(37,99,235,0.1); color: var(--accent); opacity: 1; }

/* 页脚 */
.footer { margin-top: 40px; text-align: center; padding-bottom: 40px; }
.footer-row { display: flex; justify-content: center; gap: 10px; margin-bottom: 15px; flex-wrap: wrap;}
.pill {
  background: var(--pill-bg); color: var(--pill-text); padding: 6px 14px; border-radius: 50px;
  font-size: 11px; font-weight: bold; backdrop-filter: blur(4px); border: 1px solid rgba(255,255,255,0.2);
}
.admin-link { color: var(--text-sub); font-size: 10px; text-transform: uppercase; letter-spacing: 1px; text-decoration: none; font-weight: bold; opacity: 0.5; }
.admin-link:hover { opacity: 1; color: var(--accent); }

/* 弹窗 */
.modal { position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 100; display: flex; align-items: center; justify-content: center; opacity: 0; pointer-events: none; transition: opacity 0.3s; backdrop-filter: blur(5px); }
.modal.show { opacity: 1; pointer-events: auto; }
.modal-content { background: #fff; padding: 30px; border-radius: 20px; text-align: center; transform: scale(0.9); transition: transform 0.3s; }
.modal.show .modal-content { transform: scale(1); }
.toast { position: fixed; top: 20px; left: 50%; transform: translateX(-50%) translateY(-50px); background: var(--pill-bg); color: #fff; padding: 8px 20px; border-radius: 30px; font-size: 12px; font-weight: bold; z-index: 200; transition: transform 0.3s; pointer-events: none; border: 1px solid #22c55e; }
.toast.show { transform: translateX(-50%) translateY(0); }

/* 后台简易样式 */
.admin-container { max-width: 800px; margin: 0 auto; padding: 20px; }
.form-group { margin-bottom: 15px; }
.form-label { display: block; font-size: 10px; font-weight: bold; text-transform: uppercase; margin-bottom: 5px; opacity: 0.7; }
.form-input { width: 100%; padding: 10px; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); color: #fff; border-radius: 8px; }
.btn { width: 100%; padding: 12px; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; color: #fff; }
.btn-primary { background: #2563eb; } .btn-danger { background: #dc2626; }
`;

// ------ 前台主页 ------
app.get('/', async (c) => {
  const startTime = Date.now();
  if (!c.env.DB) return c.text('Database Error', 500)

  // 数据获取
  const [linksResult, bio, email, qq, views, bgUrl, siteTitle, status, startDate, notice, github, telegram, music] = await Promise.all([
    c.env.DB.prepare('SELECT * FROM links ORDER BY sort_order ASC, created_at DESC').all(),
    getConfig(c.env.DB, 'bio'),
    getConfig(c.env.DB, 'email'),
    getConfig(c.env.DB, 'qq'),
    getConfig(c.env.DB, 'views'),
    getConfig(c.env.DB, 'bg_url'),
    getConfig(c.env.DB, 'site_title'),
    getConfig(c.env.DB, 'status'),
    getConfig(c.env.DB, 'start_date'),
    getConfig(c.env.DB, 'notice'),
    getConfig(c.env.DB, 'github'),
    getConfig(c.env.DB, 'telegram'),
    getConfig(c.env.DB, 'music_url')
  ])

  // 统计
  c.executionCtx.waitUntil(c.env.DB.prepare("UPDATE config SET value = CAST(value AS INTEGER) + 1 WHERE key = 'views'").run())
  const daysRunning = Math.floor((Date.now() - new Date(startDate as string || '2025-01-01').getTime()) / 86400000)
  
  // 标签处理
  const rawTags = linksResult.results.map((l: any) => l.tag ? l.tag.trim() : '').filter((t: string) => t !== '');
  const tags = ['全部', ...new Set(rawTags)];

  const favicon = "https://twbk.cn/wp-content/uploads/2025/12/tx.png"

  // 纯HTML输出 (无外部引用)
  return c.html(`
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0">
      <title>${siteTitle || '个人主页'}</title>
      <link rel="icon" href="${favicon}">
      <style>${globalStyle}</style>
    </head>
    <body>
      <div class="bg-img" style="${bgUrl ? `background-image: url('${bgUrl}');` : 'background-color: #f5f7fa;'}"></div>
      
      <div class="container">
        
        <!-- 顶部 -->
        <div class="top-bar">
           <div class="status-pill">
              <span id="clock">00:00</span>
              <span style="opacity:0.3">|</span>
              <span id="location">📍 Loading</span>
           </div>
           <div style="display:flex; gap:10px;">
              ${music ? `<button class="icon-btn" onclick="toggleMusic()" id="music-btn">🎵<audio id="bg-audio" src="${music}" loop></audio></button>` : ''}
              <button class="icon-btn" onclick="toggleTheme()" id="theme-btn">🌗</button>
           </div>
        </div>

        <!-- 公告 -->
        ${notice ? `<div class="notice-bar"><div class="marquee-text">🔔 ${notice}</div></div>` : ''}

        <!-- 核心卡片 -->
        <div class="card">
           <div class="avatar-box">
              <img src="/avatar" onerror="this.src='${favicon}'" class="avatar-img">
              ${status === 'online' ? '<div class="status-dot"></div>' : ''}
           </div>
           <h1 style="font-size:24px; margin-bottom:5px;">${siteTitle}</h1>
           <p style="font-size:13px; opacity:0.7; min-height:20px;" id="bio-display"></p>
           
           <!-- 社交 -->
           <div class="social-row">
              ${github ? `<a href="${github}" target="_blank" class="social-icon"><svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.065 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.475-1.335-5.475-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg></a>` : ''}
              ${qq ? `<a href="tencent://AddContact/?fromId=45&subcmd=all&uin=${qq}" class="social-icon"><svg viewBox="0 0 1024 1024" fill="currentColor" width="100%" height="100%"><path d="M824.8 613.2c-16-51.4-34.4-94.6-62.7-165.3C766.5 262.2 689.3 112 511.5 112 331.7 112 256.4 265.2 261 447.9c-28.4 70.8-46.7 113.7-62.7 165.3-34 109.5-23 154.8-14.6 155.8 18 2.2 70.1-82.4 70.1-82.4 0 49 25.2 112.9 79.8 159-26.4 8.1-85.7 29.9-71.6 53.8 11.4 19.3 196.2 12.3 249.5 6.3 53.3 6 238.1 13 249.5-6.3 14.1-23.8-45.2-45.7-71.6-53.8 54.6-46.2 79.8-110.1 79.8-159 0 0 52.1 84.6 70.1 82.4 8.5-1.1 19.5-46.4-14.5-155.8z"/></svg></a>` : ''}
              <a href="mailto:${email}" class="email-btn">Email Me</a>
           </div>

           <!-- 年份进度 (原生JS，0延迟) -->
           <div class="progress-box">
              <div class="progress-header">
                 <span id="year-label">Year Progress</span>
                 <span id="year-text">0%</span>
              </div>
              <div class="progress-track">
                 <div class="progress-fill" id="year-bar"></div>
              </div>
           </div>
        </div>

        <!-- 标签栏 -->
        <div class="tags-scroll">
           ${tags.map((tag: string) => `<button class="tag-btn ${tag==='全部'?'active':''}" onclick="filter('${tag}', this)">${tag}</button>`).join('')}
        </div>

        <!-- 搜索 -->
        <input type="text" class="search-input" placeholder="🔍 搜索..." onkeyup="search(this.value)">

        <!-- 链接列表 -->
        <div class="link-list" id="list">
          ${linksResult.results.map((link: any) => `
            <a href="${link.url}" target="_blank" class="link-item" data-tag="${link.tag || ''}" data-search="${link.title} ${link.description}">
              <div class="link-icon">
                 ${!link.icon 
                   ? `<img src="https://api.iowen.cn/favicon/${new URL(link.url).hostname}.png" loading="lazy" style="width:24px;height:24px;">` 
                   : (link.icon.startsWith('http') ? `<img src="${link.icon}" style="width:100%;height:100%;object-fit:cover;border-radius:12px;">` : link.icon)}
              </div>
              <div class="link-info">
                 <div class="link-title">${link.title} ${link.tag ? `<span class="link-tag">${link.tag}</span>` : ''}</div>
                 <div class="link-desc">${link.description || link.url}</div>
              </div>
              <button class="copy-btn" onclick="copy('${link.url}', event)">📋</button>
            </a>
          `).join('')}
        </div>

        <!-- 页脚 -->
        <div class="footer">
           <div class="footer-row">
              <span class="pill">👀 ${views}</span>
              <span class="pill">⏳ ${daysRunning} 天</span>
           </div>
           <div><a href="/admin" class="admin-link">Admin Panel</a></div>
        </div>
      </div>

      <!-- 吐司提示 -->
      <div id="toast" class="toast">✅ 已复制</div>

      <!-- 极速原生脚本 -->
      <script>
        // 1. 年份进度 (核心修复)
        function updateYear() {
           const now = new Date();
           const year = now.getFullYear();
           const start = new Date(year, 0, 1);
           const end = new Date(year + 1, 0, 1);
           const pct = ((now - start) / (end - start)) * 100;
           document.getElementById('year-label').innerText = year + '年进度';
           document.getElementById('year-text').innerText = pct.toFixed(1) + '%';
           document.getElementById('year-bar').style.width = pct + '%';
        }
        updateYear(); // 立即执行

        // 2. 基础交互
        const list = document.getElementById('list');
        const items = list.querySelectorAll('.link-item');

        function filter(tag, btn) {
           document.querySelectorAll('.tag-btn').forEach(b => b.classList.remove('active'));
           btn.classList.add('active');
           items.forEach(el => {
              const hasTag = el.getAttribute('data-tag') === tag;
              el.style.display = (tag === '全部' || hasTag) ? 'flex' : 'none';
           });
        }

        function search(val) {
           val = val.toLowerCase();
           items.forEach(el => {
              const text = el.getAttribute('data-search').toLowerCase();
              el.style.display = text.includes(val) ? 'flex' : 'none';
           });
        }

        function copy(url, e) {
           e.preventDefault(); e.stopPropagation();
           navigator.clipboard.writeText(url);
           const t = document.getElementById('toast');
           t.classList.add('show');
           setTimeout(() => t.classList.remove('show'), 2000);
        }

        // 3. 打字机
        const bio = "${bio || 'Hello World'}";
        const bioEl = document.getElementById('bio-display');
        let i = 0;
        function type() { if(i < bio.length) { bioEl.innerText += bio.charAt(i++); setTimeout(type, 50); } }
        type();

        // 4. 时钟 & 天气 (IP)
        setInterval(() => document.getElementById('clock').innerText = new Date().toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit'}), 1000);
        document.getElementById('location').innerText = '📍 ${city}'; // 直接用服务端数据，不请求外部

        // 5. 主题切换
        function toggleTheme() {
           const b = document.body;
           if (b.classList.contains('dark-mode-force')) {
              b.classList.remove('dark-mode-force'); b.classList.add('light-mode-force');
           } else {
              b.classList.add('dark-mode-force'); b.classList.remove('light-mode-force');
           }
        }
        
        // 6. 音乐
        function toggleMusic() {
           const a = document.getElementById('bg-audio');
           const btn = document.getElementById('music-btn');
           if (a.paused) { a.play(); btn.style.transform = 'rotate(360deg)'; } 
           else { a.pause(); btn.style.transform = 'none'; }
        }
      </script>
    </body>
    </html>
  `)
})

// 头像代理
app.get('/avatar', async (c) => {
  const f = "https://twbk.cn/wp-content/uploads/2025/12/tx.png"
  if(!c.env.BUCKET) return c.redirect(f)
  const o = await c.env.BUCKET.get('avatar.png')
  return o ? new Response(o.body, {headers:{'etag':o.httpEtag}}) : c.redirect(f)
})

// ------ 后台管理 (纯 CSS 版) ------
app.get('/admin', async (c) => {
  const cookie = getCookie(c, 'auth')
  
  if (cookie !== 'true') return c.html(`
    <!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Login</title><style>body{background:#111;color:#eee;font-fami
