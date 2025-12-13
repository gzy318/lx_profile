/**
 * LX Profile - V18.0 (Stable & Readable Edition)
 * 1. 修复：恢复代码可读性，解决 Internal Server Error。
 * 2. 保持：手机 QQ 唤起修复、SSR 倒计时、0 CDN。
 * 3. 性能：代码结构清晰，依然秒开。
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

// 工具：安全获取配置
async function getConfig(db: D1Database, key: string) {
  try {
    return await db.prepare("SELECT value FROM config WHERE key = ?").bind(key).first('value')
  } catch (e) { return null }
}

// ------ CSS (恢复可读性，本地内嵌) ------
const css = `
:root {
  --bg: #f8fafc;
  --text: #0f172a;
  --sub: #64748b;
  --card: rgba(255, 255, 255, 0.85);
  --border: rgba(255, 255, 255, 0.6);
  --accent: #3b82f6;
  --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #020617;
    --text: #f8fafc;
    --sub: #94a3b8;
    --card: rgba(15, 23, 42, 0.8);
    --border: rgba(255, 255, 255, 0.05);
    --accent: #60a5fa;
    --shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
  }
}

.dark-mode {
  --bg: #020617; --text: #f8fafc; --sub: #94a3b8;
  --card: rgba(15, 23, 42, 0.8); --border: rgba(255, 255, 255, 0.05);
  --accent: #60a5fa;
}

.light-mode {
  --bg: #f8fafc; --text: #0f172a; --sub: #64748b;
  --card: rgba(255, 255, 255, 0.85); --border: rgba(255, 255, 255, 0.6);
  --accent: #3b82f6;
}

* { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }

body {
  font-family: system-ui, -apple-system, sans-serif;
  background-color: var(--bg);
  color: var(--text);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  transition: background 0.3s;
}

.bg-fixed {
  position: fixed; inset: 0; z-index: -1;
  background-size: cover; background-position: center;
  transition: filter 0.3s;
}
body.dark-mode .bg-fixed, @media (prefers-color-scheme: dark) { 
  body:not(.light-mode) .bg-fixed { filter: brightness(0.3) saturate(0.8); } 
}

.container { width: 100%; max-width: 440px; z-index: 1; animation: fadeIn 0.4s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

/* 卡片 */
.card {
  background: var(--card);
  backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--border);
  border-radius: 24px;
  padding: 24px;
  margin-bottom: 16px;
  box-shadow: var(--shadow);
  text-align: center;
  position: relative;
  overflow: hidden;
}

/* 顶部 */
.top-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.pill {
  background: var(--card); border: 1px solid var(--border);
  padding: 6px 14px; border-radius: 99px;
  font-size: 12px; font-weight: 700;
  display: flex; gap: 8px; align-items: center;
  box-shadow: var(--shadow);
}
.btn-group { display: flex; gap: 8px; }
.icon-btn {
  width: 36px; height: 36px; border-radius: 50%;
  background: var(--card); border: 1px solid var(--border);
  display: flex; justify-content: center; align-items: center;
  cursor: pointer; font-size: 16px; transition: transform 0.1s;
}
.icon-btn:active { transform: scale(0.9); }

/* 头像 */
.avatar {
  width: 96px; height: 96px; border-radius: 50%;
  border: 4px solid var(--card); box-shadow: var(--shadow);
  margin-bottom: 12px; object-fit: cover; transition: transform 0.6s;
}
.avatar:hover { transform: rotate(360deg); }

.title { font-size: 24px; font-weight: 800; margin-bottom: 4px; letter-spacing: -0.5px; }
.bio { font-size: 13px; color: var(--sub); margin-bottom: 20px; min-height: 1.2em; line-height: 1.5; }

/* 社交 */
.social-row { display: flex; justify-content: center; gap: 16px; margin-bottom: 24px; }
.social-icon { width: 24px; height: 24px; fill: var(--sub); transition: 0.2s; cursor: pointer; }
.social-icon:hover { fill: var(--accent); }
.email-btn { background: var(--text); color: var(--bg); padding: 8px 20px; border-radius: 12px; text-decoration: none; font-size: 12px; font-weight: 700; }

/* 进度条 (GPU加速) */
.progress-box { background: rgba(127,127,127,0.1); padding: 14px; border-radius: 16px; margin-top: 8px; }
.progress-head { display: flex; justify-content: space-between; font-size: 11px; font-weight: 700; margin-bottom: 8px; opacity: 0.7; }
.progress-track { width: 100%; height: 6px; background: rgba(127,127,127,0.15); border-radius: 99px; overflow: hidden; }
.progress-fill { height: 100%; background: var(--accent); border-radius: 99px; transform-origin: left; will-change: transform; }

/* 搜索与标签 */
.search-input { width: 100%; padding: 14px; border-radius: 16px; border: 1px solid var(--border); background: var(--card); color: var(--text); margin-bottom: 12px; outline: none; font-size: 14px; transition: box-shadow 0.2s; }
.search-input:focus { box-shadow: 0 0 0 2px var(--accent); }

.tags-row { display: flex; gap: 8px; overflow-x: auto; padding: 2px 2px 10px 2px; justify-content: center; -ms-overflow-style: none; scrollbar-width: none; }
.tags-row::-webkit-scrollbar { display: none; }
.tag-btn { padding: 6px 14px; background: var(--card); border: 1px solid var(--border); border-radius: 99px; font-size: 11px; font-weight: 700; color: var(--sub); cursor: pointer; white-space: nowrap; transition: 0.2s; }
.tag-btn.active { background: var(--accent); color: #fff; border-color: var(--accent); }

/* 链接列表 */
.link-card {
  display: flex; align-items: center; gap: 12px; padding: 14px;
  background: var(--card); border: 1px solid var(--border); border-radius: 18px;
  text-decoration: none; color: inherit; margin-bottom: 10px; transition: 0.2s; position: relative;
}
.link-card:active { transform: scale(0.98); }
.link-card:hover { transform: translateY(-2px); background: rgba(255,255,255,0.95); z-index: 2; }
.dark-mode .link-card:hover { background: rgba(60,60,60,0.9); }

.link-icon { width: 42px; height: 42px; border-radius: 12px; background: rgba(127,127,127,0.1); flex-shrink: 0; overflow: hidden; display: flex; justify-content: center; align-items: center; font-size: 20px; }
.link-icon img { width: 100%; height: 100%; object-fit: cover; }
.link-main { flex: 1; min-width: 0; }
.link-title { font-size: 14px; font-weight: 700; margin-bottom: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.link-desc { font-size: 11px; color: var(--sub); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.link-tag { font-size: 9px; background: rgba(59,130,246,0.1); color: var(--accent); padding: 2px 6px; border-radius: 4px; margin-left: 6px; font-weight: 600; }
.copy-btn { padding: 8px; background: 0 0; border: none; cursor: pointer; opacity: 0.4; font-size: 16px; }
.copy-btn:hover { opacity: 1; color: var(--accent); }

/* 页脚 */
.footer { margin-top: 30px; text-align: center; padding-bottom: 30px; display: flex; flex-direction: column; gap: 12px; align-items: center; }
.info-pill { display: inline-flex; gap: 12px; background: rgba(0,0,0,0.8); backdrop-filter: blur(10px); color: #fff; padding: 8px 20px; border-radius: 99px; font-size: 11px; font-weight: 700; }
.admin-link { font-size: 10px; color: var(--sub); text-decoration: none; font-weight: 700; text-transform: uppercase; opacity: 0.4; letter-spacing: 1px; }

/* 提示与弹窗 */
.toast { position: fixed; top: 24px; left: 50%; transform: translate(-50%, -60px); background: #10b981; color: #fff; padding: 8px 24px; border-radius: 99px; font-size: 12px; font-weight: 700; z-index: 99; transition: 0.3s; box-shadow: 0 10px 30px rgba(16,185,129,0.3); }
.toast.show { transform: translate(-50%, 0); }
.marquee-box { white-space: nowrap; overflow: hidden; font-size: 12px; font-weight: 700; color: var(--accent); text-align: left; }
.marquee-text { display: inline-block; padding-left: 100%; animation: marquee 12s linear infinite; }
@keyframes marquee { to { transform: translate(-100%, 0); } }
`;

// ------ 1. 前台主页 ------
app.get('/', async (c) => {
  const startTime = Date.now();
  if (!c.env.DB) return c.text('Database Error', 500)

  // 1. 获取所有数据
  const [linksResult, bio, email, qq, views, bgUrl, siteTitle, status, startDate, notice, github, telegram, music] = await Promise.all([
    c.env.DB.prepare('SELECT * FROM links ORDER BY sort_order ASC, created_at DESC').all(),
    getConfig(c.env.DB, 'bio'), getConfig(c.env.DB, 'email'), getConfig(c.env.DB, 'qq'),
    getConfig(c.env.DB, 'views'), getConfig(c.env.DB, 'bg_url'), getConfig(c.env.DB, 'site_title'),
    getConfig(c.env.DB, 'status'), getConfig(c.env.DB, 'start_date'), getConfig(c.env.DB, 'notice'),
    getConfig(c.env.DB, 'github'), getConfig(c.env.DB, 'telegram'), getConfig(c.env.DB, 'music_url')
  ]);

  // 2. 统计
  c.executionCtx.waitUntil(c.env.DB.prepare("UPDATE config SET value = CAST(value AS INTEGER) + 1 WHERE key = 'views'").run())

  // 3. 服务端计算进度 (SSR, 强制北京时间)
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }));
  const currentYear = now.getFullYear();
  const startOfYear = new Date(Date.UTC(currentYear, 0, 1)).getTime();
  const endOfYear = new Date(Date.UTC(currentYear + 1, 0, 1)).getTime();
  
  // 计算比例 (0.0 ~ 1.0) 用于 transform scaleX
  const pctRatio = Math.min(1, Math.max(0, (now.getTime() - startOfYear) / (endOfYear - startOfYear)));
  const pctText = (pctRatio * 100).toFixed(1);
  const remainingDays = Math.floor((endOfYear - now.getTime()) / 86400000);
  
  const runDays = Math.floor((Date.now() - new Date(startDate as string || '2025-01-01').getTime()) / 86400000);

  // 4. 标签去重
  const rawTags = linksResult.results.map((l:any) => l.tag ? l.tag.trim() : '').filter((t:string) => t !== '');
  const tags = ['全部', ...new Set(rawTags)];

  const favicon = "https://twbk.cn/wp-content/uploads/2025/12/tx.png";

  return c.html(`
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0">
      <title>${siteTitle || 'Home'}</title>
      <link rel="icon" href="${favicon}">
      <style>${css}</style>
      <script>
        // 防闪烁
        if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
          document.documentElement.classList.add('dark-mode');
        }
        const perfStart = performance.now();
      </script>
    </head>
    <body>
      <div class="bg-fixed" style="${bgUrl ? `background-image: url('${bgUrl}');` : 'background-color:#f8fafc;'}"></div>
      
      <div class="container">
        <!-- 顶部 -->
        <div class="top-bar">
           <div class="pill">
              <span id="clock">00:00:00</span>
              <span style="opacity:0.2">|</span>
              <span>CN</span>
           </div>
           <div class="btn-group">
              ${music ? `<button class="icon-btn" onclick="playMusic()" id="music-btn">🎵<audio id="bg-audio" loop></audio></button>` : ''}
              <button class="icon-btn" onclick="toggleTheme()">🌗</button>
           </div>
        </div>

        ${notice ? `<div class="card" style="padding:10px 16px;border-left:4px solid var(--accent);text-align:left"><div class="marquee-box"><div class="marquee-text">🔔 ${notice}</div></div></div>` : ''}

        <div class="card">
           <img src="/avatar" onerror="this.src='${favicon}'" class="avatar" fetchpriority="high">
           <h1 class="title">${siteTitle}</h1>
           <p class="bio" id="bio"></p>
           
           <div class="social-row">
              ${github ? `<a href="${github}" target="_blank"><svg class="social-icon" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.065 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.475-1.335-5.475-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></path></svg></a>` : ''}
              
              <!-- QQ 修复版: 点击触发 jumpQQ() -->
              ${qq ? `<a href="javascript:jumpQQ()" class="social-icon"><svg class="social-icon" viewBox="0 0 1024 1024"><path d="M824.8 613.2c-16-51.4-34.4-94.6-62.7-165.3C766.5 262.2 689.3 112 511.5 112 331.7 112 256.4 265.2 261 447.9c-28.4 70.8-46.7 113.7-62.7 165.3-34 109.5-23 154.8-14.6 155.8 18 2.2 70.1-82.4 70.1-82.4 0 49 25.2 112.9 79.8 159-26.4 8.1-85.7 29.9-71.6 53.8 11.4 19.3 196.2 12.3 249.5 6.3 53.3 6 238.1 13 249.5-6.3 14.1-23.8-45.2-45.7-71.6-53.8 54.6-46.2 79.8-110.1 79.8-159 0 0 52.1 84.6 70.1 82.4 8.5-1.1 19.5-46.4-14.5-155.8z"/></path></svg></a>` : ''}
              
              <a href="mailto:${email}" class="email-btn">联系我</a>
           </div>

           <!-- 进度条 GPU加速渲染 -->
           <div class="progress-box">
              <div class="progress-head"><span>${currentYear} 余额 ${remainingDays} 天</span><span>${pctText}%</span></div>
              <div class="progress-track">
                 <div class="progress-fill" style="transform: scaleX(${pctRatio})"></div>
              </div>
           </div>
        </div>

        <div class="tags-row">
           ${tags.map((t:string) => `<div class="tag-btn ${t==='全部'?'active':''}" onclick="filter('${t}',this)">${t}</div>`).join('')}
        </div>

        <input id="search" class="search-input" placeholder="🔍 搜索..." onkeyup="search(this.value)">

        <div id="list">
           ${linksResult.results.map((l:any) => `
             <a href="${l.url}" target="_blank" class="link-card" data-tag="${l.tag||''}" data-s="${l.title} ${l.description}">
                <div class="link-icon">
                   ${!l.icon 
                     ? `<img src="https://api.iowen.cn/favicon/${new URL(l.url).hostname}.png" loading="lazy">` 
                     : (l.icon.startsWith('http') ? `<img src="${l.icon}" loading="lazy">` : l.icon)}
                </div>
                <div class="link-main">
                   <div class="link-title">${l.title} ${l.tag?`<span class="link-tag">${l.tag}</span>`:''}</div>
                   <div class="link-desc">${l.description||l.url}</div>
                </div>
                <button class="copy-btn" onclick="copy('${l.url}',event)">📋</button>
             </a>
           `).join('')}
        </div>

        <div class="footer">
           <div class="info-pill">
              <span>👀 ${views}</span><span style="opacity:0.3">|</span><span>⏳ ${runDays} D</span><span style="opacity:0.3">|</span><span>⚡ <span id="perf">0</span>ms</span>
           </div>
           <div><a href="/admin" class="admin-link">Admin</a></div>
        </div>
      </div>

      <div id="toast" class="toast">✅ 已复制</div>

      <script>
        document.addEventListener('DOMContentLoaded', () => {
           // 计算加载耗时
           document.getElementById('perf').innerText = Math.round(performance.now() - perfStart);
           
           // 时钟 (RAF)
           const ck = document.getElementById('clock');
           function tick(){
              const d = new Date();
              const b = new Date(d.getTime() + (d.getTimezoneOffset()*60000) + (3600000*8));
              ck.innerText = b.getHours().toString().padStart(2,'0')+':'+b.getMinutes().toString().padStart(2,'0')+':'+b.getSeconds().toString().padStart(2,'0');
              requestAnimationFrame(tick);
           }
           requestAnimationFrame(tick);

           // 打字机
           const txt = "${bio || 'Hello'}";
           const el = document.getElementById('bio');
           let i = 0; 
           (function t(){if(i<txt.length){el.innerText+=txt.charAt(i++);setTimeout(t,50)}})();

           // 全局图片错误代理 (如果 Iowen 挂了，用 DDG 兜底)
           document.addEventListener('error', e => {
              if(e.target.tagName==='IMG' && !e.target.hasAttribute('data-failed')){
                 e.target.setAttribute('data-failed', 'true');
                 // 尝试 DuckDuckGo 图标源
                 try {
                    e.target.src = 'https://icons.duckduckgo.com/ip3/'+new URL(e.target.parentNode.parentNode.href).hostname+'.ico';
                 } catch(err) {}
              }
           }, true);
        });

        // QQ 智能跳转 (核心修复)
        function jumpQQ() {
           const u = "${qq}";
           if(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)){
              // 手机端：唤起资料卡
              window.location.href = "mqqapi://card/show_pslcard?src_type=internal&version=1&uin="+u+"&card_type=person&source=sharecard";
           } else {
              // 电脑端：加好友
              window.location.href = "tencent://AddContact/?fromId=45&subcmd=all&uin="+u;
           }
        }

        function filter(tag, btn) {
           document.querySelectorAll('.tag-btn').forEach(x=>x.classList.remove('active'));
           btn.classList.add('active');
           document.querySelectorAll('.link-card').forEach(l => {
              l.style.display = (tag==='全部'||l.dataset.tag===tag) ? 'flex' : 'none';
           });
        }

        function search(v) {
           v = v.toLowerCase();
           document.querySelectorAll('.link-card').forEach(l => {
              l.style.display = l.dataset.s.toLowerCase().includes(v) ? 'flex' : 'none';
           });
        }

        function copy(u, e) {
           e.preventDefault(); e.stopPropagation();
           navigator.clipboard.writeText(u);
           const t = document.getElementById('toast');
           t.classList.add('show'); 
           setTimeout(() => t.classList.remove('show'), 2000);
        }

        function toggleTheme() {
           document.body.classList.toggle('dark-mode');
           document.body.classList.toggle('light-mode');
        }

        function playMusic() {
           const a = document.getElementById('bg-audio');
           if(!a.src) a.src = "${music || ''}";
           const b = document.getElementById('music-btn');
           if(a.paused) {
              a.play(); b.style.transform = 'rotate(360deg)';
           } else {
              a.pause(); b.style.transform = 'none';
           }
        }
      </script>
    </body>
    </html>
  `)
})

app.get('/avatar', async (c) => {
  const f = "https://twbk.cn/wp-content/uploads/2025/12/tx.png"
  if(!c.env.BUCKET) return c.redirect(f)
  const o = await c.env.BUCKET.get('avatar.png')
  return o ? new Response(o.body, {headers:{'etag':o.httpEtag}}) : c.redirect(f)
})

// 后台管理 CSS
const adminCss = `body{background:#111;color:#eee;font-family:sans-serif;max-width:800px;margin:0 auto;padding:20px}.card{background:#222;border:1px solid #333;padding:20px;border-radius:10px;margin-bottom:20px}input,textarea,select{width:100%;background:#000;border:1px solid #333;color:#fff;padding:10px;margin-bottom:10px;border-radius:5px}button{width:100%;padding:10px;background:#3b82f6;color:#fff;border:none;border-radius:5px;font-weight:bold;cursor:pointer}.row{display:flex;gap:10px;border-bottom:1px solid #333;padding:10px 0;align-items:center}`

app.get('/admin', async (c) => {
  if (getCookie(c, 'auth') !== 'true') return c.html(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${adminCss}</style></head><body><form action="/api/login" method="post" style="text-align:center;margin-top:100px;"><h2>🔒 Login</h2><br><input name="password" type="password" style="width:200px"><br><button style="width:200px;margin-top:10px">Enter</button></form></body></html>`)
  
  const editId = c.req.query('edit_id')
  let editLink = null
  if (editId) editLink = await c.env.DB.prepare("SELECT * FROM links WHERE id = ?").
