/**
 * LX Profile - V13.0 (China Bulletproof Edition)
 * 1. 修复：倒计时改为纯数学计算 + SSR直出，100% 显示。
 * 2. 修复：音乐/图片改为"点击后加载"或"懒加载"，防止阻塞页面导致 JS 不执行。
 * 3. 优化：脚本提前执行，保证底部统计数据准确。
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

const css = `
:root{--bg:#f3f4f6;--txt:#1f2937;--sub:#6b7280;--card:#fff;--bd:#e5e7eb;--ac:#2563eb;--sh:0 4px 6px -1px rgba(0,0,0,0.05)}
@media(prefers-color-scheme:dark){:root{--bg:#111827;--txt:#f9fafb;--sub:#9ca3af;--card:#1f2937;--bd:#374151;--ac:#60a5fa;--sh:0 10px 15px -3px rgba(0,0,0,0.5)}}
.dark{--bg:#111827;--txt:#f9fafb;--sub:#9ca3af;--card:#1f2937;--bd:#374151;--ac:#60a5fa}
.light{--bg:#f3f4f6;--txt:#1f2937;--sub:#6b7280;--card:#fff;--bd:#e5e7eb;--ac:#2563eb}
*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
body{font-family:system-ui,-apple-system,sans-serif;background:var(--bg);color:var(--txt);min-height:100vh;display:flex;flex-direction:column;align-items:center;padding:20px;transition:0.3s}
.bg{position:fixed;inset:0;z-index:-1;background-size:cover;background-position:center;transition:0.3s}
body.dark .bg{filter:brightness(0.4)}
.main{width:100%;max-width:480px;animation:f 0.5s ease-out}
@keyframes f{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
.card{background:var(--card);border:1px solid var(--bd);border-radius:20px;padding:24px;margin-bottom:16px;box-shadow:var(--sh);text-align:center}
.top{display:flex;justify-content:space-between;margin-bottom:16px}
.pill{background:var(--card);border:1px solid var(--bd);padding:6px 12px;border-radius:99px;font-size:12px;font-weight:700;display:flex;gap:8px;align-items:center;box-shadow:var(--sh)}
.btn{width:36px;height:36px;border-radius:50%;background:var(--card);border:1px solid var(--bd);display:flex;justify-content:center;align-items:center;cursor:pointer;box-shadow:var(--sh)}
.ava{width:88px;height:88px;border-radius:50%;border:4px solid var(--card);box-shadow:var(--sh);margin-bottom:12px;object-fit:cover;transition:0.5s}
.ava:hover{transform:rotate(360deg)}
.h1{font-size:20px;font-weight:800;margin-bottom:4px}
.bio{font-size:13px;color:var(--sub);margin-bottom:16px;min-height:1.2em}
.soc{display:flex;justify-content:center;gap:16px;margin-bottom:20px}
.si{width:24px;height:24px;fill:var(--sub);transition:0.2s}
.si:hover{fill:var(--ac)}
.em{background:var(--txt);color:var(--bg);padding:8px 20px;border-radius:12px;text-decoration:none;font-size:12px;font-weight:700}
/* 倒计时条 (服务端直出) */
.pg-box{background:rgba(127,127,127,0.1);padding:12px;border-radius:12px;margin-top:10px}
.pg-hd{display:flex;justify-content:space-between;font-size:11px;font-weight:700;margin-bottom:6px;opacity:0.8}
.pg-tk{width:100%;height:8px;background:rgba(127,127,127,0.2);border-radius:4px;overflow:hidden}
.pg-fl{height:100%;background:var(--ac);border-radius:4px}
/* 列表 */
.sch{width:100%;padding:12px;border-radius:14px;border:1px solid var(--bd);background:var(--card);color:var(--txt);margin-bottom:16px;outline:none;box-shadow:var(--sh)}
.tgs{display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;margin-bottom:12px;justify-content:center}
.tgs::-webkit-scrollbar{display:none}
.tg{padding:6px 14px;background:var(--card);border:1px solid var(--bd);border-radius:20px;font-size:12px;font-weight:700;color:var(--sub);cursor:pointer;white-space:nowrap}
.tg.act{background:var(--ac);color:#fff;border-color:var(--ac)}
.lnk{display:flex;align-items:center;gap:12px;padding:14px;background:var(--card);border:1px solid var(--bd);border-radius:16px;text-decoration:none;color:inherit;margin-bottom:10px;transition:0.2s;position:relative}
.lnk:active{transform:scale(0.98)}
.lnk:hover{transform:translateY(-3px);background:rgba(255,255,255,0.9);z-index:2}
.dark .lnk:hover{background:rgba(50,50,50,0.9)}
.li-ic{width:40px;height:40px;border-radius:10px;background:rgba(127,127,127,0.1);flex-shrink:0;display:flex;justify-content:center;align-items:center;font-size:18px;overflow:hidden}
.li-ic img{width:100%;height:100%;object-fit:cover}
.li-mn{flex:1;min-width:0}
.li-tt{font-size:14px;font-weight:700;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.li-ds{font-size:11px;color:var(--sub);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.li-tg{font-size:10px;background:rgba(37,99,235,0.1);color:var(--ac);padding:2px 6px;border-radius:4px;margin-left:6px;font-weight:400}
.cp{padding:8px;background:0 0;border:none;font-size:14px;cursor:pointer;opacity:0.5}
.cp:hover{color:var(--ac);opacity:1}
.ft{margin-top:40px;text-align:center;padding-bottom:40px}
.st{display:inline-flex;gap:10px;background:#000;color:#fff;padding:8px 16px;border-radius:50px;font-size:11px;font-weight:700;margin-bottom:12px;opacity:0.9}
.adm{font-size:10px;color:var(--sub);text-decoration:none;font-weight:700;text-transform:uppercase;opacity:0.5}
.toast{position:fixed;top:20px;left:50%;transform:translateX(-50%) translateY(-50px);background:#10b981;color:#fff;padding:8px 24px;border-radius:30px;font-size:12px;font-weight:700;z-index:99;transition:0.3s;box-shadow:0 5px 15px rgba(0,0,0,0.2)}
.toast.sh{transform:translateX(-50%) translateY(0)}
.mq{white-space:nowrap;overflow:hidden}.mq div{display:inline-block;padding-left:100%;animation:m 15s linear infinite}@keyframes m{0%{transform:translate(0,0)}100%{transform:translate(-100%,0)}}
`

const adminCss = `body{background:#111;color:#eee;font-family:sans-serif;max-width:800px;margin:0 auto;padding:20px}.card{background:#222;border:1px solid #333;padding:20px;border-radius:10px;margin-bottom:20px}input,textarea,select{width:100%;background:#000;border:1px solid #333;color:#fff;padding:10px;margin-bottom:10px;border-radius:5px}button{width:100%;padding:10px;background:#2563eb;color:#fff;border:none;border-radius:5px;font-weight:bold;cursor:pointer}.row{display:flex;gap:10px;border-bottom:1px solid #333;padding:10px 0;align-items:center}`

app.get('/', async (c) => {
  const serverStartTime = Date.now();
  if (!c.env.DB) return c.text('Database Error', 500)

  // 1. 获取位置 (SSR)
  const city = c.req.raw.cf?.city || 'China'
  
  // 2. 并发数据
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

  // 3. 统计
  c.executionCtx.waitUntil(c.env.DB.prepare("UPDATE config SET value = CAST(value AS INTEGER) + 1 WHERE key = 'views'").run())
  
  // 4. 年份进度 (SSR 硬核计算 - 强制北京时间)
  // 不依赖本地 JS 计算，直接算出 HTML 字符串
  const offset = 8; // UTC+8
  const now = new Date(new Date().getTime() + offset * 3600 * 1000); // 当前北京时间
  const currentYear = now.getUTCFullYear();
  const startOfYear = new Date(Date.UTC(currentYear, 0, 1)).getTime();
  const endOfYear = new Date(Date.UTC(currentYear + 1, 0, 1)).getTime();
  const nowTs = now.getTime();
  const percent = Math.min(100, Math.max(0, ((nowTs - startOfYear) / (endOfYear - startOfYear) * 100))).toFixed(1);
  const remainingDays = Math.floor((endOfYear - nowTs) / 86400000);
  
  // 运行天数
  const runDays = Math.floor((Date.now() - new Date(startDate as string || '2025-01-01').getTime()) / 86400000);

  const tags = ['全部', ...new Set(linksResult.results.map((l:any)=>l.tag?l.tag.trim():'').filter((t:string)=>t!==''))];
  const favicon = "https://twbk.cn/wp-content/uploads/2025/12/tx.png"

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
        // 关键修复：脚本放在 Head 并立即执行，防止页面底部阻塞
        // 耗时计算：使用 performance.now() 获取更精准的加载时间
        const t0 = performance.now();
        document.addEventListener('DOMContentLoaded', () => {
           // 1. 设置加载时间 (延迟一点显示，确保页面已渲染)
           setTimeout(() => {
             document.getElementById('perf').innerText = Math.round(performance.now() - t0);
           }, 100);

           // 2. 搜索
           const inp = document.getElementById('search');
           const list = document.querySelectorAll('.lnk');
           if(inp){
             inp.addEventListener('keyup', (e) => {
                const v = e.target.value.toLowerCase();
                list.forEach(l => l.style.display = l.dataset.s.toLowerCase().includes(v)?'flex':'none');
             });
           }

           // 3. 时钟
           setInterval(() => {
              const d = new Date();
              // 手动转北京时间字符串，不依赖 locale
              const offset = 8; 
              const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
              const bj = new Date(utc + (3600000 * offset));
              const h = bj.getHours().toString().padStart(2,'0');
              const m = bj.getMinutes().toString().padStart(2,'0');
              document.getElementById('clock').innerText = h + ':' + m;
           }, 1000);
           
           // 4. 打字机
           const txt = "${bio || 'Hello'}";
           const el = document.getElementById('bio');
           let i=0; (function t(){if(i<txt.length){el.innerText+=txt.charAt(i++);setTimeout(t,50)}})();
        });

        // 全局函数
        function filter(tag, btn) {
           document.querySelectorAll('.tg').forEach(b=>b.classList.remove('act'));
           btn.classList.add('act');
           document.querySelectorAll('.lnk').forEach(l => l.style.display = (tag==='全部'||l.dataset.tag===tag)?'flex':'none');
        }
        function copy(u, e) {
           e.preventDefault(); e.stopPropagation();
           navigator.clipboard.writeText(u);
           const t = document.getElementById('toast');
           t.classList.add('sh'); setTimeout(()=>t.classList.remove('sh'),2000);
        }
        function theme() { document.body.classList.toggle('dark'); }
        
        // 关键修复：音乐懒加载 (点击时才加载资源)
        function playMusic() {
           const btn = document.getElementById('music-btn');
           const audio = document.getElementById('bg-audio');
           if(!audio.src) audio.src = "${music || ''}"; // 只有点击才赋值SRC
           if(audio.paused) { audio.play(); btn.style.transform='rotate(360deg)'; } 
           else { audio.pause(); btn.style.transform='none'; }
        }
      </script>
    </head>
    <body>
      <div class="bg" style="${bgUrl ? `background-image: url('${bgUrl}');` : 'background-color:#f3f4f6;'}"></div>
      
      <div class="main">
        <div class="top">
           <div class="pill">
              <span id="clock">00:00</span>
              <span style="opacity:0.2">|</span>
              <span>📍 ${city}</span>
           </div>
           <div style="display:flex; gap:10px;">
              ${music ? `<button class="btn" onclick="playMusic()" id="music-btn">🎵<audio id="bg-audio" loop></audio></button>` : ''}
              <button class="btn" onclick="theme()">🌗</button>
           </div>
        </div>

        ${notice ? `<div class="card" style="padding:10px 16px;border-left:4px solid var(--ac);color:var(--ac);font-weight:700;font-size:13px;overflow:hidden"><div class="mq"><div>🔔 ${notice}</div></div></div>` : ''}

        <div class="card">
           <img src="/avatar" onerror="this.src='${favicon}'" class="ava">
           <h1 class="h1">${siteTitle}</h1>
           <p class="bio" id="bio"></p>
           
           <div class="soc">
              ${github ? `<a href="${github}" target="_blank"><svg class="si" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.065 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.475-1.335-5.475-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></path></svg></a>` : ''}
              ${qq ? `<a href="tencent://AddContact/?fromId=45&subcmd=all&uin=${qq}"><svg class="si" viewBox="0 0 1024 1024"><path d="M824.8 613.2c-16-51.4-34.4-94.6-62.7-165.3C766.5 262.2 689.3 112 511.5 112 331.7 112 256.4 265.2 261 447.9c-28.4 70.8-46.7 113.7-62.7 165.3-34 109.5-23 154.8-14.6 155.8 18 2.2 70.1-82.4 70.1-82.4 0 49 25.2 112.9 79.8 159-26.4 8.1-85.7 29.9-71.6 53.8 11.4 19.3 196.2 12.3 249.5 6.3 53.3 6 238.1 13 249.5-6.3 14.1-23.8-45.2-45.7-71.6-53.8 54.6-46.2 79.8-110.1 79.8-159 0 0 52.1 84.6 70.1 82.4 8.5-1.1 19.5-46.4-14.5-155.8z"/></path></svg></a>` : ''}
              <a href="mailto:${email}" class="em">Email Me</a>
           </div>

           <div class="pg-box">
              <div class="pg-hd"><span>${currentYear} 余额 ${remainingDays} 天</span><span>${percent}%</span></div>
              <div class="pg-tk"><div class="pg-fl" style="width:${percent}%"></div></div>
           </div>
        </div>

        <div class="tgs">
           ${tags.map((t:string)=>`<div class="tg ${t==='全部'?'act':''}" onclick="filter('${t}',this)">${t}</div>`).join('')}
        </div>

        <input id="search" class="sch" placeholder="🔍 搜索...">

        <div id="list">
           ${linksResult.results.map((l:any) => `
             <a href="${l.url}" target="_blank" class="lnk" data-tag="${l.tag||''}" data-s="${l.title} ${l.description}">
                <div class="li-ic">${!l.icon ? `<img src="https://api.iowen.cn/favicon/${new URL(l.url).hostname}.png" loading="lazy">` : (l.icon.startsWith('http') ? `<img src="${l.icon}" loading="lazy">` : l.icon)}</div>
                <div class="li-mn"><div class="li-tt">${l.title} ${l.tag?`<span class="li-tg">${l.tag}</span>`:''}</div><div class="li-ds">${l.description||l.url}</div></div>
                <button class="cp" onclick="copy('${l.url}',event)">📋</button>
             </a>
           `).join('')}
        </div>

        <div class="ft">
           <div class="st">
              <span>👀 ${views}</span><span style="opacity:0.2">|</span><span>⏳ ${runDays} 天</span><span style="opacity:0.2">|</span><span>⚡ <span id="perf">0</span>ms</span>
           </div>
           <div><a href="/admin" class="adm">Admin Panel</a></div>
        </div>
      </div>
      <div id="toast" class="toast">✅ 已复制</div>
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

app.get('/admin', async (c) => {
  if (getCookie(c, 'auth') !== 'true') return c.html(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${adminCss}</style></head><body><form action="/api/login" method="post" style="text-align:center;margin-top:100px;"><h2>🔒 Admin</h2><br><input name="password" type="password" placeholder="Passcode" style="width:200px"><br><button style="width:200px;margin-top:10px">Login</button></form></body></html>`)
  const editId = c.req.query('edit_id')
  let editLink = null
  if (editId) editLink = await c.env.DB.prepare("SELECT * FROM links WHERE id = ?").bind(editId).first()
  const links = await c.env.DB.prepare('SELECT * FROM links ORDER BY sort_order ASC, created_at DESC').all();
  const configKeys = ['bio','email','qq','bg_url','site_title','status','start_date','notice','github','telegram','music_url'];
  const config = {};
  for(const k of configKeys) { config[k] = await getConfig(c.env.DB, k) || ''; }
  return c.html(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${adminCss}</style></head><body><div style="display:flex;justify-content:space-between"><h2>LX Admin</h2><a href="/" target="_blank" style="color:#2563eb">View</a></div><div class="card"><h3>Config</h3><form action="/api/config" method="post">${Object.keys(config).map(k=>`<div style="margin-bottom:5px"><label style="font-size:10px;text-transform:uppercase;color:#888">${k}</label><input name="${k}" value="${config[k]}"></div>`).join('')}<button>Save</button></form></div><div class="card"><h3>Link</h3><form action="${editLink?'/api/links/update':'/api/links'}" method="post">${editLink?`<input type="hidden" name="id" value="${editLink.id}">`:''}<input name="title" value="${editLink?.title||''}" placeholder="Title" required><input name="url" value="${editLink?.url||''}" placeholder="URL" required><input name="sort_order" value="${editLink?.sort_order||0}" placeholder="Sort"><input name="tag" value="${editLink?.tag||''}" placeholder="Tag"><input name="icon" value="${editLink?.icon||''}" placeholder="Icon"><input name="description" value="${editLink?.description||''}" placeholder="Desc"><button>${editLink?'Update':'Add'}</button></form><br>${links.results.map((l:any)=>`<div class="row"><form action="/api/links/update_order" method="post" style="margin:0"><input type="hidden" name="id" value="${l.id}"><input name="sort_order" value="${l.sort_order}" style="width:30px;text-align:center" onchange="this.form.submit()"></form><div style="flex:1"><b>${l.title}</b><br><small>${l.url}</small></div><a href="/admin?edit_id=${l.id}" style="color:#2563eb">Edit</a><form action="/api/links/delete" method="post" style="margin:0"><input type="hidden" name="id" value="${l.id}"><button style="background:red">Del</button></form></div>`).join('')}</div></body></html>`)
})

app.post('/api/login', async (c) => { const body=await c.req.parseBody(); const pwd=c.env.ADMIN_PASSWORD||'lx123456'; if(body.password===pwd){setCookie(c,'auth','true',{httpOnly:true,maxAge:86400*30,path:'/'});return c.redirect('/admin')} return c.html(`<script>alert('Error');history.back()</script>`) })
app.post('/api/config', async (c) => {if(getCookie(c,'auth')!=='true')return c.redirect('/admin');const body=await c.req.parseBody();const keys=['bio','email','qq','bg_url','site_title','status','start_date','notice','github','telegram','music_url'];const stmt=c.env.DB.prepare("UPDATE config SET value = ? WHERE key = ?");await c.env.DB.batch(keys.map(k=>stmt.bind(body[k],k)));return c.redirect('/admin')})
app.post('/api/links', async (c) => {if(getCookie(c,'auth')!=='true')return c.redirect('/admin');const body=await c.req.parseBody();await c.env.DB.prepare("INSERT INTO links (title, url, icon, description, sort_order, tag) VALUES (?, ?, ?, ?, ?, ?)").bind(body.title, body.url, body.icon, body.description, body.sort_order||0, body.tag).run();return c.redirect('/admin')})
app.post('/api/links/update', async (c) => {if(getCookie(c,'auth')!=='true')return c.redirect('/admin');const body=await c.req.parseBody();await c.env.DB.prepare("UPDATE links SET title=?, url=?, icon=?, description=?, sort_order=?, tag=? WHERE id=?").bind(body.title, body.url, body.icon, body.description, body.sort_order, body.tag, body.id).run();return c.redirect
