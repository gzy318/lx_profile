/**
 * LX Profile - V11.0 (China Mainland Native SSR Edition)
 * 核心升级：
 * 1. 年份进度条改为“服务端渲染”，打开页面瞬间即显示，无需等待 JS。
 * 2. 移除所有外部 CDN (Tailwind, Fonts)，样式全部内嵌，国内秒开。
 * 3. 字体强制使用系统本地字体，杜绝网络阻塞。
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

// 获取配置工具
async function getConfig(db: D1Database, key: string) {
  try { return await db.prepare("SELECT value FROM config WHERE key = ?").bind(key).first('value') } catch (e) { return null }
}

// ------ CSS 样式表 (纯手写，0kb网络请求) ------
const css = `
:root {
  --bg: #f5f7fa; --text: #1f2937; --text-sub: #6b7280;
  --card: rgba(255, 255, 255, 0.85); --border: rgba(255, 255, 255, 0.6);
  --accent: #2563eb; --accent-hover: #1d4ed8;
  --shadow: 0 8px 30px rgba(0,0,0,0.06);
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0f172a; --text: #f3f4f6; --text-sub: #9ca3af;
    --card: rgba(30, 41, 59, 0.7); --border: rgba(255, 255, 255, 0.08);
    --accent: #60a5fa; --accent-hover: #93c5fd;
    --shadow: 0 8px 30px rgba(0,0,0,0.4);
  }
}
.dark-mode {
    --bg: #0f172a; --text: #f3f4f6; --text-sub: #9ca3af; --card: rgba(30, 41, 59, 0.7); --border: rgba(255, 255, 255, 0.08); --accent: #60a5fa; --shadow: 0 8px 30px rgba(0,0,0,0.4);
}
.light-mode {
    --bg: #f5f7fa; --text: #1f2937; --text-sub: #6b7280; --card: rgba(255, 255, 255, 0.85); --border: rgba(255, 255, 255, 0.6); --accent: #2563eb; --shadow: 0 8px 30px rgba(0,0,0,0.06);
}

* { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
body {
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", "Segoe UI", sans-serif;
  background-color: var(--bg); color: var(--text);
  min-height: 100vh; display: flex; flex-direction: column; align-items: center; padding: 20px;
  transition: background 0.3s, color 0.3s;
}
.bg-fixed { position: fixed; inset: 0; z-index: -1; background-size: cover; background-position: center; transition: filter 0.3s; }
body.dark-mode .bg-fixed, @media (prefers-color-scheme: dark) { body:not(.light-mode) .bg-fixed { filter: brightness(0.4) saturate(0.8); } }

.main-container { width: 100%; max-width: 480px; animation: fadeUp 0.5s ease-out; }
@keyframes fadeUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }

/* 卡片 */
.glass {
  background: var(--card); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--border); border-radius: 24px; padding: 24px; margin-bottom: 20px;
  box-shadow: var(--shadow); text-align: center;
}

/* 顶部 */
.top-bar { display: flex; justify-content: space-between; margin-bottom: 16px; }
.status-pill {
  background: var(--card); border: 1px solid var(--border); padding: 6px 14px; border-radius: 50px;
  font-size: 12px; font-weight: bold; display: flex; align-items: center; gap: 8px; backdrop-filter: blur(10px);
}
.icon-btn {
  width: 32px; height: 32px; border-radius: 50%; border: 1px solid var(--border); background: var(--card);
  display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 14px;
}

/* 头像与信息 */
.avatar { width: 90px; height: 90px; border-radius: 50%; object-fit: cover; margin-bottom: 12px; transition: transform 0.6s; border: 3px solid rgba(255,255,255,0.2); }
.avatar:hover { transform: rotate(360deg); }
.title { font-size: 22px; font-weight: 800; margin-bottom: 4px; letter-spacing: -0.5px; }
.bio { font-size: 13px; color: var(--text-sub); margin-bottom: 20px; min-height: 18px; }

/* 社交图标 */
.socials { display: flex; justify-content: center; gap: 18px; margin-bottom: 24px; align-items: center; }
.social-link { width: 24px; height: 24px; color: var(--text-sub); transition: color 0.2s, transform 0.2s; }
.social-link:hover { color: var(--accent); transform: scale(1.1); }
.email-btn { background: var(--text); color: var(--bg); padding: 8px 20px; border-radius: 12px; font-size: 12px; font-weight: bold; text-decoration: none; }

/* 进度条 (服务端渲染核心样式) */
.progress-container { background: rgba(128,128,128,0.1); border-radius: 8px; padding: 12px; border: 1px solid var(--border); }
.progress-labels { display: flex; justify-content: space-between; font-size: 10px; font-weight: bold; text-transform: uppercase; margin-bottom: 6px; opacity: 0.7; }
.progress-track { width: 100%; height: 6px; background: rgba(128,128,128,0.15); border-radius: 4px; overflow: hidden; }
.progress-fill { height: 100%; background: var(--accent); border-radius: 4px; transition: width 0.5s; }

/* 搜索与标签 */
.search { width: 100%; padding: 12px 16px; border-radius: 16px; border: 1px solid var(--border); background: var(--card); color: var(--text); font-size: 14px; margin-bottom: 16px; outline: none; }
.tags { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; margin-bottom: 12px; justify-content: center; }
.tag { padding: 5px 12px; border-radius: 20px; font-size: 11px; font-weight: bold; border: 1px solid var(--border); background: var(--card); color: var(--text-sub); cursor: pointer; white-space: nowrap; }
.tag.active { background: var(--accent); color: #fff; border-color: var(--accent); }

/* 链接列表 */
.links { display: flex; flex-direction: column; gap: 12px; }
.link-card {
  display: flex; align-items: center; gap: 14px; padding: 14px;
  background: var(--card); border: 1px solid var(--border); border-radius: 18px;
  text-decoration: none; color: inherit; transition: transform 0.2s, background 0.2s;
  position: relative;
}
.link-card:active { transform: scale(0.98); }
.link-card:hover { transform: translateY(-3px); background: rgba(255,255,255,0.95); z-index: 5; }
.dark-mode .link-card:hover, @media (prefers-color-scheme: dark) { body:not(.light-mode) .link-card:hover { background: rgba(50,50,50,0.9); } }

.link-icon { width: 42px; height: 42px; border-radius: 10px; background: rgba(128,128,128,0.1); flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 20px; overflow: hidden; }
.link-icon img { width: 100%; height: 100%; object-fit: cover; }
.link-info { flex: 1; min-width: 0; text-align: left; }
.link-title { font-weight: bold; font-size: 14px; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.link-desc { font-size: 11px; color: var(--text-sub); opacity: 0.8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.link-badge { font-size: 9px; padding: 2px 5px; background: rgba(37,99,235,0.1); color: var(--accent); border-radius: 4px; margin-left: 6px; }
.copy-btn { width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border-radius: 8px; border: none; background: transparent; cursor: pointer; opacity: 0; transition: opacity 0.2s; color: var(--text-sub); }
.link-card:hover .copy-btn { opacity: 1; }
.copy-btn:hover { background: rgba(37,99,235,0.1); color: var(--accent); }

/* 页脚 */
.footer { margin-top: 40px; text-align: center; padding-bottom: 30px; }
.stats { display: inline-flex; gap: 8px; background: rgba(0,0,0,0.8); color: #fff; padding: 6px 16px; border-radius: 50px; font-size: 11px; font-weight: bold; margin-bottom: 12px; backdrop-filter: blur(4px); }
.admin-link { font-size: 10px; color: var(--text-sub); text-decoration: none; text-transform: uppercase; letter-spacing: 1px; font-weight: bold; opacity: 0.5; }

/* 弹窗 */
.toast { position: fixed; top: 20px; left: 50%; transform: translateX(-50%) translateY(-50px); background: #10b981; color: #fff; padding: 8px 24px; border-radius: 30px; font-size: 12px; font-weight: bold; z-index: 100; transition: transform 0.3s; box-shadow: 0 5px 15px rgba(16,185,129,0.3); }
.toast.show { transform: translateX(-50%) translateY(0); }
.qr-modal { position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 90; display: none; align-items: center; justify-content: center; backdrop-filter: blur(5px); }
.qr-box { background: #fff; padding: 20px; border-radius: 20px; text-align: center; }

/* 后台简化样式 */
.admin-body { background: #111; color: #eee; font-family: sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
.admin-card { background: #222; border: 1px solid #333; padding: 20px; border-radius: 12px; margin-bottom: 20px; }
.admin-input { width: 100%; background: #000; border: 1px solid #333; color: #fff; padding: 10px; margin-bottom: 10px; border-radius: 6px; }
.admin-btn { width: 100%; padding: 10px; background: #2563eb; color: #fff; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; }
.row { display: flex; gap: 10px; align-items: center; border-bottom: 1px solid #333; padding: 10px 0; }
`;

// ------ 1. 前台主页 ------
app.get('/', async (c) => {
  const startTime = Date.now();
  if (!c.env.DB) return c.text('Critical Error: Database Not Bound', 500)

  // 1. 获取地理位置 (服务端直接获取，极速)
  const city = c.req.raw.cf?.city || 'Earth'
  
  // 2. 并发拉取数据
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

  // 3. 统计逻辑
  c.executionCtx.waitUntil(c.env.DB.prepare("UPDATE config SET value = CAST(value AS INTEGER) + 1 WHERE key = 'views'").run())
  const daysRunning = Math.floor((Date.now() - new Date(startDate as string || '2025-01-01').getTime()) / 86400000)
  
  // 4. 服务端计算年份进度 (SSR 核心)
  // 在服务器直接算出百分比，浏览器收到 HTML 时直接渲染，无需 JS 计算
  const now = new Date();
  const currentYear = now.getFullYear();
  const startOfYear = new Date(currentYear, 0, 1).getTime();
  const endOfYear = new Date(currentYear + 1, 0, 1).getTime();
  const yearPercent = ((now.getTime() - startOfYear) / (endOfYear - startOfYear) * 100).toFixed(1);

  // 5. 标签处理
  const rawTags = linksResult.results.map((l: any) => l.tag ? l.tag.trim() : '').filter((t: string) => t !== '');
  const tags = ['全部', ...new Set(rawTags)];

  const favicon = "https://twbk.cn/wp-content/uploads/2025/12/tx.png"

  return c.html(`
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0">
      <title>${siteTitle || 'LX Profile'}</title>
      <link rel="icon" href="${favicon}">
      <style>${css}</style>
    </head>
    <body>
      <div class="bg-fixed" style="${bgUrl ? `background-image: url('${bgUrl}');` : 'background-color: #f5f7fa;'}"></div>
      
      <div class="main-container">
        
        <!-- 顶部信息 -->
        <div class="top-bar">
           <div class="status-pill">
              <span id="clock">00:00</span>
              <span style="opacity:0.3">|</span>
              <span>📍 ${city}</span>
           </div>
           <div style="display:flex; gap:10px;">
              ${music ? `<button class="icon-btn" onclick="toggleMusic()" id="music-btn">🎵<audio id="bg-audio" src="${music}" loop></audio></button>` : ''}
              <button class="icon-btn" onclick="toggleTheme()">🌗</button>
           </div>
        </div>

        <!-- 公告栏 -->
        ${notice ? `<div class="glass" style="padding:12px; text-align:left; border-left:4px solid var(--accent); margin-bottom:20px; font-size:13px; font-weight:bold; color:var(--accent); white-space:nowrap; overflow:hidden;"><div style="animation: marquee 10s linear infinite;">🔔 ${notice}</div></div>` : ''}

        <!-- 个人资料卡片 -->
        <div class="glass">
           <img src="/avatar" onerror="this.src='${favicon}'" class="avatar">
           <h1 class="title">${siteTitle}</h1>
           <p class="bio" id="bio-text"></p>
           
           <!-- 社交按钮区 -->
           <div class="socials">
              ${github ? `<a href="${github}" target="_blank" class="social-link"><svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.065 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.475-1.335-5.475-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg></a>` : ''}
              ${qq ? `<a href="tencent://AddContact/?fromId=45&subcmd=all&uin=${qq}" class="social-link"><svg viewBox="0 0 1024 1024" fill="currentColor" width="100%" height="100%"><path d="M824.8 613.2c-16-51.4-34.4-94.6-62.7-165.3C766.5 262.2 689.3 112 511.5 112 331.7 112 256.4 265.2 261 447.9c-28.4 70.8-46.7 113.7-62.7 165.3-34 109.5-23 154.8-14.6 155.8 18 2.2 70.1-82.4 70.1-82.4 0 49 25.2 112.9 79.8 159-26.4 8.1-85.7 29.9-71.6 53.8 11.4 19.3 196.2 12.3 249.5 6.3 53.3 6 238.1 13 249.5-6.3 14.1-23.8-45.2-45.7-71.6-53.8 54.6-46.2 79.8-110.1 79.8-159 0 0 52.1 84.6 70.1 82.4 8.5-1.1 19.5-46.4-14.5-155.8z"/></svg></a>` : ''}
              <a href="mailto:${email}" class="email-btn">联系我</a>
           </div>

           <!-- 进度条 (SSR直出，打开即显示，无需等待) -->
           <div class="progress-container">
              <div class="progress-labels">
                 <span>${currentYear} Year Progress</span>
                 <span>${yearPercent}%</span>
              </div>
              <div class="progress-track">
                 <div class="progress-fill" style="width: ${yearPercent}%"></div>
              </div>
           </div>
        </div>

        <!-- 标签筛选 -->
        <div class="tags">
           ${tags.map((tag: string) => `<button class="tag ${tag==='全部'?'active':''}" onclick="filter('${tag}', this)">${tag}</button>`).join('')}
        </div>

        <!-- 搜索 -->
        <input type="text" class="search" placeholder="🔍 搜索..." onkeyup="search(this.value)">

        <!-- 链接列表 -->
        <div class="links" id="list">
          ${linksResult.results.map((link: any) => `
            <a href="${link.url}" target="_blank" class="link-card" data-tag="${link.tag || ''}" data-search="${link.title} ${link.description}">
              <div class="link-icon">
                 ${!link.icon 
                   ? `<img src="https://api.iowen.cn/favicon/${new URL(link.url).hostname}.png" loading="lazy">` 
                   : (link.icon.startsWith('http') ? `<img src="${link.icon}" loading="lazy">` : link.icon)}
              </div>
              <div class="link-info">
                 <div class="link-title">${link.title} ${link.tag ? `<span class="link-badge">${link.tag}</span>` : ''}</div>
                 <div class="link-desc">${link.description || link.url}</div>
              </div>
              <button class="copy-btn" onclick="copy('${link.url}', event)">📋</button>
            </a>
          `).join('')}
        </div>

        <!-- 页脚 -->
        <div class="footer">
           <div class="stats">
              <span>👀 ${views}</span>
              <span style="opacity:0.3">|</span>
              <span>⏳ ${daysRunning} 天</span>
              <span style="opacity:0.3">|</span>
              <span>⚡ <span id="perf">0</span>ms</span>
           </div>
           <div><a href="/admin" class="admin-link">管理后台</a></div>
        </div>
      </div>

      <!-- 吐司与弹窗 -->
      <div id="toast" class="toast">✅ 已复制</div>
      <div id="qr-modal" class="qr-modal" onclick="this.style.display='none'"><div class="qr-box" onclick="event.stopPropagation()"><img src="https://api.pwmqr.com/qrcode/create/?url=https://${c.req.header('host')}" style="width:200px;height:200px;border-radius:10px;"><p style="margin-top:10px;font-size:12px;font-weight:bold;">扫码访问</p></div></div>

      <!-- 交互脚本 (不影响首屏显示) -->
      <script>
        // 1. 计算耗时
        document.getElementById('perf').innerText = Date.now() - ${startTime};

        // 2. 打字机
        const bio = "${bio || 'Hello World'}";
        const el = document.getElementById('bio-text');
        let i=0; (function t(){if(i<bio.length){el.innerText+=bio.charAt(i++);setTimeout(t,50)}})();

        // 3. 时钟
        setInterval(()=>document.getElementById('clock').innerText=new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}),1000);

        // 4. 筛选与搜索
        const items = document.querySelectorAll('.link-card');
        function filter(tag, btn) {
           document.querySelectorAll('.tag').forEach(b => b.classList.remove('active'));
           btn.classList.add('active');
           items.forEach(el => el.style.display = (tag==='全部'||el.dataset.tag===tag)?'flex':'none');
        }
        function search(val) {
           val = val.toLowerCase();
           items.forEach(el => el.style.display = el.dataset.search.toLowerCase().includes(val)?'flex':'none');
        }

        // 5. 复制
        function copy(url, e) {
           e.preventDefault(); e.stopPropagation();
           navigator.clipboard.writeText(url);
           const t = document.getElementById('toast');
           t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),2000);
        }

        // 6. 主题与音乐
        function toggleTheme() {
           document.body.classList.toggle('dark-mode');
           document.body.classList.toggle('light-mode');
        }
        function toggleMusic() {
           const a = document.getElementById('bg-audio');
           const b = document.getElementById('music-btn');
           if(a.paused){a.play();b.style.transform='rotate(360deg)'}else{a.pause();b.style.transform='none'}
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

// ------ 后台管理 (纯 CSS 轻量版) ------
app.get('/admin', async (c) => {
  const cookie = getCookie(c, 'auth')
  if (cookie !== 'true') return c.html(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{background:#111;color:#eee;font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh}form{background:#222;padding:30px;border-radius:10px;text-align:center;width:300px;border:1px solid #333}input{width:100%;padding:10px;margin:10px 0;background:#000;border:1px solid #333;color:#fff;border-radius:5px}button{width:100%;padding:10px;background:#2563eb;color:#fff;border:none;border-radius:5px;cursor:pointer;font-weight:bold}</style></head><body><form action="/api/login" method="post"><h2>🔒 管理员登录</h2><input type="password" name="password" placeholder="请输入密码"><button>进入后台</button></form></body></html>`)

  const editId = c.req.query('edit_id')
  let editLink = null
  if (editId) editLink = await c.env.DB.prepare("SELECT * FROM links WHERE id = ?").bind(editId).first()
  
  const links = await c.env.DB.prepare('SELECT * FROM links ORDER BY sort_order ASC, created_at DESC').all();
  const configKeys = ['bio','email','qq','bg_url','site_title','status','start_date','notice','github','telegram','music_url'];
  const config = {};
  for(const k of configKeys) { config[k] = await getConfig(c.env.DB, k) || ''; }

  return c.html(`
    <!DOCTYPE html>
    <html>
    <head>
      <
