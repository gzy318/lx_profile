/**
 * LX Profile - V15.0 (God Speed & Dual Clock Fixed Edition)
 * 1. 修复：双时钟显示问题，独立容器，确保手机/电脑都能看见。
 * 2. 性能：CSS 极致压缩，头像 LCP 优先加载，0 阻塞。
 * 3. 视觉：进度条增加微光流光特效。
 */
import { Hono } from 'hono'
import { handle } from 'hono/cloudflare-pages'
import { setCookie, getCookie } from 'hono/cookie'

interface Env { DB: D1Database; BUCKET: R2Bucket; ADMIN_PASSWORD?: string; }
const app = new Hono<{ Bindings: Env }>()

async function getConfig(db: D1Database, key: string) {
  try { return await db.prepare("SELECT value FROM config WHERE key = ?").bind(key).first('value') } catch (e) { return null }
}

// CSS 极致压缩版 (减少体积，提升解析速度)
const css = `:root{--bg:#f3f4f6;--txt:#1f2937;--sub:#6b7280;--cd:rgba(255,255,255,0.9);--bd:rgba(255,255,255,0.6);--ac:#2563eb;--sh:0 4px 20px rgba(0,0,0,0.05)}@media(prefers-color-scheme:dark){:root{--bg:#0f172a;--txt:#f1f5f9;--sub:#94a3b8;--cd:rgba(30,41,59,0.8);--bd:rgba(255,255,255,0.05);--ac:#60a5fa;--sh:0 10px 30px rgba(0,0,0,0.5)}}.dark{--bg:#0f172a;--txt:#f1f5f9;--sub:#94a3b8;--cd:rgba(30,41,59,0.8);--bd:rgba(255,255,255,0.05);--ac:#60a5fa}.light{--bg:#f3f4f6;--txt:#1f2937;--sub:#6b7280;--cd:rgba(255,255,255,0.9);--bd:rgba(255,255,255,0.6);--ac:#2563eb}*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}body{font-family:system-ui,-apple-system,"Microsoft YaHei",sans-serif;background:var(--bg);color:var(--txt);min-height:100vh;display:flex;flex-direction:column;align-items:center;padding:15px;transition:0.3s}.bg{position:fixed;inset:0;z-index:-1;background-size:cover;background-position:center;transition:0.3s}body.dark .bg{filter:brightness(0.3) saturate(0.8) contrast(1.1)}.box{width:100%;max-width:460px;z-index:1;animation:f 0.4s ease-out}@keyframes f{from{opacity:0;translate:0 10px}to{opacity:1;translate:0 0}}.cd{background:var(--cd);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid var(--bd);border-radius:20px;padding:20px;margin-bottom:12px;box-shadow:var(--sh);text-align:center}.top{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;gap:8px}.clocks{display:flex;flex-direction:column;gap:2px;font-size:10px;font-weight:700;background:var(--cd);padding:6px 12px;border-radius:12px;border:1px solid var(--bd);box-shadow:var(--sh);min-width:110px}.ck-row{display:flex;justify-content:space-between;gap:8px}.tool{display:flex;gap:8px}.btn{width:34px;height:34px;border-radius:50%;background:var(--cd);border:1px solid var(--bd);display:flex;justify-content:center;align-items:center;cursor:pointer;font-size:14px;transition:0.2s}.btn:active{scale:0.9}.ava{width:80px;height:80px;border-radius:50%;border:3px solid var(--cd);box-shadow:var(--sh);margin-bottom:10px;object-fit:cover;transition:0.6s}.ava:hover{rotate:360deg}.h1{font-size:20px;font-weight:800;margin-bottom:4px}.bio{font-size:12px;color:var(--sub);margin-bottom:16px;min-height:1.2em}.soc{display:flex;justify-content:center;gap:16px;margin-bottom:20px}.si{width:22px;height:22px;fill:var(--sub);transition:0.2s}.si:hover{fill:var(--ac)}.em{background:var(--txt);color:var(--bg);padding:6px 16px;border-radius:10px;text-decoration:none;font-size:11px;font-weight:700}.pg-box{background:rgba(127,127,127,0.1);padding:10px;border-radius:10px;margin-top:8px}.pg-hd{display:flex;justify-content:space-between;font-size:10px;font-weight:700;margin-bottom:5px;opacity:0.7}.pg-tk{width:100%;height:6px;background:rgba(127,127,127,0.15);border-radius:3px;overflow:hidden}.pg-fl{height:100%;background:var(--ac);border-radius:3px;position:relative;overflow:hidden}.pg-fl::after{content:'';position:absolute;top:0;left:0;bottom:0;right:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.4),transparent);transform:translateX(-100%);animation:sh 2s infinite}@keyframes sh{100%{transform:translateX(100%)}}.sch{width:100%;padding:10px;border-radius:12px;border:1px solid var(--bd);background:var(--cd);color:var(--txt);margin-bottom:12px;outline:none;font-size:13px}.tgs{display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;margin-bottom:10px;justify-content:center;-ms-overflow-style:none;scrollbar-width:none}.tgs::-webkit-scrollbar{display:none}.tg{padding:5px 10px;background:var(--cd);border:1px solid var(--bd);border-radius:15px;font-size:11px;font-weight:700;color:var(--sub);cursor:pointer;white-space:nowrap;transition:0.2s}.tg.act{background:var(--ac);color:#fff;border-color:var(--ac)}.lnk{display:flex;align-items:center;gap:10px;padding:12px;background:var(--cd);border:1px solid var(--bd);border-radius:14px;text-decoration:none;color:inherit;margin-bottom:8px;transition:0.2s;position:relative}.lnk:hover{transform:translateY(-2px);background:rgba(255,255,255,0.95);z-index:2}.dark .lnk:hover{background:rgba(60,60,60,0.9)}.ic{width:36px;height:36px;border-radius:8px;background:rgba(127,127,127,0.1);flex-shrink:0;overflow:hidden;display:flex;justify-content:center;align-items:center;font-size:18px}.ic img{width:100%;height:100%;object-fit:cover}.mn{flex:1;min-width:0}.tt{font-size:13px;font-weight:700;margin-bottom:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ds{font-size:10px;color:var(--sub);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.bdg{font-size:9px;background:rgba(37,99,235,0.1);color:var(--ac);padding:1px 4px;border-radius:3px;margin-left:4px;font-weight:400}.cp{padding:6px;background:0 0;border:none;cursor:pointer;opacity:0.4}.cp:hover{opacity:1;color:var(--ac)}.ft{margin-top:30px;text-align:center;padding-bottom:30px;display:flex;flex-direction:column;gap:10px;align-items:center}.pill{display:inline-flex;gap:10px;background:rgba(0,0,0,0.8);backdrop-filter:blur(5px);color:#fff;padding:6px 14px;border-radius:50px;font-size:10px;font-weight:700}.adm{font-size:9px;color:var(--sub);text-decoration:none;font-weight:700;text-transform:uppercase;opacity:0.4;letter-spacing:1px}.toast{position:fixed;top:20px;left:50%;translate:-50% -50px;background:#10b981;color:#fff;padding:6px 20px;border-radius:20px;font-size:11px;font-weight:700;z-index:99;transition:0.3s;box-shadow:0 5px 15px rgba(0,0,0,0.1)}.toast.s{translate:-50% 0}.mq{white-space:nowrap;overflow:hidden}.mq div{display:inline-block;padding-left:100%;animation:m 12s linear infinite}@keyframes m{to{translate:-100% 0}}`;

app.get('/', async (c) => {
  const t0 = Date.now();
  if (!c.env.DB) return c.text('DB Error', 500)
  
  // 1. 数据并发获取
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
  ]);

  c.executionCtx.waitUntil(c.env.DB.prepare("UPDATE config SET value = CAST(value AS INTEGER) + 1 WHERE key = 'views'").run());
  
  // 2. 服务端计算 (北京时间)
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }));
  const yr = now.getFullYear();
  const start = new Date(Date.UTC(yr, 0, 1)).getTime();
  const end = new Date(Date.UTC(yr + 1, 0, 1)).getTime();
  const pct = Math.min(100, Math.max(0, ((now.getTime() - start) / (end - start) * 100))).toFixed(1);
  const leftDays = Math.floor((end - now.getTime()) / 86400000);
  const runDays = Math.floor((Date.now() - new Date(startDate as string || '2025-01-01').getTime()) / 86400000);

  const tags = ['全部', ...new Set(linksResult.results.map((l:any)=>l.tag?l.tag.trim():'').filter((t:string)=>t!==''))];
  const fav = "https://twbk.cn/wp-content/uploads/2025/12/tx.png";

  return c.html(`
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0">
      <title>${siteTitle || 'Home'}</title>
      <link rel="icon" href="${fav}">
      <style>${css}</style>
      <script>
        if(localStorage.theme==='dark'||(!('theme' in localStorage)&&window.matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark');
        const perfStart = performance.now();
      </script>
    </head>
    <body>
      <div class="bg" style="${bgUrl ? `background-image: url('${bgUrl}');` : 'background-color:#f3f4f6;'}"></div>
      
      <div class="box">
        <!-- 1. 顶部双时钟 (修复版：确保双行显示) -->
        <div class="top">
           <div class="clocks">
              <div class="ck-row"><span style="opacity:0.6">CN</span> <span id="c-bj" style="color:var(--ac)">Loading</span></div>
              <div class="ck-row"><span style="opacity:0.6">LOC</span> <span id="c-loc">Loading</span></div>
           </div>
           <div class="tool">
              ${music ? `<button class="btn" onclick="playMusic()" id="m-btn">🎵<audio id="bg-audio" loop></audio></button>` : ''}
              <button class="btn" onclick="theme()">🌗</button>
           </div>
        </div>

        ${notice ? `<div class="cd" style="padding:10px 15px;border-left:4px solid var(--ac);color:var(--ac);font-weight:700;font-size:12px;overflow:hidden;text-align:left"><div class="mq"><div>🔔 ${notice}</div></div></div>` : ''}

        <div class="cd">
           <!-- LCP 优化：fetchpriority="high" -->
           <img src="/avatar" onerror="this.src='${fav}'" class="ava" fetchpriority="high" alt="Avatar">
           <h1 class="h1">${siteTitle}</h1>
           <p class="bio" id="bio"></p>
           
           <div class="soc">
              ${github ? `<a href="${github}" target="_blank"><svg class="si" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.065 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.475-1.335-5.475-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></path></svg></a>` : ''}
              ${qq ? `<a href="tencent://AddContact/?fromId=45&subcmd=all&uin=${qq}"><svg class="si" viewBox="0 0 1024 1024"><path d="M824.8 613.2c-16-51.4-34.4-94.6-62.7-165.3C766.5 262.2 689.3 112 511.5 112 331.7 112 256.4 265.2 261 447.9c-28.4 70.8-46.7 113.7-62.7 165.3-34 109.5-23 154.8-14.6 155.8 18 2.2 70.1-82.4 70.1-82.4 0 49 25.2 112.9 79.8 159-26.4 8.1-85.7 29.9-71.6 53.8 11.4 19.3 196.2 12.3 249.5 6.3 53.3 6 238.1 13 249.5-6.3 14.1-23.8-45.2-45.7-71.6-53.8 54.6-46.2 79.8-110.1 79.8-159 0 0 52.1 84.6 70.1 82.4 8.5-1.1 19.5-46.4-14.5-155.8z"/></path></svg></a>` : ''}
              <a href="mailto:${email}" class="em">联系我</a>
           </div>

           <div class="pg-box">
              <div class="pg-hd"><span>${yr} 余额 ${leftDays} 天</span><span>${pct}%</span></div>
              <!-- 增加流光动画 -->
              <div class="pg-tk"><div class="pg-fl" style="width:${pct}%"></div></div>
           </div>
        </div>

        <div class="tgs">
           ${tags.map((t:string)=>`<div class="tg ${t==='全部'?'act':''}" onclick="filter('${t}',this)">${t}</div>`).join('')}
        </div>

        <input id="sch" class="sch" placeholder="🔍 搜索..." onkeyup="search(this.value)">

        <div id="lst">
           ${linksResult.results.map((l:any) => `
             <a href="${l.url}" target="_blank" class="lnk" data-tag="${l.tag||''}" data-s="${l.title} ${l.description}">
                <div class="ic">${!l.icon ? `<img src="https://api.iowen.cn/favicon/${new URL(l.url).hostname}.png" loading="lazy" onerror="this.src='https://icons.duckduckgo.com/ip3/${new URL(l.url).hostname}.ico'">` : (l.icon.startsWith('http') ? `<img src="${l.icon}" loading="lazy">` : l.icon)}</div>
                <div class="mn"><div class="tt">${l.title} ${l.tag?`<span class="bdg">${l.tag}</span>`:''}</div><div class="ds">${l.description||l.url}</div></div>
                <button class="cp" onclick="copy('${l.url}',event)">📋</button>
             </a>
           `).join('')}
        </div>

        <div class="ft">
           <div class="pill">
              <span>👀 ${views}</span><span style="opacity:0.3">|</span><span>⏳ ${runDays} 天</span><span style="opacity:0.3">|</span><span>⚡ <span id="perf">0</span>ms</span>
           </div>
           <div><a href="/admin" class="adm">Admin Panel</a></div>
        </div>
      </div>
      <div id="toast" class="toast">✅ 已复制</div>

      <script>
        // 脚本放在底部，确保不阻塞渲染，但立即执行
        document.getElementById('perf').innerText = Math.round(performance.now() - perfStart);
        
        // 1. 双时钟逻辑 (核心修复)
        function updateClocks() {
           const n = new Date();
           // CN: 强制北京时区
           document.getElementById('c-bj').innerText = n.toLocaleTimeString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false,hour:'2-digit',minute:'2-digit',second:'2-digit'});
           // LOC: 浏览器本地时区
           document.getElementById('c-loc').innerText = n.toLocaleTimeString([],{hour12:false,hour:'2-digit',minute:'2-digit',second:'2-digit'});
        }
        setInterval(updateClocks, 1000);
        updateClocks(); // 立即执行一次，防止 Loading

        const txt = "${bio || 'Hello'}";
        const el = document.getElementById('bio');
        let i=0; (function t(){if(i<txt.length){el.innerText+=txt.charAt(i++);setTimeout(t,50)}})();

        function filter(tag, btn) {
           document.querySelectorAll('.tg').forEach(b=>b.classList.remove('act'));
           btn.classList.add('act');
           document.querySelectorAll('.lnk').forEach(l => l.style.display = (tag==='全部'||l.dataset.tag===tag)?'flex':'none');
        }
        function search(v) {
           v = v.toLowerCase();
           document.querySelectorAll('.lnk').forEach(l => l.style.display = l.dataset.s.toLowerCase().includes(v)?'flex':'none');
        }
        function copy(u, e) {
           e.preventDefault(); e.stopPropagation();
           navigator.clipboard.writeText(u);
           const t = document.getElementById('toast');
           t.classList.add('s'); setTimeout(()=>t.classList.remove('s'),2000);
        }
        function theme() { document.body.classList.toggle('dark'); }
        function playMusic() {
           const a = document.getElementById('bg-audio');
           if(!a.src) a.src = "${music || ''}";
           const b = document.getElementById('m-btn');
           if(a.paused){a.play();b.style.transform='rotate(360deg)'}else{a.pause();b.style.transform='none'}
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

// 后台管理 CSS (暗黑风)
const admCss=`body{background:#111;color:#eee;font-family:sans-serif;max-width:800px;margin:0 auto;padding:20px}.card{background:#222;border:1px solid #333;padding:20px;border-radius:10px;margin-bottom:20px}input,textarea,select{width:100%;background:#000;border:1px solid #333;color:#fff;padding:10px;margin-bottom:10px;border-radius:5px}button{width:100%;padding:10px;background:#2563eb;color:#fff;border:none;border-radius:5px;font-weight:bold;cursor:pointer}.row{display:flex;gap:10px;border-bottom:1px solid #333;padding:10px 0;align-items:center}`

app.get('/admin', async (c) => {
  if (getCookie(c, 'auth') !== 'true') return c.html(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${admCss}</style></head><body><form action="/api/login" method="post" style="text-align:center;margin-top:100px;"><h2>🔒 Login</h2><br><input name="password" type="password" style="width:200px"><br><button style="width:200px;margin-top:10px">Enter</button></form></body></html>`)
  const editId = c.req.query('edit_id')
  let editLink = null
  if (editId) editLink = await c.env.DB.prepare("SELECT * FROM links WHERE id = ?").bind(editId).first()
  const links = await c.env.DB.prepare('SELECT * FROM links ORDER BY sort_order ASC, created_at DESC').all();
  const configKeys = ['bio','email','qq','bg_url','site_title','status','start_date','notice','github','telegram','music_url'];
  const config = {};
  for(const k of configKeys) { config[k] = await getConfig(c.env.DB, k) || ''; }
  return c.html(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Admin</title><style>${admCss}</style></head><body><div style="display:flex;justify-content:space-between;margin-bottom:20px"><h2>LX Admin</h2><a href="/" target="_blank" style="color:#2563eb">View</a></div><div class="card"><h3>Config</h3><form action="/api/config" method="post">${Object.keys(config).map(k=>`<div style="margin-bottom:5px"><label style="font-size:10px;text-transform:uppercase;color:#888">${k}</label><input name="${k}" value="${config[k]}"></div>`).join('')}<button>Save</button></form></div><div class="card"><h3>${editLink?'Edit':'New'} Link</h3><form action="${editLink?'/api/links/update':'/api/links'}" method="post">${editLink?`<input type="hidden" name="id" value="${editLink.id}">`:''}<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><input name="title" value="${editLink?.title||''}" placeholder="Title" required><input name="url" value="${editLink?.url||''}" placeholder="URL" required></div><div style="display:grid;grid-template-columns:1fr 1fr 2fr;gap:10px"><input name="sort_order" value="${editLink?.sort_order||0}"><input name="tag" value="${editLink?.tag||''}"><input name="icon" value="${editLink?.icon||''}"></div><input name="description" value="${editLink?.description||''}"><button>${editLink?'Update':'Add'}</button></form><br>${links.results.map((l:any)=>`<div class="row"><div style="flex:1"><b>${l.title}</b> <small style="color:#888">${l.url}</small></div><a href="/admin?edit_id=${l.id}" style="color:#2563eb;margin-right:10px">Edit</a><form action="/api/links/delete" method="post" style="margin:0"><input type="hidden" name="id" value="${l.id}"><button style="background:red;width:auto;padding:5px 10px;font-size:12px" onclick="return confirm('Del?')">Del</button></form></div>`).join('')}</div></body></html>`)
})

app.post('/api/login', async (c) => { const body=await c.req.parseBody(); if(body.password===(c.env.ADMIN_PASSWORD||'lx123456')){setCookie(c,'auth','true',{httpOnly:true,maxAge:86400*30,path:'/'});return c.redirect('/admin')}return c.html(`<script>alert('Error');history.back()</script>`) })
app.post('/api/config', async (c) => {if(getCookie(c,'auth')!=='true')return c.redirect('/admin');const b=await c.req.parseBody();const k=['bio','email','qq','bg_url','site_title','status','start_date','notice','github','telegram','music_url'];const s=c.env.DB.prepare("UPDATE config SET value = ? WHERE key = ?");await c.env.DB.batch(k.map(key=>s.bind(b[key],key)));return c.redirect('/admin')})
app.post('/api/links', async (c) => {if(getCookie(c,'auth')!=='true')return c.redirect('/admin');const b=await c.req.parseBody();await c.env.DB.prepare("INSERT INTO links (title, url, icon, description, sort_order, tag) VALUES (?, ?, ?, ?, ?, ?)").bind(b.title, b.url, b.icon, b.description, b.sort_order||0, b.tag).run();return c.redirect('/admin')})
app.post('/api/links/update', async (c) => {if(getCookie(c,'auth')!=='true')return c.redirect('/admin');const b=await c.req.parseBody();await c.env.DB.p
