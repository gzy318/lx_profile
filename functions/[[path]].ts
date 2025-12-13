/**
 * LX Profile - V20.0 (Syntax Fixed & China Optimized)
 * 1. 修复：严格闭合所有大括号，解决 "Expected '}'" 报错。
 * 2. 增强：SSR 服务端渲染倒计时，国内秒开。
 * 3. 稳定：内置错误诊断，0 外部依赖。
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

// 1. 全局错误捕获 (打印具体报错)
app.onError((err, c) => {
  console.error(err);
  return c.text(`程序错误 (Error): ${err.message}`, 500);
});

// 2. 工具函数
async function getConfig(db: D1Database, key: string) {
  try {
    const res = await db.prepare("SELECT value FROM config WHERE key = ?").bind(key).first();
    // @ts-ignore
    return res ? res.value : null;
  } catch (e) {
    return null;
  }
}

// 3. CSS 样式表 (本地内嵌)
const css = `
:root{--bg:#f8fafc;--txt:#0f172a;--sub:#64748b;--cd:rgba(255,255,255,0.85);--bd:rgba(255,255,255,0.6);--ac:#3b82f6;--sh:0 4px 6px -1px rgba(0,0,0,0.05)}
@media(prefers-color-scheme:dark){:root{--bg:#020617;--txt:#f8fafc;--sub:#94a3b8;--cd:rgba(15,23,42,0.8);--bd:rgba(255,255,255,0.05);--ac:#60a5fa;--sh:0 10px 15px -3px rgba(0,0,0,0.5)}}
.dark{--bg:#020617;--txt:#f8fafc;--sub:#94a3b8;--cd:rgba(15,23,42,0.8);--bd:rgba(255,255,255,0.05);--ac:#60a5fa}
.light{--bg:#f8fafc;--txt:#0f172a;--sub:#64748b;--cd:rgba(255,255,255,0.85);--bd:rgba(255,255,255,0.6);--ac:#3b82f6}
*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
body{font-family:system-ui,-apple-system,sans-serif;background:var(--bg);color:var(--txt);min-height:100vh;display:flex;flex-direction:column;align-items:center;padding:16px;transition:0.3s}
.bg{position:fixed;inset:0;z-index:-1;background-size:cover;background-position:center;transition:0.3s}
body.dark .bg{filter:brightness(0.3) saturate(0.8)}
.w{width:100%;max-width:440px;z-index:1;animation:f 0.4s ease-out}
@keyframes f{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
.cd{background:var(--cd);backdrop-filter:blur(20px);border:1px solid var(--bd);border-radius:24px;padding:24px;margin-bottom:16px;box-shadow:var(--sh);text-align:center}
.tp{display:flex;justify-content:space-between;margin-bottom:12px}
.pl{background:var(--cd);border:1px solid var(--bd);padding:6px 14px;border-radius:99px;font-size:12px;font-weight:700;display:flex;gap:8px;align-items:center;box-shadow:var(--sh)}
.bt{width:36px;height:36px;border-radius:50%;background:var(--cd);border:1px solid var(--bd);display:flex;justify-content:center;align-items:center;cursor:pointer;font-size:16px;transition:0.1s}
.bt:active{scale:0.9}
.av{width:96px;height:96px;border-radius:50%;border:4px solid var(--cd);box-shadow:var(--sh);margin-bottom:12px;object-fit:cover;transition:0.6s}
.av:hover{transform:rotate(360deg)}
.h1{font-size:24px;font-weight:800;margin-bottom:4px}
.bi{font-size:13px;color:var(--sub);margin-bottom:20px;min-height:1.2em;line-height:1.5}
.sc{display:flex;justify-content:center;gap:16px;margin-bottom:24px}
.si{width:24px;height:24px;fill:var(--sub);transition:0.2s}
.si:hover{fill:var(--ac)}
.em{background:var(--txt);color:var(--bg);padding:8px 20px;border-radius:12px;text-decoration:none;font-size:12px;font-weight:700}
.pb{background:rgba(127,127,127,0.1);padding:14px;border-radius:16px;margin-top:8px}
.ph{display:flex;justify-content:space-between;font-size:11px;font-weight:700;margin-bottom:8px;opacity:0.7}
.pt{width:100%;height:6px;background:rgba(127,127,127,0.15);border-radius:99px;overflow:hidden}
.pf{height:100%;background:var(--ac);border-radius:99px;transform-origin:left}
.ip{width:100%;padding:14px;border-radius:16px;border:1px solid var(--bd);background:var(--cd);color:var(--txt);margin-bottom:12px;outline:0;font-size:14px}
.ts{display:flex;gap:8px;overflow-x:auto;padding:2px;justify-content:center;scrollbar-width:none;margin-bottom:10px}
.tg{padding:6px 14px;background:var(--cd);border:1px solid var(--bd);border-radius:99px;font-size:11px;font-weight:700;color:var(--sub);cursor:pointer;white-space:nowrap;transition:0.2s}
.tg.a{background:var(--ac);color:#fff;border-color:var(--ac)}
.lk{display:flex;align-items:center;gap:12px;padding:14px;background:var(--cd);border:1px solid var(--bd);border-radius:18px;text-decoration:none;color:inherit;margin-bottom:10px;transition:0.2s;position:relative}
.lk:active{scale:0.98}
.lk:hover{transform:translateY(-2px);background:rgba(255,255,255,0.95);z-index:2}
.dark .lk:hover{background:rgba(60,60,60,0.9)}
.ic{width:42px;height:42px;border-radius:12px;background:rgba(127,127,127,0.1);flex-shrink:0;overflow:hidden;display:flex;justify-content:center;align-items:center;font-size:20px}
.ic img{width:100%;height:100%;object-fit:cover}
.mn{flex:1;min-width:0}
.tt{font-size:14px;font-weight:700;margin-bottom:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ds{font-size:11px;color:var(--sub);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bd{font-size:9px;background:rgba(59,130,246,0.1);color:var(--ac);padding:2px 6px;border-radius:4px;margin-left:6px;font-weight:600}
.cp{padding:8px;background:0 0;border:none;cursor:pointer;opacity:0.4;font-size:16px}
.cp:hover{opacity:1;color:var(--ac)}
.ft{margin-top:30px;text-align:center;padding-bottom:30px;display:flex;flex-direction:column;gap:12px;align-items:center}
.fi{display:inline-flex;gap:12px;background:rgba(0,0,0,0.8);backdrop-filter:blur(10px);color:#fff;padding:8px 20px;border-radius:99px;font-size:11px;font-weight:700}
.ad{font-size:10px;color:var(--sub);text-decoration:none;font-weight:700;text-transform:uppercase;opacity:0.4;letter-spacing:1px}
.tsb{position:fixed;top:24px;left:50%;transform:translate(-50%,-60px);background:#10b981;color:#fff;padding:8px 24px;border-radius:99px;font-size:12px;font-weight:700;z-index:99;transition:0.3s;box-shadow:0 10px 30px rgba(16,185,129,0.3)}
.tsb.s{transform:translate(-50%,0)}
.mq{white-space:nowrap;overflow:hidden;font-size:12px;font-weight:700;color:var(--ac);text-align:left}.mq div{display:inline-block;padding-left:100%;animation:m 12s linear infinite}@keyframes m{to{transform:translate(-100%,0)}}
`;

// 4. 前台主逻辑
app.get('/', async (c) => {
  if (!c.env.DB) return c.text('Critical Error: DB Not Bound', 500);

  // 4.1 数据并发获取
  let linksResult, bio, email, qq, views, bgUrl, siteTitle, status, startDate, notice, github, telegram, music;
  
  try {
    [linksResult, bio, email, qq, views, bgUrl, siteTitle, status, startDate, notice, github, telegram, music] = await Promise.all([
      c.env.DB.prepare('SELECT * FROM links ORDER BY sort_order ASC, created_at DESC').all(),
      getConfig(c.env.DB, 'bio'), getConfig(c.env.DB, 'email'), getConfig(c.env.DB, 'qq'),
      getConfig(c.env.DB, 'views'), getConfig(c.env.DB, 'bg_url'), getConfig(c.env.DB, 'site_title'),
      getConfig(c.env.DB, 'status'), getConfig(c.env.DB, 'start_date'), getConfig(c.env.DB, 'notice'),
      getConfig(c.env.DB, 'github'), getConfig(c.env.DB, 'telegram'), getConfig(c.env.DB, 'music_url')
    ]);
  } catch(e: any) {
    return c.text('Database Query Failed: ' + e.message, 500);
  }

  // 4.2 浏览量更新
  c.executionCtx.waitUntil(c.env.DB.prepare("UPDATE config SET value = CAST(value AS INTEGER) + 1 WHERE key = 'views'").run().catch(()=>{}));

  // 4.3 SSR 年份倒计时 (北京时间)
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }));
  const year = now.getFullYear();
  const startOfYear = new Date(Date.UTC(year, 0, 1)).getTime();
  const endOfYear = new Date(Date.UTC(year + 1, 0, 1)).getTime();
  const pctRatio = Math.min(1, Math.max(0, (now.getTime() - startOfYear) / (endOfYear - startOfYear)));
  const pctText = (pctRatio * 100).toFixed(1);
  const remainingDays = Math.floor((endOfYear - now.getTime()) / 86400000);
  
  const runDays = Math.floor((Date.now() - new Date(startDate as string || '2025-01-01').getTime()) / 86400000);

  // 4.4 标签处理
  // @ts-ignore
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
      <link rel="dns-prefetch" href="https://api.iowen.cn">
      <style>${css}</style>
      <script>
        if(localStorage.theme==='dark'||(!('theme' in localStorage)&&window.matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark');
        const perfStart = performance.now();
      </script>
    </head>
    <body>
      <div class="bg" style="${bgUrl ? `background-image: url('${bgUrl}');` : 'background-color:#f8fafc;'}"></div>
      
      <div class="w">
        <!-- Top Bar -->
        <div class="tp">
           <div class="pl">
              <span id="clock">00:00:00</span>
              <span style="opacity:0.2">|</span>
              <span>CN</span>
           </div>
           <div style="display:flex;gap:8px">
              ${music ? `<button class="bt" onclick="playMusic()" id="music-btn">🎵<audio id="bg-audio" loop></audio></button>` : ''}
              <button class="bt" onclick="toggleTheme()">🌗</button>
           </div>
        </div>

        ${notice ? `<div class="cd" style="padding:10px 16px;border-left:4px solid var(--ac);text-align:left"><div class="mq"><div>🔔 ${notice}</div></div></div>` : ''}

        <div class="cd">
           <img src="/avatar" onerror="this.src='${favicon}'" class="av" fetchpriority="high">
           <h1 class="h1">${siteTitle}</h1>
           <p class="bi" id="bio"></p>
           
           <div class="sc">
              ${github ? `<a href="${github}" target="_blank"><svg class="si" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.065 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.475-1.335-5.475-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></path></svg></a>` : ''}
              ${qq ? `<a href="javascript:jumpQQ()" class="si"><svg class="si" viewBox="0 0 1024 1024"><path d="M824.8 613.2c-16-51.4-34.4-94.6-62.7-165.3C766.5 262.2 689.3 112 511.5 112 331.7 112 256.4 265.2 261 447.9c-28.4 70.8-46.7 113.7-62.7 165.3-34 109.5-23 154.8-14.6 155.8 18 2.2 70.1-82.4 70.1-82.4 0 49 25.2 112.9 79.8 159-26.4 8.1-85.7 29.9-71.6 53.8 11.4 19.3 196.2 12.3 249.5 6.3 53.3 6 238.1 13 249.5-6.3 14.1-23.8-45.2-45.7-71.6-53.8 54.6-46.2 79.8-110.1 79.8-159 0 0 52.1 84.6 70.1 82.4 8.5-1.1 19.5-46.4-14.5-155.8z"/></path></svg></a>` : ''}
              <a href="mailto:${email}" class="em">联系我</a>
           </div>

           <div class="pb">
              <div class="ph"><span>${year} 余额 ${remainingDays} 天</span><span>${pctText}%</span></div>
              <div class="pt"><div class="pf" style="transform:scaleX(${pctRatio})"></div></div>
           </div>
        </div>

        <div class="ts">
           ${tags.map((t:string) => `<div class="tg ${t==='全部'?'act':''}" onclick="filter('${t}',this)">${t}</div>`).join('')}
        </div>

        <input id="search" class="ip" placeholder="🔍 搜索..." onkeyup="search(this.value)">

        <div id="list">
           ${
             // @ts-ignore
             linksResult.results.map((l:any) => `
             <a href="${l.url}" target="_blank" class="lk" data-tag="${l.tag||''}" data-s="${l.title} ${l.description}">
                <div class="ic">
                   ${!l.icon 
                     ? `<img src="https://api.iowen.cn/favicon/${new URL(l.url).hostname}.png" loading="lazy">` 
                     : (l.icon.startsWith('http') ? `<img src="${l.icon}" loading="lazy">` : l.icon)}
                </div>
                <div class="mn">
                   <div class="tt">${l.title} ${l.tag?`<span class="bd">${l.tag}</span>`:''}</div>
                   <div class="ds">${l.description||l.url}</div>
                </div>
                <button class="cp" onclick="copy('${l.url}',event)">📋</button>
             </a>
           `).join('')}
        </div>

        <div class="ft">
           <div class="fi">
              <span>👀 ${views}</span><span style="opacity:0.3">|</span><span>⏳ ${runDays} D</span><span style="opacity:0.3">|</span><span>⚡ <span id="perf">0</span>ms</span>
           </div>
           <div><a href="/admin" class="ad">Admin</a></div>
        </div>
      </div>

      <div id="toast" class="tsb">✅ 已复制</div>

      <script>
        document.addEventListener('DOMContentLoaded', () => {
           // 计算耗时
           setTimeout(() => {
             document.getElementById('perf').innerText = Math.round(performance.now() - perfStart);
           }, 50);
           
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

           // 全局图片错误代理
           document.addEventListener('error', e => {
              if(e.target.tagName==='IMG' && !e.target.hasAttribute('data-failed')){
                 e.target.setAttribute('data-failed', 'true');
                 try {
                    // @ts-ignore
                    e.target.src = 'https://icons.duckduckgo.com/ip3/'+new URL(e.target.parentNode.parentNode.href).hostname+'.ico';
                 } catch(err) {}
              }
           }, true);
        });

        // QQ 智能跳转
        function jumpQQ() {
           const u = "${qq}";
           if(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)){
              window.location.href = "mqqapi://card/show_pslcard?src_type=internal&version=1&uin="+u+"&card_type=person&source=sharecard";
           } else {
              window.location.href = "tencent://AddContact/?fromId=45&subcmd=all&uin="+u;
           }
        }

        function filter(tag, btn) {
           document.querySelectorAll('.tg').forEach(x=>x.classList.remove('act'));
           btn.classList.add('act');
           document.querySelectorAll('.lk').forEach(l => {
              // @ts-ignore
              l.style.display = (tag==='全部'||l.dataset.tag===tag) ? 'flex' : 'none';
           });
        }

        function search(v) {
           v = v.toLowerCase();
           document.querySelectorAll('.lk').forEach(l => {
              // @ts-ignore
              l.style.display = l.dataset.s.toLowerCase().includes(v) ? 'flex' : 'none';
           });
        }

        function copy(u, e) {
           e.preventDefault(); e.stopPropagation();
           navigator.clipboard.writeText(u);
           const t = document.getElementById('toast');
           t.classList.add('s'); 
           setTimeout(() => t.classList.remove('s'), 2000);
        }

        function toggleTheme() {
           document.body.classList.toggle('dark');
           document.body.classList.toggle('light');
        }

        function playMusic() {
           const a = document.getElementById('bg-audio');
           // @ts-ignore
           if(!a.src) a.src = "${music || ''}";
           const b = document.getElementById('music-btn');
           // @ts-ignore
           if(a.paused) {
              // @ts-ignore
              a.play(); b.style.transform = 'rotate(360deg)';
           } else {
              // @ts-ignore
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

// 后台 CSS
const ac = `body{background:#111;color:#eee;font-family:sans-serif;max-width:800px;margin:0 auto;padding:20px}.card{background:#222;border:1px solid #333;padding:20px;border-radius:10px;margin-bottom:20px}input,textarea,select{width:100%;background:#000;border:1px solid #333;color:#fff;padding:10px;margin-bottom:10px;border-radius:5px}button{width:100%;padding:10px;background:#3b82f6;color:#fff;border:none;border-radius:5px;font-weight:bold;cursor:pointer}.row{display:flex;gap:10px;border-bottom:1px solid #333;padding:10px 0;align-items:center}`

// 5. 后台管理路由
app.get('/admin', async (c) => {
  if (getCookie(c, 'auth') !== 'true') return c.html(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${ac}</style></head><body><form action="/api/login" method="post" style="text-align:center;margin-top:100px;"><h2>🔒 Login</h2><br><input name="password" type="password" style="width:200px"><br><button style="width:200px;margin-top:10px">Enter</button></form></body></html>`)
  
  const editId = c.req.query('edit_id')
  let editLink = null
  try {
    if (editId) editLink = await c.env.DB.prepare("SELECT * FROM links WHERE id = ?").bind(editId).first()
  } catch(e) {}
  
  let linksResult;
  try {
    linksResult = await c.env.DB.prepare('SELECT * FROM links ORDER BY sort_order ASC, created_at DESC').all();
  } catch(e) { linksResult = {results: []} }

  const configKeys = ['bio','email','qq','bg_url','site_title','status','start_date','notice','github','telegram','music_url'];
  const config = {};
  for(const k of configKeys) { config[k] = await getConfig(c.env.DB, k) || ''; }

  return c.html(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Admin</title><style>${ac}</style></head><body><div style="display:flex;justify-content:space-between;margin-bottom:20px"><h2>LX Admin</h2><a href="/" target="_blank" style="color:#3b82f6">View</a></div><div class="card"><h3>Config</h3><form action="/api/config" method="post">${Object.keys(config).map(k=>`<div style="margin-bottom:5px"><label style="font-size:10px;text-transform:uppercase;color:#888">${k}</label><input name="${k}" value="${config[k]}"></div>`).join('')}<button>Save</button></form></div><div class="card"><h3>${editLink?'Edit':'New'} Link</h3><form action="${editLink?'/api/links/update':'/api/links'}" method="post">${editLink?`<input type="hidden" name="id" value="${editLink.id}">`:''}<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><input name="title" value="${editLink?.title||''}" placeholder="Title" required><input name="url" value="${editLink?.url||''}" placeholder="URL" required></div><div style="display:grid;grid-template-columns:1fr 1fr 2fr;gap:10px"><input name="sort_order" value="${editLink?.sort_order||0}"><input name="tag" value="${editLink?.tag||''}"><input name="icon" value="${editLink?.icon||''}"></div><input name="description" value="${editLink?.description||''}"><button>${editLink?'Update':'Add'}</button></form><br>${linksResult.results.map((
