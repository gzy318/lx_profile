/**
 * LX Profile - V31.0 (The Unified Fix)
 * 1. 修复：暗黑模式切换 (Toggle Theme) 逻辑修正。
 * 2. 修复：秒级时钟 (Clock) 和 访客定位 (Location) 回归。
 * 3. 优化：后台 UI 布局重写，增加间距，防止重叠裁切。
 * 4. 核心：0 CDN，SSR 直出，性能保持极致。
 */
import { Hono } from 'hono'
import { handle } from 'hono/cloudflare-pages'
import { setCookie, getCookie } from 'hono/cookie'

interface Env { DB: D1Database; BUCKET: R2Bucket; ADMIN_PASSWORD?: string; }
const app = new Hono<{ Bindings: Env }>()

async function getConfig(db: D1Database, key: string) {
  try { return await db.prepare("SELECT value FROM config WHERE key = ?").bind(key).first('value') } catch (e) { return null }
}

// ------ 前端 CSS (修复暗黑模式变量) ------
const frontCss = `
:root {
  --bg: #f8fafc; --text: #0f172a; --sub: #64748b;
  --card: rgba(255,255,255,0.85); --border: rgba(255,255,255,0.6);
  --accent: #3b82f6; --shadow: 0 8px 30px rgba(0,0,0,0.08);
}
html.dark {
  --bg: #020617; --text: #f8fafc; --sub: #94a3b8;
  --card: rgba(15,23,42,0.8); --border: rgba(255,255,255,0.08);
  --accent: #60a5fa; --shadow: 0 10px 30px -5px rgba(0,0,0,0.6);
}
* { margin:0; padding:0; box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
body {
  font-family: system-ui, -apple-system, sans-serif;
  background: var(--bg); color: var(--text);
  min-height: 100vh; display: flex; flex-direction: column; align-items: center; padding: 20px;
  transition: background 0.3s, color 0.3s;
}
.bg-layer { position: fixed; inset: 0; z-index: -1; background-size: cover; background-position: center; transition: filter 0.3s; }
html.dark .bg-layer { filter: brightness(0.3) saturate(0.8); }

.container { width: 100%; max-width: 440px; z-index: 1; animation: slideUp 0.5s ease-out; }
@keyframes slideUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }

/* 卡片通用 */
.glass {
  background: var(--card); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--border); border-radius: 24px; padding: 24px; margin-bottom: 16px;
  box-shadow: var(--shadow); text-align: center; position: relative; overflow: hidden;
}

/* 顶部信息栏 */
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.status-bar {
  background: var(--card); border: 1px solid var(--border); padding: 6px 14px;
  border-radius: 99px; font-size: 12px; font-weight: 700;
  display: flex; gap: 8px; align-items: center; box-shadow: var(--shadow);
}
.controls { display: flex; gap: 8px; }
.circle-btn {
  width: 36px; height: 36px; border-radius: 50%; background: var(--card); border: 1px solid var(--border);
  display: flex; justify-content: center; align-items: center; cursor: pointer; font-size: 16px; transition: 0.2s;
}
.circle-btn:active { transform: scale(0.9); }

/* 头像区域 */
.avatar-wrapper { position: relative; width: 96px; height: 96px; margin: 0 auto 12px auto; }
.avatar { width: 100%; height: 100%; border-radius: 50%; border: 4px solid var(--card); box-shadow: var(--shadow); object-fit: cover; transition: 0.6s; }
.avatar:hover { transform: rotate(360deg); }
.status-indicator { position: absolute; bottom: 5px; right: 5px; width: 18px; height: 18px; border: 3px solid var(--card); border-radius: 50%; animation: pulse 2s infinite; }
@keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(255,255,255,0.4); } 70% { box-shadow: 0 0 0 6px rgba(255,255,255,0); } }

.site-title { font-size: 24px; font-weight: 800; margin-bottom: 4px; }
.site-bio { font-size: 13px; color: var(--sub); margin-bottom: 24px; min-height: 1.2em; line-height: 1.5; }

/* 社交按钮 */
.social-links { display: flex; justify-content: center; gap: 20px; margin-bottom: 24px; align-items: center; }
.svg-icon { width: 26px; height: 26px; fill: var(--sub); transition: 0.2s; cursor: pointer; }
.svg-icon:hover { fill: var(--accent); transform: translateY(-2px); }
.email-pill {
  background: linear-gradient(135deg, var(--text), #475569); color: var(--bg);
  padding: 10px 24px; border-radius: 99px; text-decoration: none; font-size: 13px; font-weight: 700;
  box-shadow: 0 4px 15px rgba(0,0,0,0.15); transition: 0.2s;
}
.email-pill:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.25); }

/* 进度条 */
.progress-container { background: rgba(127,127,127,0.08); padding: 14px; border-radius: 16px; margin-top: 12px; border: 1px solid var(--border); }
.progress-labels { display: flex; justify-content: space-between; font-size: 11px; font-weight: 700; margin-bottom: 8px; opacity: 0.7; }
.progress-bg { width: 100%; height: 6px; background: rgba(127,127,127,0.1); border-radius: 99px; overflow: hidden; }
.progress-bar { height: 100%; background: var(--accent); border-radius: 99px; transform-origin: left; }

/* 搜索与标签 */
.search-box { width: 100%; padding: 14px; border-radius: 16px; border: 1px solid var(--border); background: var(--card); color: var(--text); margin-bottom: 12px; outline: none; font-size: 14px; transition: 0.2s; }
.search-box:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
.tags-scroll { display: flex; gap: 8px; overflow-x: auto; padding: 2px 2px 10px 2px; justify-content: center; scrollbar-width: none; }
.tag-chip { padding: 6px 14px; background: var(--card); border: 1px solid var(--border); border-radius: 99px; font-size: 11px; font-weight: 700; color: var(--sub); cursor: pointer; white-space: nowrap; transition: 0.2s; }
.tag-chip.active { background: var(--accent); color: #fff; border-color: var(--accent); }

/* 链接卡片 */
.link-card {
  display: flex; align-items: center; gap: 14px; padding: 16px;
  background: var(--card); border: 1px solid var(--border); border-radius: 20px;
  text-decoration: none; color: inherit; margin-bottom: 10px; transition: 0.2s; position: relative;
}
.link-card:active { transform: scale(0.98); }
.link-card:hover { transform: translateY(-2px); background: rgba(255,255,255,0.95); z-index: 2; border-color: var(--accent); }
html.dark .link-card:hover { background: rgba(60,60,60,0.9); }

.link-icon { width: 44px; height: 44px; border-radius: 12px; background: rgba(127,127,127,0.1); flex-shrink: 0; overflow: hidden; display: flex; justify-content: center; align-items: center; font-size: 22px; }
.link-icon img { width: 100%; height: 100%; object-fit: cover; }
.link-content { flex: 1; min-width: 0; }
.link-title { font-size: 15px; font-weight: 700; margin-bottom: 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.link-desc { font-size: 12px; color: var(--sub); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.link-badge { font-size: 10px; background: rgba(59,130,246,0.1); color: var(--accent); padding: 2px 6px; border-radius: 4px; margin-left: 6px; font-weight: 600; }
.copy-btn { padding: 8px; background: 0 0; border: none; cursor: pointer; opacity: 0.3; font-size: 16px; }
.copy-btn:hover { opacity: 1; color: var(--accent); }

/* 页脚 */
.footer { margin-top: 30px; text-align: center; padding-bottom: 40px; display: flex; flex-direction: column; gap: 12px; align-items: center; }
.stats-pill { display: inline-flex; gap: 12px; background: rgba(0,0,0,0.8); backdrop-filter: blur(10px); color: #fff; padding: 8px 20px; border-radius: 99px; font-size: 11px; font-weight: 700; }
.admin-text { font-size: 10px; color: var(--sub); text-decoration: none; font-weight: 700; text-transform: uppercase; opacity: 0.4; letter-spacing: 1px; transition: 0.2s; }
.admin-text:hover { opacity: 1; color: var(--accent); }

.toast { position: fixed; top: 24px; left: 50%; transform: translate(-50%, -60px); background: #10b981; color: #fff; padding: 10px 24px; border-radius: 99px; font-size: 13px; font-weight: 700; z-index: 99; transition: 0.3s; box-shadow: 0 10px 30px rgba(16,185,129,0.3); }
.toast.show { transform: translate(-50%, 0); }
.marquee { white-space: nowrap; overflow: hidden; font-size: 12px; font-weight: 700; color: var(--accent); text-align: left; }
.marquee div { display: inline-block; padding-left: 100%; animation: scroll 15s linear infinite; }
@keyframes scroll { to { transform: translateX(-100%); } }
`;

// ------ 后台 CSS (修复重叠问题) ------
const adminCss = `
:root { --bg:#0f172a; --card:#1e293b; --text:#e2e8f0; --sub:#94a3b8; --border:#334155; --accent:#3b82f6; --input:#020617; }
body { font-family: system-ui, -apple-system, sans-serif; background: var(--bg); color: var(--text); margin: 0; min-height: 100vh; font-size: 14px; padding-bottom: 50px; }
a { text-decoration: none; color: inherit; transition: 0.2s; }

/* 导航栏 */
.nav { background: rgba(30,41,59,0.9); backdrop-filter: blur(10px); border-bottom: 1px solid var(--border); padding: 0 20px; height: 60px; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 10; margin-bottom: 30px; }
.logo { font-weight: 800; font-size: 18px; color: #fff; }
.logo span { color: var(--accent); }
.preview-btn { background: rgba(59,130,246,0.1); color: var(--accent); padding: 8px 16px; border-radius: 6px; font-weight: 600; font-size: 12px; border: 1px solid rgba(59,130,246,0.2); }
.preview-btn:hover { background: var(--accent); color: #fff; }

/* 布局容器 */
.layout { max-width: 1000px; margin: 0 auto; padding: 0 20px; display: flex; flex-direction: column; gap: 30px; }
@media (min-width: 800px) { .layout { flex-direction: row; align-items: start; } .sidebar { width: 320px; flex-shrink: 0; } .main { flex-grow: 1; } }

/* 卡片样式 */
.panel { background: var(--card); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.2); display: flex; flex-direction: column; }
.panel-head { padding: 16px 20px; border-bottom: 1px solid var(--border); background: rgba(255,255,255,0.02); font-weight: 700; color: var(--sub); font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; display: flex; justify-content: space-between; align-items: center; }
.panel-body { padding: 24px; }

/* 表单元素 */
.form-group { margin-bottom: 16px; }
.label { display: block; font-size: 11px; font-weight: 700; color: var(--sub); text-transform: uppercase; margin-bottom: 6px; }
.input { width: 100%; background: var(--input); border: 1px solid var(--border); color: #fff; padding: 12px; border-radius: 8px; font-size: 14px; outline: none; transition: 0.2s; box-sizing: border-box; }
.input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
textarea.input { resize: vertical; min-height: 80px; line-height: 1.5; }
select.input { appearance: none; background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e"); background-repeat: no-repeat; background-position: right 12px center; background-size: 16px; }

/* 按钮 */
.btn { width: 100%; padding: 12px; border-radius: 8px; font-weight: 700; font-size: 14px; cursor: pointer; border: none; transition: 0.2s; text-align: center; display: inline-block; }
.btn-primary { background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; box-shadow: 0 4px 10px rgba(37,99,235,0.3); }
.btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
.btn-add { background: linear-gradient(135deg, #10b981, #059669); color: white; box-shadow: 0 4px 10px rgba(16,185,129,0.3); }
.btn-danger { background: rgba(239,68,68,0.15); color: #ef4444; padding: 6px 12px; font-size: 12px; border-radius: 6px; width: auto; }
.btn-danger:hover { background: #ef4444; color: #fff; }
.btn-edit { background: rgba(59,130,246,0.15); color: var(--accent); padding: 6px 12px; font-size: 12px; border-radius: 6px; width: auto; }
.btn-edit:hover { background: var(--accent); color: #fff; }

/* 链接列表 */
.link-list { display: flex; flex-direction: column; gap: 8px; }
.link-item { display: flex; align-items: center; gap: 16px; padding: 12px; background: rgba(255,255,255,0.02); border-radius: 8px; border: 1px solid transparent; transition: 0.2s; }
.link-item:hover { background: rgba(255,255,255,0.04); border-color: var(--border); }
.link-sort { width: 40px; text-align: center; background: var(--input); border: 1px solid var(--border); color: var(--sub); padding: 6px; border-radius: 6px; font-size: 12px; }
.link-icon { width: 40px; height: 40px; background: var(--input); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 20px; border: 1px solid var(--border); color: var(--sub); overflow: hidden; flex-shrink: 0; }
.link-details { flex: 1; min-width: 0; }
.link-title { font-weight: 700; font-size: 14px; color: #fff; display: flex; align-items: center; gap: 8px; margin-bottom: 2px; }
.link-url { font-size: 12px; color: var(--sub); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tag-badge { font-size: 10px; background: rgba(59,130,246,0.2); color: var(--accent); padding: 2px 6px; border-radius: 4px; }
.item-actions { display: flex; gap: 8px; }

/* 登录页 */
.login-container { display: flex; align-items: center; justify-content: center; height: 100vh; background: var(--bg); }
.login-card { width: 100%; max-width: 360px; padding: 40px; background: var(--card); border: 1px solid var(--border); border-radius: 20px; text-align: center; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3); }
.login-icon { font-size: 40px; margin-bottom: 20px; display: inline-block; background: rgba(59,130,246,0.1); width: 80px; height: 80px; line-height: 80px; border-radius: 50%; }
`;

app.get('/', async (c) => {
  if (!c.env.DB) return c.text('DB Error', 500)
  
  const [links, bio, email, qq, views, bgUrl, siteTitle, status, startDate, notice, github, telegram, music] = await Promise.all([
    c.env.DB.prepare('SELECT * FROM links ORDER BY sort_order ASC, created_at DESC').all(),
    getConfig(c.env.DB, 'bio'), getConfig(c.env.DB, 'email'), getConfig(c.env.DB, 'qq'),
    getConfig(c.env.DB, 'views'), getConfig(c.env.DB, 'bg_url'), getConfig(c.env.DB, 'site_title'),
    getConfig(c.env.DB, 'status'), getConfig(c.env.DB, 'start_date'), getConfig(c.env.DB, 'notice'),
    getConfig(c.env.DB, 'github'), getConfig(c.env.DB, 'telegram'), getConfig(c.env.DB, 'music_url')
  ]);

  c.executionCtx.waitUntil(c.env.DB.prepare("UPDATE config SET value = CAST(value AS INTEGER) + 1 WHERE key = 'views'").run());
  
  const stColor:any = { online:'#22c55e', busy:'#ef4444', coding:'#a855f7', away:'#eab308', offline:'#6b7280' };
  const curStColor = stColor[status as string] || '#22c55e';

  // SSR 倒计时
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }));
  const yr = now.getFullYear();
  const start = new Date(Date.UTC(yr, 0, 1)).getTime();
  const end = new Date(Date.UTC(yr + 1, 0, 1)).getTime();
  const pctRatio = Math.min(1, Math.max(0, (now.getTime() - start) / (end - start)));
  const pctText = (pctRatio * 100).toFixed(1);
  const leftDays = Math.floor((end - now.getTime()) / 86400000);
  const runDays = Math.floor((Date.now() - new Date(startDate as string || '2025-01-01').getTime()) / 86400000);

  const tags = ['全部', ...new Set(links.results.map((l:any)=>l.tag?l.tag.trim():'').filter((t:string)=>t!==''))];
  const fav = "https://twbk.cn/wp-content/uploads/2025/12/tx.png";

  return c.html(`<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=0"><title>${siteTitle}</title><link rel="icon" href="${fav}"><style>${frontCss}</style>
  <script>
    if(localStorage.theme==='dark'||(!('theme' in localStorage)&&window.matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark');
    const perfStart = performance.now();
  </script></head><body><div class="bg-layer" style="${bgUrl ? `background-image: url('${bgUrl}');` : 'background-color:#f8fafc;'}"></div><div class="container">
  
  <div class="header">
    <div class="status-bar">
      <!-- 修复 ID -->
      <span id="clock">00:00:00</span>
      <span style="opacity:0.2">|</span>
      <!-- 修复 变量 -->
      <span>📍 ${c.req.raw.cf?.city || 'China'}</span>
    </div>
    <div class="controls">${music ? `<button class="circle-btn" onclick="playMusic()" id="mb">🎵<audio id="au" loop></audio></button>` : ''}<button class="circle-btn" onclick="toggleTheme()">🌗</button></div>
  </div>

  ${notice ? `<div class="glass" style="padding:10px 16px;border-left:4px solid var(--accent);color:var(--accent);font-weight:700;font-size:12px;text-align:left"><div class="marquee"><div>🔔 ${notice}</div></div></div>` : ''}<div class="glass"><div class="avatar-wrapper"><img src="/avatar" onerror="this.src='${fav}'" class="avatar" fetchpriority="high"><div class="status-indicator" style="background:${curStColor};box-shadow:0 0 10px ${curStColor}"></div></div><h1 class="site-title">${siteTitle}</h1><p class="site-bio" id="bio"></p><div class="social-links">${github ? `<a href="${github}" target="_blank"><svg class="svg-icon" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.065 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.475-1.335-5.475-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></path></svg></a>` : ''}${telegram ? `<a href="${telegram}" target="_blank"><svg class="svg-icon" viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.14-.24.24-.44.24l.197-2.97 5.407-4.882c.232-.204-.055-.317-.366-.113L7.18 13.9l-2.87-.898c-.628-.19-.643-.628.131-.928l11.22-4.322c.52-.19.974.12.833.469z"/></svg></a>`:''}${qq ? `<a href="javascript:jumpQQ()" class="svg-icon"><svg class="svg-icon" viewBox="0 0 1024 1024"><path d="M824.8 613.2c-16-51.4-34.4-94.6-62.7-165.3C766.5 262.2 689.3 112 511.5 112 331.7 112 256.4 265.2 261 447.9c-28.4 70.8-46.7 113.7-62.7 165.3-34 109.5-23 154.8-14.6 155.8 18 2.2 70.1-82.4 70.1-82.4 0 49 25.2 112.9 79.8 159-26.4 8.1-85.7 29.9-71.6 53.8 11.4 19.3 196.2 12.3 249.5 6.3 53.3 6 238.1 13 249.5-6.3 14.1-23.8-45.2-45.7-71.6-53.8 54.6-46.2 79.8-110.1 79.8-159 0 0 52.1 84.6 70.1 82.4 8.5-1.1 19.5-46.4-14.5-155.8z"/></path></svg></a>` : ''}<a href="mailto:${email}" class="email-pill"><span>✉️</span> 联系我</a></div><div class="progress-container"><div class="progress-labels"><span>${yr} 余额 ${leftDays} 天</span><span>${pctText}%</span></div><div class="progress-bg"><div class="progress-bar" style="transform: scaleX(${pctRatio})"></div></div></div></div><div class="tags-scroll">${tags.map((t:string) => `<div class="tag-chip ${t==='全部'?'active':''}" onclick="filter('${t}',this)">${t}</div>`).join('')}</div><input id="search" class="search-box" placeholder="🔍 搜索..." onkeyup="search(this.value)"><div id="list">${links.results.map((l:any) => `<a href="${l.url}" target="_blank" class="link-card" data-t="${l.tag||''}" data-s="${l.title} ${l.description}"><div class="link-icon">${!l.icon ? `<img src="https://api.iowen.cn/favicon/${new URL(l.url).hostname}.png" loading="lazy">` : (l.icon.startsWith('http') ? `<img src="${l.icon}" loading="lazy">` : l.icon)}</div><div class="link-content"><div class="link-title">${l.title} ${l.tag?`<span class="link-badge">${l.tag}</span>`:''}</div><div class="link-desc">${l.description||l.url}</div></div><button class="copy-btn" onclick="copy('${l.url}',event)">📋</button></a>`).join('')}</div><div class="footer"><div class="stats-pill"><span>👀 ${views}</span><span style="opacity:0.3">|</span><span>⏳ ${runDays} 天</span><span style="opacity:0.3">|</span><span>⚡ <span id="perf">0</span>ms</span></div><div><a href="/admin" class="admin-text">管理后台</a></div></div></div><div id="toast" class="toast">✅ 已复制</div><script>document.addEventListener('DOMContentLoaded', () => { setTimeout(() => { document.getElementById('perf').innerText = Math.round(performance.now() - perfStart); }, 50); const ck = document.getElementById('clock'); function tick(){ const d = new Date(); const b = new Date(d.getTime() + (d.getTimezoneOffset()*60000) + (3600000*8)); ck.innerText = b.getHours().toString().padStart(2,'0')+':'+b.getMinutes().toString().padStart(2,'0')+':'+b.getSeconds().toString().padStart(2,'0'); requestAnimationFrame(tick); } requestAnimationFrame(tick); const txt = "${bio || 'Hello'}"; const el = document.getElementById('bio'); let i = 0; (function t(){if(i<txt.length){el.innerText+=txt.charAt(i++);setTimeout(t,50)}})(); document.addEventListener('error', e => { if(e.target.tagName==='IMG' && !e.target.hasAttribute('d')){ e.target.setAttribute('d', 'true'); try { e.target.src = 'https://icons.duckduckgo.com/ip3/'+new URL(e.target.parentNode.href).hostname+'.ico'; } catch(err) {} } }, true); }); function qj() { const u = "${qq}"; if(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)){ window.location.href = "mqqapi://card/show_pslcard?src_type=internal&version=1&uin="+u+"&card_type=person&source=sharecard"; } else { window.location.href = "tencent://AddContact/?fromId=45&subcmd=all&uin="+u; } } function filter(tag, btn) { document.querySelectorAll('.tag-chip').forEach(x=>x.classList.remove('active')); btn.classList.add('active'); document.querySelectorAll('.link-card').forEach(l => { l.style.display = (tag==='全部'||l.dataset.t===tag) ? 'flex' : 'none'; }); } function search(v) { v = v.toLowerCase(); document.querySelectorAll('.link-card').forEach(l => { l.style.display = l.dataset.s.toLowerCase().includes(v) ? 'flex' : 'none'; }); } function copy(u, e) { e.preventDefault(); e.stopPropagation(); navigator.clipboard.writeText(u); const t = document.getElementById('toast'); t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2000); } 
  function toggleTheme() { 
    const html = document.documentElement;
    html.classList.toggle('dark');
    localStorage.theme = html.classList.contains('dark') ? 'dark' : 'light';
  } 
  function playMusic() { const a = document.getElementById('au'); if(!a.src) a.src = "${music || ''}"; const b = document.getElementById('mb'); if(a.paused) { a.play(); b.style.transform = 'rotate(360deg)'; } else { a.pause(); b.style.transform = 'none'; } } </script></body></html>`)
})

app.get('/avatar', async (c) => {
  const f = "https://twbk.cn/wp-content/uploads/2025/12/tx.png"
  if(!c.env.BUCKET) return c.redirect(f)
  const o = await c.env.BUCKET.get('avatar.png')
  return o ? new Response(o.body, {headers:{'etag':o.httpEtag}}) : c.redirect(f)
})

app.get('/admin', async (c) => {
  const cookie = getCookie(c, 'auth')
  if (cookie !== 'true') return c.html(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>后台登录</title><style>${adminCss}</style></head><body><div class="login-wrapper"><div class="login-box"><div class="login-icon">🔐</div><h2 style="margin:0 0 20px 0;color:#fff">后台管理</h2><form action="/api/login" method="post"><div class="form-group"><input type="password" name="password" class="input" placeholder="输入密码" style="text-align:center"></div><button class="btn btn-primary" style="margin-top:20px">立即解锁</button></form></div></div></body></html>`)
  
  const editId = c.req.query('edit_id')
  let editLink = null
  try { if (editId) editLink = await c.env.DB.prepare("SELECT * FROM links WHERE id = ?").bind(editId).first() } catch(e) {}
  
  const links = await c.env.DB.prepare('SELECT * FROM links ORDER BY sort_order ASC, created_at DESC').all();
  const configKeys = ['bio','email','qq','bg_url','site_title','status','start_date','notice','github','telegram','music_url'];
  const labelMap:any = {bio:'个人简介',email:'邮箱',qq:'QQ',bg_url:'背景图URL',site_title:'网站标题',status:'当前状态',start_date:'建站日期',notice:'公告栏',github:'GitHub',telegram:'Telegram',music_url:'音乐URL'};
  
  const config: any = {};
  for(const k of configKeys) { config[k] = await getConfig(c.env.DB, k) || ''; }

  return c.html(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>后台管理</title><style>${adminCss}</style></head><body>
    <nav class="nav"><div class="logo">LX <span>Profile</span></div><a href="/" target="_blank" class="preview-btn">预览主页</a></nav>
    <div class="layout">
      <div class="sidebar">
        <div class="panel">
          <div class="panel-head">系统配置</div>
          <div class="panel-body"><form action="/api/config" method="post" class="form-grid">
            ${Object.keys(config).map(k=> k === 'status' ? `
              <div class="form-group"><label class="label">${labelMap[k]}</label>
              <select name="${k}" class="input">
                <option value="online" ${config[k]==='online'?'selected':''}>🟢 在线 (Online)</option>
                <option value="busy" ${config[k]==='busy'?'selected':''}>🔴 忙碌 (Busy)</option>
                <option value="coding" ${config[k]==='coding'?'selected':''}>🟣 摸鱼 (Coding)</option>
                <option value="away" ${config[k]==='away'?'selected':''}>🟡 离开 (Away)</option>
                <option value="offline" ${config[k]==='offline'?'selected':''}>⚫ 隐身 (Offline)</option>
              </select></div>
            ` : `
              <div class="form-group"><label class="label">${labelMap[k]||k}</label>
              ${k==='bio'||k==='notice'?`<textarea name="${k}" class="input">${config[k]}</textarea>`:`<input type="text" name="${k}" value="${config[k]}" class="input">`}
              </div>`).join('')}
            <button class="btn btn-primary">保存配置</button>
          </form></div>
        </div>
      </div>
      <div class="main">
        <div class="panel" style="margin-bottom:24px">
          <div class="panel-head"><span>${editLink?'✏️ 编辑链接':'✨ 添加链接'}</span>${editLink?'<a href="/admin" class="btn-danger" style="text-decoration:none">取消</a>':''}</div>
          <div class="panel-body"><form action="${editLink?'/api/links/update':'/api/links'}" method="post" class="form-grid">
            ${editLink?`<input type="hidden" name="id" value="${editLink.id}">`:''}
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px"><div class="form-group"><label class="label">标题</label><input name="title" value="${editLink?.title||''}" class="input" required></div><div class="form-group"><label class="label">链接</label><input name="url" value="${editLink?.url||''}" class="input" required></div></div>
            <div style="display:grid;grid-template-columns:1fr 1fr 2fr;gap:15px"><div class="form-group"><label class="label">排序</label><input name="sort_order" value="${editLink?.sort_order||0}" class="input"></div><div class="form-group"><label class="label">标签</label><input name="tag" value="${editLink?.tag||''}" class="input"></div><div class="form-group"><label class="label">图标</label><input name="icon" value="${editLink?.icon||''}" class="input" placeholder="Emoji 或 URL"></div></div>
            <div class="form-group"><label class="label">描述</label><input name="description" value="${editLink?.description||''}" class="input"></div>
            <button class="${editLink?'btn btn-primary':'btn btn-add'}" style="${!editLink?'background:#10b981':''}">${editLink?'更新链接':'立即添加'}</button>
          </form></div>
        </div>
        <div class="panel">
          <div class="panel-head">链接列表 (${links.results.length})</div>
          <div class="panel-body link-list">
            ${links.results.map((l:any)=>`<div class="link-item">
              <form action="/api/links/update_order" method="post" style="margin:0"><input type="hidden" name="id" value="${l.id}"><input class="link-sort" name="sort_order" value="${l.sort_order}" onchange="this.form.submit()"></form>
              <div class="link-icon">${!l.icon?'🔗':(l.icon.startsWith('http')?`<img src="${l.icon}" style="width:100%;height:100%;object-fit:cover">`:l.icon)}</div>
              <div class="link-details"><div class="link-title">${l.title} ${l.tag?`<span class="tag-badge">${l.tag}</span>`:''}</div><div class="link-url">${l.url}</div></div>
              <div class="item-actions"><a href="/admin?edit_id=${l.id}" class="btn-edit">编辑</a><form action="/api/links/delete" method="post" style="margin:0"><input type="hidden" name="id" value="${l.id}"><button class="btn-danger" style="border:none;cursor:pointer" onclick="return confirm('删?')">删除</button></form></div>
            </div>`).join('')}
          </div>
        </div>
      </div>
    </div>
  </body></html>`)
})

app.post('/api/login', async (c) => { const body=await c.req.parseBody(); if(body.password===(c.env.ADMIN_PASSWORD||'lx123456')){setCookie(c,'auth','true',{httpOnly:true,maxAge:86400*30,path:'/'});return c.redirect('/admin')}return c.html(`<script>alert('密码错误');history.back()</script>`) })
app.post('/api/config', async (c) => {if(getCookie(c,'auth')!=='true')return c.redirect('/admin');const b=await c.req.parseBody();const k=['bio','email','qq','bg_url','site_title','status','start_date','notice','github','telegram','music_url'];const s=c.env.DB.prepare("UPDATE config SET value = ? WHERE key = ?");await c.env.DB.batch(k.map(key=>s.bind(b[key],key)));return c.redirect('/admin')})
app.post('/api/links', async (c) => {if(getCookie(c,'auth')!=='true')return c.redirect('/admin');const b=await c.req.parseBody();await c.env.DB.prepare("INSERT INTO links (title, url, icon, description, sort_order, tag) VALUES (?, ?, ?, ?, ?, ?)").bind(b.title, b.url, b.icon, b.description, b.sort_order||0, b.tag).run();return c.redirect('/admin')})
app.post('/api/links/update', async (c) => {if(getCookie(c,'auth')!=='true')return c.redirect('/admin');const b=await c.req.parseBody();await c.env.DB.prepare("UPDATE links SET title=?, url=?, icon=?, description=?, sort_order=?, tag=? WHERE id=?").bind(b.title, b.url, b.icon, b.description, b.sort_order, b.tag, b.id).run();return c.redirect('/admin')})
app.post('/api/links/update_order', async (c) => {if(getCookie(c,'auth')!=='true')return c.redirect('/admin');const b=await c.req.parseBody();await c.env.DB.prepare("UPDATE links SET sort_order=? WHERE id=?").bind(b.sort_order,b.id).run();return c.redirect('/admin')})
app.post('/api/links/delete', async (c) => {if(getCookie(c,'auth')!=='true')return c.redirect('/admin');const b=await c.req.parseBody();await c.env.DB.prepare("DELETE FROM links WHERE id=?").bind(b.id).run();return c.redirect('/admin')})

export const onRequest = handle(app)