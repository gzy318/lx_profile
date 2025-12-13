/**
 * LX Profile - V12.0 (China Native Extreme Edition)
 * 1. 倒计时：服务端(SSR)硬编码北京时间，打开即显示，无动画延迟。
 * 2. 0依赖：移除所有CDN，样式内嵌，字体本地化。
 * 3. 性能：重写 CSS 架构，极致轻量。
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

// ------ CSS (本地内嵌，无网络请求) ------
const css = `
:root {
  --bg: #f3f4f6; --text: #1f2937; --sub: #6b7280;
  --card: #ffffff; --border: #e5e7eb;
  --accent: #2563eb; --accent-light: #eff6ff;
  --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #111827; --text: #f9fafb; --sub: #9ca3af;
    --card: #1f2937; --border: #374151;
    --accent: #60a5fa; --accent-light: #1e3a8a;
    --shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
  }
}
.dark-mode { --bg: #111827; --text: #f9fafb; --sub: #9ca3af; --card: #1f2937; --border: #374151; --accent: #60a5fa; --accent-light: #1e3a8a; }
.light-mode { --bg: #f3f4f6; --text: #1f2937; --sub: #6b7280; --card: #ffffff; --border: #e5e7eb; --accent: #2563eb; --accent-light: #eff6ff; }

* { margin:0; padding:0; box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
body {
  font-family: system-ui, -apple-system, "Microsoft YaHei", "PingFang SC", sans-serif;
  background-color: var(--bg); color: var(--text);
  min-height: 100vh; display: flex; flex-direction: column; align-items: center; padding: 20px;
  transition: background 0.2s, color 0.2s;
}
.bg-img { position:fixed; inset:0; z-index:-1; background-size:cover; background-position:center; transition:filter 0.3s; }
body.dark-mode .bg-img, @media (prefers-color-scheme: dark) { body:not(.light-mode) .bg-img { filter: brightness(0.4); } }

.main { width: 100%; max-width: 480px; z-index: 1; }

/* 卡片风格 */
.card {
  background: var(--card); border: 1px solid var(--border); border-radius: 20px;
  padding: 24px; margin-bottom: 16px; box-shadow: var(--shadow); text-align: center;
  /* 针对中国大陆网络的关键优化：不使用 backdrop-filter，防止低端机卡顿 */
}

/* 顶部栏 */
.top { display: flex; justify-content: space-between; margin-bottom: 16px; align-items: center; }
.pill { background: var(--card); border: 1px solid var(--border); padding: 6px 12px; border-radius: 99px; font-size: 12px; font-weight: bold; display: flex; gap: 8px; box-shadow: var(--shadow); }
.btn-round { width: 36px; height: 36px; border-radius: 50%; background: var(--card); border: 1px solid var(--border); display: flex; justify-content: center; align-items: center; cursor: pointer; box-shadow: var(--shadow); }

/* 头像与信息 */
.avatar { width: 88px; height: 88px; border-radius: 50%; border: 4px solid var(--card); box-shadow: var(--shadow); margin-bottom: 12px; object-fit: cover; }
.title { font-size: 20px; font-weight: 800; margin-bottom: 4px; }
.bio { font-size: 13px; color: var(--sub); margin-bottom: 16px; }

/* 社交 */
.social { display: flex; justify-content: center; gap: 16px; margin-bottom: 20px; }
.s-icon { width: 24px; height: 24px; fill: var(--sub); transition: fill 0.2s; }
.s-icon:hover { fill: var(--accent); }
.contact-btn { background: var(--text); color: var(--bg); padding: 8px 20px; border-radius: 12px; text-decoration: none; font-size: 12px; font-weight: bold; }

/* 核心优化：服务端渲染进度条 (无动画，直接显示) */
.progress-box { background: rgba(127,127,127,0.1); padding: 12px; border-radius: 12px; margin-top: 10px; }
.progress-txt { display: flex; justify-content: space-between; font-size: 11px; font-weight: bold; margin-bottom: 6px; opacity: 0.8; }
.bar-bg { width: 100%; height: 8px; background: rgba(127,127,127,0.2); border-radius: 4px; overflow: hidden; }
.bar-fill { height: 100%; background: var(--accent); border-radius: 4px; } 
/* 注意：去掉了 transition，防止打开时的动画延迟感 */

/* 链接列表 */
.search { width: 100%; padding: 12px; border-radius: 14px; border: 1px solid var(--border); background: var(--card); color: var(--text); margin-bottom: 16px; font-size: 14px; outline: none; box-shadow: var(--shadow); }
.tags { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; margin-bottom: 12px; justify-content: center; -ms-overflow-style: none; scrollbar-width: none; }
.tags::-webkit-scrollbar { display: none; }
.tag { padding: 6px 14px; background: var(--card); border: 1px solid var(--border); border-radius: 20px; font-size: 12px; font-weight: bold; color: var(--sub); white-space: nowrap; cursor: pointer; }
.tag.active { background: var(--accent); color: #fff; border-color: var(--accent); }

.link { display: flex; align-items: center; gap: 12px; padding: 14px; background: var(--card); border: 1px solid var(--border); border-radius: 16px; text-decoration: none; color: inherit; margin-bottom: 10px; transition: transform 0.1s; position: relative; }
.link:active { transform: scale(0.98); }
.l-icon { width: 40px; height: 40px; border-radius: 10px; background: rgba(127,127,127,0.1); flex-shrink: 0; overflow: hidden; }
.l-icon img { width: 100%; height: 100%; object-fit: cover; }
.l-info { flex: 1; min-width: 0; }
.l-title { font-size: 14px; font-weight: bold; margin-bottom: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.l-desc { font-size: 11px; color: var(--sub); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.l-tag { font-size: 10px; background: var(--accent-light); color: var(--accent); padding: 2px 6px; border-radius: 4px; margin-left: 6px; font-weight: normal; }
.copy { padding: 8px; background: transparent; border: none; font-size: 14px; cursor: pointer; opacity: 0.5; }

/* 页脚 */
.footer { margin-top: 40px; text-align: center; padding-bottom: 40px; }
.f-pill { display: inline-flex; gap: 10px; background: #000; color: #fff; padding: 8px 16px; border-radius: 50px; font-size: 11px; font-weight: bold; margin-bottom: 12px; opacity: 0.8; }
.admin { font-size: 10px; color: var(--sub); text-decoration: none; font-weight: bold; text-transform: uppercase; opacity: 0.5; }

/* 弹窗 */
.toast { position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: #10b981; color: #fff; padding: 8px 20px; border-radius: 30px; font-size: 12px; font-weight: bold; z-index: 99; display: none; box-shadow: 0 5px 15px rgba(0,0,0,0.2); }
.modal { position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 90; display: none; align-items: center; justify-content: center; }
.modal-box { background: #fff; padding: 20px; border-radius: 16px; }

/* 后台简易CSS */
.admin-body { background: #111; color: #eee; font-family: sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
.admin-card { background: #222; border: 1px solid #333; padding: 20px; border-radius: 10px; margin-bottom: 20px; }
.inp { width: 100%; background: #000; border: 1px solid #333; color: #fff; padding: 10px; margin-bottom: 10px; border-radius: 5px; }
.btn { width: 100%; padding: 10px; background: #2563eb; color: #fff; border: none; border-radius: 5px; font-weight: bold; cursor: pointer; }
.row { display: flex; gap: 10px; border-bottom: 1px solid #333; padding: 10px 0; align-items: center; }
`;

app.get('/', async (c) => {
  const startTime = Date.now();
  if (!c.env.DB) return c.text('数据库连接失败', 500)

  // 1. 获取位置
  const city = c.req.raw.cf?.city || 'Earth'
  
  // 2. 拉取数据
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

  // 3. 浏览量+1
  c.executionCtx.waitUntil(c.env.DB.prepare("UPDATE config SET value = CAST(value AS INTEGER) + 1 WHERE key = 'views'").run())
  
  // 4. 服务端计算 (核心修复：强制北京时间，防止服务端UTC时间导致差异)
  // 获取当前北京时间
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }));
  const year = now.getFullYear();
  const startOfYear = new Date(year, 0, 1).getTime();
  const endOfYear = new Date(year + 1, 0, 1).getTime();
  const pct = ((now.getTime() - startOfYear) / (endOfYear - startOfYear) * 100).toFixed(1);
  const remainingDays = Math.floor((endOfYear - now.getTime()) / 86400000);
  
  // 运行天数
  const runDays = Math.floor((Date.now() - new Date(startDate as string || '2025-01-01').getTime()) / 86400000);

  // 标签去重
  const rawTags = linksResult.results.map((l:any)=>l.tag?l.tag.trim():'').filter((t:string)=>t!=='');
  const tags = ['全部', ...new Set(rawTags)];

  const favicon = "https://twbk.cn/wp-content/uploads/2025/12/tx.png"

  // 5. 渲染HTML (倒计时进度条直接写入 HTML width: XX%)
  return c.html(`
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0">
      <title>${siteTitle || '主页'}</title>
      <link rel="icon" href="${favicon}">
      <style>${css}</style>
      <script>
        // 主题防闪烁
        if(localStorage.theme==='dark'||(!('theme' in localStorage)&&window.matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark');
      </script>
    </head>
    <body>
      <div class="bg-img" style="${bgUrl ? `background-image: url('${bgUrl}');` : 'background-color:#f3f4f6;'}"></div>
      
      <div class="main">
        
        <!-- 顶部 -->
        <div class="top">
           <div class="pill">
              <span id="clock">00:00</span>
              <span style="opacity:0.2">|</span>
              <span>${city}</span>
           </div>
           <div style="display:flex; gap:10px;">
              ${music ? `<button class="btn-round" onclick="toggleMusic()" id="music-btn">🎵<audio id="bg-audio" src="${music}" loop></audio></button>` : ''}
              <button class="btn-round" onclick="toggleTheme()">🌗</button>
           </div>
        </div>

        ${notice ? `<div class="card" style="padding:12px; text-align:left; border-left:4px solid var(--accent); color:var(--accent); font-size:13px; font-weight:bold;">🔔 ${notice}</div>` : ''}

        <div class="card">
           <img src="/avatar" onerror="this.src='${favicon}'" class="avatar">
           <h1 class="title">${siteTitle}</h1>
           <p class="bio">${bio || 'Welcome'}</p>
           
           <div class="social">
              ${github ? `<a href="${github}" target="_blank"><svg class="s-icon" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.065 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.475-1.335-5.475-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></path></svg></a>` : ''}
              ${qq ? `<a href="tencent://AddContact/?fromId=45&subcmd=all&uin=${qq}"><svg class="s-icon" viewBox="0 0 1024 1024"><path d="M824.8 613.2c-16-51.4-34.4-94.6-62.7-165.3C766.5 262.2 689.3 112 511.5 112 331.7 112 256.4 265.2 261 447.9c-28.4 70.8-46.7 113.7-62.7 165.3-34 109.5-23 154.8-14.6 155.8 18 2.2 70.1-82.4 70.1-82.4 0 49 25.2 112.9 79.8 159-26.4 8.1-85.7 29.9-71.6 53.8 11.4 19.3 196.2 12.3 249.5 6.3 53.3 6 238.1 13 249.5-6.3 14.1-23.8-45.2-45.7-71.6-53.8 54.6-46.2 79.8-110.1 79.8-159 0 0 52.1 84.6 70.1 82.4 8.5-1.1 19.5-46.4-14.5-155.8z"/></path></svg></a>` : ''}
              <a href="mailto:${email}" class="contact-btn">联系我</a>
           </div>

           <!-- 进度条 (服务端直出，0延迟) -->
           <div class="progress-box">
              <div class="progress-txt">
                 <span>${year}年余额: ${remainingDays}天</span>
                 <span>${pct}%</span>
              </div>
              <div class="bar-bg">
                 <div class="bar-fill" style="width: ${pct}%"></div>
              </div>
           </div>
        </div>

        <div class="tags">
           ${tags.map((tag:string)=>`<div class="tag ${tag==='全部'?'active':''}" onclick="filter('${tag}',this)">${tag}</div>`).join('')}
        </div>

        <input type="text" class="search" placeholder="🔍 搜索..." onkeyup="search(this.value)">

        <div id="list">
           ${linksResult.results.map((l:any) => `
             <a href="${l.url}" target="_blank" class="link" data-tag="${l.tag||''}" data-s="${l.title} ${l.description}">
                <div class="l-icon">${!l.icon ? `<img src="https://api.iowen.cn/favicon/${new URL(l.url).hostname}.png" loading="lazy">` : (l.icon.startsWith('http') ? `<img src="${l.icon}" loading="lazy">` : l.icon)}</div>
                <div class="l-info">
                   <div class="l-title">${l.title} ${l.tag?`<span class="l-tag">${l.tag}</span>`:''}</div>
                   <div class="l-desc">${l.description||l.url}</div>
                </div>
                <button class="copy" onclick="copy('${l.url}',event)">📋</button>
             </a>
           `).join('')}
        </div>

        <div class="footer">
           <div class="f-pill">
              <span>👀 ${views}</span>
              <span style="opacity:0.3">|</span>
              <span>⏳ ${runDays} 天</span>
              <span style="opacity:0.3">|</span>
              <span>⚡ <span id="perf">0</span>ms</span>
           </div>
           <div><a href="/admin" class="admin">Admin Panel</a></div>
        </div>
      </div>

      <div id="toast" class="toast">✅ 已复制</div>
      <div id="qr" class="modal" onclick="this.style.display='none'"><div class="modal-box"><img src="https://api.pwmqr.com/qrcode/create/?url=https://${c.req.header('host')}" style="width:200px"></div></div>

      <script>
        document.getElementById('perf').innerText = Date.now() - ${startTime};
        
        // 时钟 (北京时间)
        setInterval(() => {
           document.getElementById('clock').innerText = new Date().toLocaleTimeString('zh-CN', {timeZone:'Asia/Shanghai', hour:'2-digit', minute:'2-digit'});
        }, 1000);

        function filter(tag, btn) {
           document.querySelectorAll('.tag').forEach(b=>b.classList.remove('active'));
           btn.classList.add('active');
           document.querySelectorAll('.link').forEach(l => l.style.display = (tag==='全部'||l.dataset.tag===tag)?'flex':'none');
        }
        function search(v) {
           v = v.toLowerCase();
           document.querySelectorAll('.link').forEach(l => l.style.display = l.dataset.s.toLowerCase().includes(v)?'flex':'none');
        }
        function copy(u, e) {
           e.preventDefault(); e.stopPropagation();
           navigator.clipboard.writeText(u);
           let t=document.getElementById('toast'); t.style.display='block'; setTimeout(()=>t.style.display='none',2000);
        }
        function toggleTheme(){ document.body.classList.toggle('dark-mode'); document.body.classList.toggle('light-mode'); }
        function toggleMusic(){ 
           let a=document.getElementById('bg-audio'); 
           a.paused ? (a.play(),document.getElementById('music-btn').style.transform='rotate(360deg)') : (a.pause(),document.getElementById('music-btn').style.transform='none');
        }
      </script>
    </body>
    </html>
  `)
})

// 头像
app.get('/avatar', async (c) => {
  const f = "https://twbk.cn/wp-content/uploads/2025/12/tx.png"
  if(!c.env.BUCKET) return c.redirect(f)
  const o = await c.env.BUCKET.get('avatar.png')
  return o ? new Response(o.body, {headers:{'etag':o.httpEtag}}) : c.redirect(f)
})

// 后台管理
app.get('/admin', async (c) => {
  const cookie = getCookie(c, 'auth')
  if (cookie !== 'true') return c.html(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{background:#111;color:#eee;font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh}form{background:#222;padding:30px;border-radius:10px;text-align:center;width:300px;border:1px solid #333}input{width:100%;padding:10px;margin:10px 0;background:#000;border:1px solid #333;color:#fff;border-radius:5px}button{width:100%;padding:10px;background:#2563eb;color:#fff;border:none;border-radius:5px;cursor:pointer;font-weight:bold}</style></head><body><form action="/api/login" method="post"><h2>🔒 Admin Login</h2><input type="password" name="password" placeholder="Password"><button>Enter</button></form></body></html>`)

  const editId = c.req.query('edit_id')
  let editLink = null
  if (editId) editLink = await c.env.DB.prepare("SELECT * FROM links WHERE id = ?").bind(editId).first()
  const links = await c.env.DB.prepare('SELECT * FROM links ORDER BY sort_order ASC, created_at DESC').all();
  
  const configKeys = ['bio','email','qq','bg_url','site_title','status','start_date','notice','github','telegram','music_url'];
  const config = {};
  for(const k of configKeys) { config[k] = await getConfig(c.env.DB, k) || ''; }

  return c.html(`
    <!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Admin</title><style>${css}</style></head>
    <body class="admin-body">
      <div style="display:flex;justify-content:space-between;margin-bottom:20px;border-bottom:1px solid #333;padding-bottom:10px;"><h2>LX Admin</h2><a href="/" target="_blank" style="color:#2563eb;text-decoration:none;">View Site</a></div>
      <div class="admin-card"><h3>⚙️ Config</h3><form action="/api/config" method="post">${Object.keys(config).map(k => `<div style="margin-bottom:5px;"><label style="font-size:10px;color:#888;text-transform:uppercase;">${k}</label>${k==='bio'||k==='notice' ? `<textarea class="inp" name="${k}">${config[k]}</textarea>` : `<input class="inp" type="text" name="${k}" value="${config[k]}">`}</div>`).join('')}<button class="btn">Save</button></form></div>
      <div class="admin-card"><h3>${editLink?'✏️ Edit':'➕ New Link'}</h3><form action="${editLink?'/api/links/update':'/api/links'}" method="post">${editLink?`<input type="hidden" name="id" value="${editLink.id}">`:''}<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;"><input class="inp" name="title" value="${editLink?.title||''}" placeholder="Title" required><input class="inp" name="url" value="${editLink?.url||''}" placeholder="URL" required></div><div style="display:grid;grid-template-columns:1fr 1fr 2fr;gap:10px;"><input class="inp" name="sort_order" value="${editLink?.sort_order||0}" placeholder="Sort"><input class="inp" name="tag" value="${editLink?.tag||''}" placeholder="Tag"><input class="inp" name="icon" value="${editLink?.icon||''}" placeholder="Icon"></div><input class="inp" name="description" value="${editLink?.description||''}" placeholder="Desc"><button class="btn" style="background:${editLink?'#2563eb':'#10b981'}">${editLink?'Update':'Add'}</button></form><h3 style="margin-top:20px;">Links</h3>${links.results.map((l:any)=>`<div class="row"><div style="flex:1;"><div style="font-weight:bold;font-size:14px;">${l.title}</div><div style="font-size:11px;color:#888;">${l.url}</div></div><a href="/admin?edit_id=${l.id}" style="color:#2563eb;font-size:12px;margin-right:10px;">Edit</a><form action="/api/links/delete" method="post" style="margin:0"><input type="hidden" name="id" value="${l.id}"><button style="background:none;b
