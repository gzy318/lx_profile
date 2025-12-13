/**
 * LX Profile - V24.0 (Final Fix & Variable Safety)
 * 1. 修复：修正变量名引用错误 (music is not defined)。
 * 2. 稳定：使用全称变量名，防止混淆。
 * 3. 核心：保留 SSR 倒计时、手机 QQ 修复、极致性能。
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

// 错误回显
app.onError((err, c) => {
  return c.text(`Runtime Error: ${err.message}\nStack: ${err.stack}`, 500);
});

async function getConfig(db: D1Database, key: string) {
  try {
    const res = await db.prepare("SELECT value FROM config WHERE key = ?").bind(key).first();
    // @ts-ignore
    return res ? res.value : null;
  } catch (e) { return null; }
}

// CSS (保持压缩状态以提升性能)
const css = `:root{--bg:#f8fafc;--tx:#0f172a;--sb:#64748b;--cd:rgba(255,255,255,0.9);--bd:rgba(255,255,255,0.6);--ac:#3b82f6;--sh:0 4px 6px rgba(0,0,0,0.05)}@media(prefers-color-scheme:dark){:root{--bg:#020617;--tx:#f8fafc;--sb:#94a3b8;--cd:rgba(15,23,42,0.8);--bd:rgba(255,255,255,0.1);--ac:#60a5fa;--sh:0 10px 15px rgba(0,0,0,0.5)}}.dark{--bg:#020617;--tx:#f8fafc;--sb:#94a3b8;--cd:rgba(15,23,42,0.8);--bd:rgba(255,255,255,0.1);--ac:#60a5fa}.light{--bg:#f8fafc;--tx:#0f172a;--sb:#64748b;--cd:rgba(255,255,255,0.9);--bd:rgba(255,255,255,0.6);--ac:#3b82f6}*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,-apple-system,sans-serif;background:var(--bg);color:var(--tx);min-height:100vh;display:flex;flex-direction:column;align-items:center;padding:16px;transition:0.3s}.bg{position:fixed;inset:0;z-index:-1;background-size:cover;background-position:center;transition:0.3s}body.dark .bg{filter:brightness(0.3)}.w{width:100%;max-width:440px;z-index:1;animation:f 0.4s ease-out}@keyframes f{from{opacity:0;translate:0 10px}to{opacity:1;translate:0 0}}.card{background:var(--cd);backdrop-filter:blur(20px);border:1px solid var(--bd);border-radius:24px;padding:24px;margin-bottom:16px;box-shadow:var(--sh);text-align:center}.top{display:flex;justify-content:space-between;margin-bottom:12px}.pill{background:var(--cd);border:1px solid var(--bd);padding:6px 14px;border-radius:99px;font-size:12px;font-weight:700;display:flex;gap:8px;align-items:center}.btn{width:36px;height:36px;border-radius:50%;background:var(--cd);border:1px solid var(--bd);display:flex;justify-content:center;align-items:center;cursor:pointer;font-size:16px}.av{width:96px;height:96px;border-radius:50%;border:4px solid var(--cd);box-shadow:var(--sh);margin-bottom:12px;object-fit:cover;transition:0.6s}.av:hover{rotate:360deg}.h1{font-size:24px;font-weight:800;margin-bottom:4px}.bio{font-size:13px;color:var(--sb);margin-bottom:20px;min-height:1.2em}.soc{display:flex;justify-content:center;gap:16px;margin-bottom:24px}.si{width:24px;height:24px;fill:var(--sb);transition:0.2s}.si:hover{fill:var(--ac)}.em{background:var(--tx);color:var(--bg);padding:8px 20px;border-radius:12px;text-decoration:none;font-size:12px;font-weight:700}.pb{background:rgba(127,127,127,0.1);padding:14px;border-radius:16px;margin-top:8px}.ph{display:flex;justify-content:space-between;font-size:11px;font-weight:700;margin-bottom:8px;opacity:0.7}.pt{width:100%;height:6px;background:rgba(127,127,127,0.15);border-radius:99px;overflow:hidden}.pf{height:100%;background:var(--ac);border-radius:99px;transform-origin:left}.ip{width:100%;padding:14px;border-radius:16px;border:1px solid var(--bd);background:var(--cd);color:var(--tx);margin-bottom:12px;outline:0;font-size:14px}.ts{display:flex;gap:8px;overflow-x:auto;padding:2px;justify-content:center;scrollbar-width:none}.tg{padding:6px 14px;background:var(--cd);border:1px solid var(--bd);border-radius:99px;font-size:11px;font-weight:700;color:var(--sb);cursor:pointer;white-space:nowrap;transition:0.2s}.tg.a{background:var(--ac);color:#fff;border-color:var(--ac)}.lk{display:flex;align-items:center;gap:12px;padding:14px;background:var(--cd);border:1px solid var(--bd);border-radius:18px;text-decoration:none;color:inherit;margin-bottom:10px;transition:0.2s}.lk:active{scale:0.98}.lk:hover{translate:0 -2px;background:rgba(255,255,255,0.95);z-index:2}.dark .lk:hover{background:rgba(60,60,60,0.9)}.ic{width:42px;height:42px;border-radius:12px;background:rgba(127,127,127,0.1);flex-shrink:0;overflow:hidden;display:flex;justify-content:center;align-items:center;font-size:20px}.ic img{width:100%;height:100%;object-fit:cover}.mn{flex:1;min-width:0}.tt{font-size:14px;font-weight:700;margin-bottom:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ds{font-size:11px;color:var(--sb);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.bd{font-size:9px;background:rgba(59,130,246,0.1);color:var(--ac);padding:2px 6px;border-radius:4px;margin-left:6px;font-weight:600}.cp{padding:8px;background:0 0;border:none;cursor:pointer;opacity:0.4}.cp:hover{opacity:1;color:var(--ac)}.ft{margin-top:30px;text-align:center;padding-bottom:30px}.fi{display:inline-flex;gap:12px;background:rgba(0,0,0,0.8);backdrop-filter:blur(10px);color:#fff;padding:8px 20px;border-radius:99px;font-size:11px;font-weight:700}.ad{font-size:10px;color:var(--sb);text-decoration:none;font-weight:700;text-transform:uppercase;opacity:0.4;display:block;margin-top:10px}.tst{position:fixed;top:24px;left:50%;translate:-50% -60px;background:#10b981;color:#fff;padding:8px 24px;border-radius:99px;font-size:12px;font-weight:700;z-index:99;transition:0.3s}.tst.s{translate:-50% 0}.mq{white-space:nowrap;overflow:hidden;font-size:12px;font-weight:700;color:var(--ac);text-align:left}.mq div{display:inline-block;padding-left:100%;animation:m 12s linear infinite}@keyframes m{to{translate:-100% 0}}`;

app.get('/', async (c) => {
  const startTime = Date.now();
  if (!c.env.DB) return c.text('DB Not Bound', 500);

  // 1. 获取数据 (使用明确的变量名)
  const results = await Promise.all([
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

  // 2. 解构赋值 (设置默认值，防止 undefined)
  // @ts-ignore
  const linksList = results[0] ? results[0].results : [];
  const bio = results[1] || '';
  const email = results[2] || '';
  const qq = results[3] || '';
  const views = results[4] || '0';
  const bgUrl = results[5] || '';
  const siteTitle = results[6] || 'LX Profile';
  const status = results[7] || 'online';
  const startDate = results[8] || '2025-01-01';
  const notice = results[9] || '';
  const github = results[10] || '';
  const telegram = results[11] || '';
  const music = results[12] || ''; // 关键修复：确保 music 变量存在

  // 3. 统计浏览量
  c.executionCtx.waitUntil(c.env.DB.prepare("UPDATE config SET value = CAST(value AS INTEGER) + 1 WHERE key = 'views'").run().catch(()=>{}));

  // 4. SSR 倒计时 (北京时间)
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }));
  const yr = now.getFullYear();
  const start = new Date(Date.UTC(yr, 0, 1)).getTime();
  const end = new Date(Date.UTC(yr + 1, 0, 1)).getTime();
  const pct = Math.min(1, Math.max(0, ((now.getTime() - start) / (end - start))));
  const pctText = (pct * 100).toFixed(1);
  const remainingDays = Math.floor((end - now.getTime()) / 86400000);
  const runDays = Math.floor((Date.now() - new Date(startDate).getTime()) / 86400000);

  // 5. 标签
  const tags = ['全部', ...new Set(linksList.map((l:any) => l.tag ? l.tag.trim() : '').filter((t:string) => t !== ''))];
  const favicon = "https://twbk.cn/wp-content/uploads/2025/12/tx.png";

  return c.html(`<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=0"><title>${siteTitle}</title><link rel="icon" href="${favicon}"><style>${css}</style><script>if(localStorage.theme==='dark'||(!('theme' in localStorage)&&window.matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark');const perfStart = performance.now();</script></head><body><div class="bg" style="${bgUrl?`background-image:url('${bgUrl}')`:'background-color:#f8fafc'}"></div><div class="w"><div class="top"><div class="pill"><span id="ck">00:00:00</span><span style="opacity:0.2">|</span><span>CN</span></div><div style="display:flex;gap:8px">${music?`<button class="btn" onclick="pm()" id="mb">🎵<audio id="au" loop></audio></button>`:''}<button class="btn" onclick="tm()">🌗</button></div></div>${notice?`<div class="card" style="padding:10px 16px;border-left:4px solid var(--ac);text-align:left"><div class="mq"><div>🔔 ${notice}</div></div></div>`:''}<div class="card"><img src="/avatar" onerror="this.src='${favicon}'" class="av" fetchpriority="high"><h1 class="h1">${siteTitle}</h1><p class="bio" id="bio"></p><div class="soc">${github?`<a href="${github}" target="_blank"><svg class="si" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.065 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.475-1.335-5.475-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></path></svg></a>`:''}${qq?`<a href="javascript:qj()" class="si"><svg class="si" viewBox="0 0 1024 1024"><path d="M824.8 613.2c-16-51.4-34.4-94.6-62.7-165.3C766.5 262.2 689.3 112 511.5 112 331.7 112 256.4 265.2 261 447.9c-28.4 70.8-46.7 113.7-62.7 165.3-34 109.5-23 154.8-14.6 155.8 18 2.2 70.1-82.4 70.1-82.4 0 49 25.2 112.9 79.8 159-26.4 8.1-85.7 29.9-71.6 53.8 11.4 19.3 196.2 12.3 249.5 6.3 53.3 6 238.1 13 249.5-6.3 14.1-23.8-45.2-45.7-71.6-53.8 54.6-46.2 79.8-110.1 79.8-159 0 0 52.1 84.6 70.1 82.4 8.5-1.1 19.5-46.4-14.5-155.8z"/></path></svg></a>`:''}<a href="mailto:${email}" class="email-btn">联系我</a></div><div class="pb"><div class="ph"><span>${yr} 余额 ${remainingDays} 天</span><span>${pctText}%</span></div><div class="pt"><div class="pf" style="transform:scaleX(${pct})"></div></div></div></div><div class="tags">${tags.map((t:string) => `<div class="tag ${t==='全部'?'active':''}" onclick="filter('${t}',this)">${t}</div>`).join('')}</div><input id="search" class="inp" placeholder="🔍 搜索..." onkeyup="sr(this.value)"><div id="list">${linksList.map((l:any) => `<a href="${l.url}" target="_blank" class="lnk" data-tag="${l.tag||''}" data-s="${l.title} ${l.description}"><div class="ic">${!l.icon ? `<img src="https://api.iowen.cn/favicon/${new URL(l.url).hostname}.png" loading="lazy">` : (l.icon.startsWith('http') ? `<img src="${l.icon}" loading="lazy">` : l.icon)}</div><div class="mn"><div class="tt">${l.title} ${l.tag?`<span class="bdg">${l.tag}</span>`:''}</div><div class="ds">${l.description||l.url}</div></div><button class="cp" onclick="cp('${l.url}',event)">📋</button></a>`).join('')}</div><div class="ft"><div class="fi"><span>👀 ${views}</span><span style="opacity:0.3">|</span><span>⏳ ${runDays} D</span><span style="opacity:0.3">|</span><span>⚡ <span id="perf">0</span>ms</span></div><a href="/admin" class="adm">Admin</a></div></div><div id="toast" class="toast">✅ 已复制</div><script>document.addEventListener('DOMContentLoaded', () => { setTimeout(() => { document.getElementById('perf').innerText = Math.round(performance.now() - perfStart); }, 50); const ck = document.getElementById('clock'); function tick(){ const d = new Date(); const b = new Date(d.getTime() + (d.getTimezoneOffset()*60000) + (3600000*8)); ck.innerText = b.getHours().toString().padStart(2,'0')+':'+b.getMinutes().toString().padStart(2,'0')+':'+b.getSeconds().toString().padStart(2,'0'); requestAnimationFrame(tick); } requestAnimationFrame(tick); const txt = "${bio || 'Hello'}"; const el = document.getElementById('bio'); let i = 0; (function t(){if(i<txt.length){el.innerText+=txt.charAt(i++);setTimeout(t,50)}})(); document.addEventListener('error', e => { if(e.target.tagName==='IMG' && !e.target.hasAttribute('d')){ e.target.setAttribute('d', 'true'); try { e.target.src = 'https://icons.duckduckgo.com/ip3/'+new URL(e.target.parentNode.href).hostname+'.ico'; } catch(err) {} } }, true); }); function qj() { const u = "${qq}"; if(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)){ window.location.href = "mqqapi://card/show_pslcard?src_type=internal&version=1&uin="+u+"&card_type=person&source=sharecard"; } else { window.location.href = "tencent://AddContact/?fromId=45&subcmd=all&uin="+u; } } function filter(tag, btn) { document.querySelectorAll('.tag').forEach(x=>x.classList.remove('active')); btn.classList.add('active'); document.querySelectorAll('.lnk').forEach(l => { l.style.display = (tag==='全部'||l.dataset.tag===tag) ? 'flex' : 'none'; }); } function sr(v) { v = v.toLowerCase(); document.querySelectorAll('.lnk').forEach(l => { l.style.display = l.dataset.s.toLowerCase().includes(v) ? 'flex' : 'none'; }); } function cp(u, e) { e.preventDefault(); e.stopPropagation(); navigator.clipboard.writeText(u); const t = document.getElementById('toast'); t.classList.add('s'); setTimeout(() => t.classList.remove('s'), 2000); } function tm() { document.body.classList.toggle('dark'); document.body.classList.toggle('light'); } function pm() { const a = document.getElementById('au'); if(!a.src) a.src = "${music || ''}"; const b = document.getElementById('mb'); if(a.paused) { a.play(); b.style.transform = 'rotate(360deg)'; } else { a.pause(); b.style.transform = 'none'; } } </script></body></html>`)
})

app.get('/avatar', async (c) => {
  const f = "https://twbk.cn/wp-content/uploads/2025/12/tx.png"
  if(!c.env.BUCKET) return c.redirect(f)
  const o = await c.env.BUCKET.get('avatar.png')
  return o ? new Response(o.body, {headers:{'etag':o.httpEtag}}) : c.redirect(f)
})

const ac=`body{background:#111;color:#eee;font-family:sans-serif;max-width:800px;margin:0 auto;padding:20px}.c{background:#222;border:1px solid #333;padding:20px;border-radius:10px;margin-bottom:20px}input,textarea,select{width:100%;background:#000;border:1px solid #333;color:#fff;padding:10px;margin-bottom:10px;border-radius:5px}button{width:100%;padding:10px;background:#3b82f6;color:#fff;border:none;border-radius:5px;font-weight:bold;cursor:pointer}.r{display:flex;gap:10px;border-bottom:1px solid #333;padding:10px 0;align-items:center}`
app.get('/admin', async (c) => {
  if (getCookie(c, 'auth') !== 'true') return c.html(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${ac}</style></head><body><form action="/api/login" method="post" style="text-align:center;margin-top:100px;"><h2>🔒 Login</h2><br><input name="password" type="password" style="width:200px"><br><button style="width:200px;margin-top:10px">Enter</button></form></body></html>`)
  const editId = c.req.query('edit_id')
  let editLink = null
  try { if (editId) editLink = await c.env.DB.prepare("SELECT * FROM links WHERE id = ?").bind(editId).first() } catch(e) {}
  
  let linksResult = { results: [] };
  try { linksResult = await c.env.DB.prepare('SELECT * FROM links ORDER BY sort_order ASC, created_at DESC').all() } catch(e) { 
    // @ts-ignore
    linksResult = {results: []}; 
  }

  const configKeys = ['bio','email','qq','bg_url','site_title','status','start_date','notice','github','telegram','music_url'];
  const config: any = {};
  for(const k of configKeys) { config[k] = await getConfig(c.env.DB, k) || ''; }

  return c.html(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Admin</title><style>${ac}</style></head><body><div style="display:flex;justify-content:space-between;margin-bottom:20px"><h2>LX Admin</h2><a href="/" target="_blank" style="color:#3b82f6">View</a></div><div class="c"><h3>Config</h3><form action="/api/config" method="post">${Object.keys(config).map(k=>`<div style="margin-bottom:5px"><label style="font-size:10px;text-transform:uppercase;color:#888">${k}</label><input name="${k}" value="${config[k]}"></div>`).join('')}<button>Save</button></form></div><div class="c"><h3>${editLink?'Edit':'New'} Link</h3><form action="${editLink?'/api/links/update':'/api/links'}" method="post">${editLink?`<input type="hidden" name="id" value="${editLink.id}">`:''}<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><input name="title" value="${editLink?.title||''}" placeholder="Title" required><input name="url" value="${editLink?.url||''}" placeholder="URL" required></div><div style="display:grid;grid-template-columns:1fr 1fr 2fr;gap:10px"><input name="sort_order" value="${editLink?.sort_order||0}"><input name="tag" value="${editLink?.tag||''}"><input name="icon" value="${editLink?.icon||''}"></div><input name="description" value="${editLink?.description||''}"><button>${editLink?'Update':'Add'}</button></form><br>${
    // @ts-ignore
    linksResult.results.map((l:any)=>`<div class="r"><form action="/api/links/update_order" method="post" style="margin:0"><input type="hidden" name="id" value="${l.id}"><input name="sort_order" value="${l.sort_order}" style="width:30px;text-align:center" onchange="this.form.submit()"></form><div style="flex:1"><b>${l.title}</b> <small style="color:#888">${l.url}</small></div><a href="/admin?edit_id=${l.id}" style="color:#3b82f6;margin-right:10px">Edit</a><form action="/api/links/delete" method="post" style="margin:0"><input type="hidden" name="id" value="${l.id}"><button style="background:red;width:auto;padding:5px 10px;font-size:12px" onclick="return confirm('Del?')">Del</button></form></div>`).join('')}</div></body></html>`)
})

app.post('/api/login', async (c) => { const body=await c.req.parseBody(); if(body.password===(c.env.ADMIN_PASSWORD||'lx123456')){setCookie(c,'auth','true',{httpOnly:true,maxAge:86400*30,path:'/'});return c.redirect('/admin')}return c.html(`<script>alert('Error');history.back()</script>`) })
app.post('/api/config', async (c) => {if(getCookie(c,'auth')!=='true')return c.redirect('/admin');const b=await c.req.parseBody();const k=['bio','email','qq','bg_url','site_title','status','start_date','notice','github','telegram','music_url'];const s=c.env.DB.prepare("UPDATE config SET value = ? WHERE key = ?");await c.env.DB.batch(k.map(key=>s.bind(b[key],key)));return c.redirect('/admin')})
app.post('/api/links', async (c) => {if(getCookie(c,'auth')!=='true')return c.redirect('/admin');const b=await c.req.parseBody();await c.env.DB.prepare("INSERT INTO links (title, url, icon, description, sort_order, tag) VALUES (?, ?, ?, ?, ?, ?)").bind(b.title, b.url, b.icon, b.description, b.sort_order||0, b.tag).run();return c.redirect('/admin')})
app.post('/api/links/update', async (c) => {if(getCookie(c,'auth')!=='true')return c.redirect('/admin');const b=await c.req.parseBody();await c.env.DB.prepare("UPDATE links SET title=?, url=?, icon=?, description=?, sort_order=?, tag=? WHERE id=?").bind(b.title, b.url, b.icon, b.description, b.sort_order, b.tag, b.id).run();return c.redirect('/admin')})
app.post('/api/links/update_order', async (c) => {if(getCookie(c,'auth')!=='true')return c.redirect('/admin');const b=await c.req.parseBody();await c.env.DB.prepare("UPDATE links SET sort_order=? WHERE id=?").bind(b.sort_order,b.id).run();return c.redirect('/admin')})
app.post('/api/links/delete', async (c) => {if(getCookie(c,'auth')!=='true')return c.redirect('/admin');const b=await c.req.parseBody();await c.env.DB.prepare("DELETE FROM links WHERE id=?").bind(b.id).run();return c.redirect('/admin')})

export const onRequest = handle(app)