/**
 * LX Profile - V17.0 (Extreme Performance & Mobile QQ Fix)
 * 1. QQ 智能分流：手机唤起资料卡，电脑唤起加好友。
 * 2. 极致压缩：HTML/CSS 移除所有冗余空白，体积最小化。
 * 3. 全局事件委托：优化图片错误处理性能。
 */
import { Hono } from 'hono'
import { handle } from 'hono/cloudflare-pages'
import { setCookie, getCookie } from 'hono/cookie'

interface Env { DB: D1Database; BUCKET: R2Bucket; ADMIN_PASSWORD?: string; }
const app = new Hono<{ Bindings: Env }>()

async function g(db: D1Database, k: string) { try { return await db.prepare("SELECT value FROM config WHERE key = ?").bind(k).first('value') } catch (e) { return null } }

// 极致压缩的 CSS
const c = `:root{--b:#f8fafc;--t:#0f172a;--s:#64748b;--c:rgba(255,255,255,0.8);--l:rgba(255,255,255,0.6);--a:#3b82f6;--h:0 4px 6px -1px rgba(0,0,0,0.05)}@media(prefers-color-scheme:dark){:root{--b:#020617;--t:#f8fafc;--s:#94a3b8;--c:rgba(15,23,42,0.8);--l:rgba(255,255,255,0.05);--a:#60a5fa;--h:0 10px 15px -3px rgba(0,0,0,0.5)}}.dark{--b:#020617;--t:#f8fafc;--s:#94a3b8;--c:rgba(15,23,42,0.8);--l:rgba(255,255,255,0.05);--a:#60a5fa}.light{--b:#f8fafc;--t:#0f172a;--s:#64748b;--c:rgba(255,255,255,0.8);--l:rgba(255,255,255,0.6);--a:#3b82f6}*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}body{font-family:system-ui,-apple-system,sans-serif;background:var(--b);color:var(--t);min-height:100vh;display:flex;flex-direction:column;align-items:center;padding:16px;transition:0.3s}.bg{position:fixed;inset:0;z-index:-1;background-size:cover;background-position:center;transition:filter 0.3s}body.dark .bg{filter:brightness(0.3) saturate(0.8)}.w{width:100%;max-width:440px;z-index:1;animation:f 0.4s ease-out}@keyframes f{from{opacity:0;translate:0 10px}to{opacity:1;translate:0 0}}.cd{background:var(--c);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid var(--l);border-radius:24px;padding:24px;margin-bottom:16px;box-shadow:var(--h);text-align:center;position:relative}.tp{display:flex;justify-content:space-between;margin-bottom:12px}.pl{background:var(--c);border:1px solid var(--l);padding:6px 14px;border-radius:99px;font-size:12px;font-weight:700;display:flex;gap:8px;align-items:center;box-shadow:var(--h)}.bt{width:36px;height:36px;border-radius:50%;background:var(--c);border:1px solid var(--l);display:flex;justify-content:center;align-items:center;cursor:pointer;font-size:16px;transition:0.1s}.bt:active{scale:0.9}.av{width:96px;height:96px;border-radius:50%;border:4px solid var(--c);box-shadow:var(--h);margin-bottom:12px;object-fit:cover;transition:0.6s}.av:hover{rotate:360deg}.h1{font-size:24px;font-weight:800;margin-bottom:4px}.bi{font-size:13px;color:var(--s);margin-bottom:20px;min-height:1.2em;line-height:1.5}.sc{display:flex;justify-content:center;gap:16px;margin-bottom:24px}.si{width:24px;height:24px;fill:var(--s);transition:0.2s}.si:hover{fill:var(--a)}.pb{background:rgba(127,127,127,0.1);padding:14px;border-radius:16px;margin-top:8px}.ph{display:flex;justify-content:space-between;font-size:11px;font-weight:700;margin-bottom:8px;opacity:0.7}.pt{width:100%;height:6px;background:rgba(127,127,127,0.15);border-radius:9px;overflow:hidden}.pf{height:100%;background:var(--a);border-radius:9px;transform-origin:left}.ip{width:100%;padding:14px;border-radius:16px;border:1px solid var(--l);background:var(--c);color:var(--t);margin-bottom:12px;outline:0;font-size:14px}.ts{display:flex;gap:8px;overflow-x:auto;padding:2px;justify-content:center;scrollbar-width:none}.tg{padding:6px 14px;background:var(--c);border:1px solid var(--l);border-radius:99px;font-size:11px;font-weight:700;color:var(--s);cursor:pointer;white-space:nowrap;transition:0.2s}.tg.a{background:var(--a);color:#fff;border-color:var(--a)}.lk{display:flex;align-items:center;gap:12px;padding:14px;background:var(--c);border:1px solid var(--l);border-radius:18px;text-decoration:none;color:inherit;margin-bottom:10px;transition:0.2s;position:relative}.lk:active{scale:0.98}.lk:hover{translate:0 -2px;background:rgba(255,255,255,0.95);z-index:2}.dark .lk:hover{background:rgba(60,60,60,0.9)}.ic{width:42px;height:42px;border-radius:12px;background:rgba(127,127,127,0.1);flex-shrink:0;overflow:hidden;display:flex;justify-content:center;align-items:center;font-size:20px}.ic img{width:100%;height:100%;object-fit:cover}.mn{flex:1;min-width:0}.tt{font-size:14px;font-weight:700;margin-bottom:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ds{font-size:11px;color:var(--s);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.bd{font-size:9px;background:rgba(59,130,246,0.1);color:var(--a);padding:2px 6px;border-radius:4px;margin-left:6px;font-weight:600}.cp{padding:8px;background:0 0;border:none;cursor:pointer;opacity:0.4;font-size:16px}.cp:hover{opacity:1;color:var(--a)}.ft{margin-top:30px;text-align:center;padding-bottom:30px;display:flex;flex-direction:column;gap:12px;align-items:center}.fi{display:inline-flex;gap:12px;background:rgba(0,0,0,0.8);backdrop-filter:blur(10px);color:#fff;padding:8px 20px;border-radius:99px;font-size:11px;font-weight:700}.ad{font-size:10px;color:var(--s);text-decoration:none;font-weight:700;text-transform:uppercase;opacity:0.4;letter-spacing:1px}.tsb{position:fixed;top:24px;left:50%;translate:-50% -60px;background:#10b981;color:#fff;padding:8px 24px;border-radius:99px;font-size:12px;font-weight:700;z-index:99;transition:0.3s;box-shadow:0 10px 30px rgba(16,185,129,0.3)}.tsb.s{translate:-50% 0}`

app.get('/', async (c) => {
  const t0 = Date.now();
  if (!c.env.DB) return c.text('DB', 500)
  
  const [L, bio, email, qq, views, bg, ti, st, sd, nt, gh, tg, mu] = await Promise.all([
    c.env.DB.prepare('SELECT * FROM links ORDER BY sort_order ASC, created_at DESC').all(),
    g(c.env.DB, 'bio'), g(c.env.DB, 'email'), g(c.env.DB, 'qq'), g(c.env.DB, 'views'),
    g(c.env.DB, 'bg_url'), g(c.env.DB, 'site_title'), g(c.env.DB, 'status'),
    g(c.env.DB, 'start_date'), g(c.env.DB, 'notice'), g(c.env.DB, 'github'),
    g(c.env.DB, 'telegram'), g(c.env.DB, 'music_url')
  ]);

  c.executionCtx.waitUntil(c.env.DB.prepare("UPDATE config SET value = CAST(value AS INTEGER) + 1 WHERE key = 'views'").run());
  
  // 服务端 SSR 倒计时 (北京时间)
  const n = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }));
  const y = n.getFullYear();
  const s = new Date(Date.UTC(y, 0, 1)).getTime();
  const e = new Date(Date.UTC(y + 1, 0, 1)).getTime();
  const r = Math.min(1, Math.max(0, (n.getTime() - s) / (e - s)));
  const pt = (r * 100).toFixed(1);
  const ld = Math.floor((e - n.getTime()) / 86400000);
  const rd = Math.floor((Date.now() - new Date(sd as string || '2025-01-01').getTime()) / 86400000);

  // 标签去重
  const ts = ['全部', ...new Set(L.results.map((l:any)=>l.tag?l.tag.trim():'').filter((t:string)=>t!==''))];
  const fv = "https://twbk.cn/wp-content/uploads/2025/12/tx.png";

  return c.html(`<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=0"><title>${ti||'Home'}</title><link rel="icon" href="${fv}"><style>${c}</style><script>if(localStorage.theme==='dark'||(!('theme' in localStorage)&&window.matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark');const ps=performance.now();</script></head><body><div class="bg" style="${bg?`background-image:url('${bg}')`:'background-color:#f8fafc'}"></div><div class="w"><div class="tp"><div class="pl"><span id="ck">00:00:00</span><span style="opacity:0.2">|</span><span>CN</span></div><div style="display:flex;gap:8px">${mu?`<button class="bt" onclick="pm()" id="mb">🎵<audio id="au" loop></audio></button>`:''}<button class="bt" onclick="tm()">🌗</button></div></div>${nt?`<div class="cd" style="padding:10px 16px;border-left:4px solid var(--a);color:var(--a);font-weight:700;font-size:12px;text-align:left">🔔 ${nt}</div>`:''}<div class="cd"><img src="/avatar" onerror="this.src='${fv}'" class="av" fetchpriority="high"><h1 class="h1">${ti}</h1><p class="bi" id="bi"></p><div class="sc">${gh?`<a href="${gh}" target="_blank"><svg class="si" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.065 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.475-1.335-5.475-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></path></svg></a>`:''}${qq?`<a href="javascript:qj()" class="si"><svg class="si" viewBox="0 0 1024 1024"><path d="M824.8 613.2c-16-51.4-34.4-94.6-62.7-165.3C766.5 262.2 689.3 112 511.5 112 331.7 112 256.4 265.2 261 447.9c-28.4 70.8-46.7 113.7-62.7 165.3-34 109.5-23 154.8-14.6 155.8 18 2.2 70.1-82.4 70.1-82.4 0 49 25.2 112.9 79.8 159-26.4 8.1-85.7 29.9-71.6 53.8 11.4 19.3 196.2 12.3 249.5 6.3 53.3 6 238.1 13 249.5-6.3 14.1-23.8-45.2-45.7-71.6-53.8 54.6-46.2 79.8-110.1 79.8-159 0 0 52.1 84.6 70.1 82.4 8.5-1.1 19.5-46.4-14.5-155.8z"/></path></svg></a>`:''}<a href="mailto:${email}" class="em">Email</a></div><div class="pb"><div class="ph"><span>${y} 余额 ${ld} 天</span><span>${pt}%</span></div><div class="pt"><div class="pf" style="transform:scaleX(${r})"></div></div></div></div><div class="ts">${ts.map(t=>`<div class="tg ${t==='全部'?'a':''}" onclick="fl('${t}',this)">${t}</div>`).join('')}</div><input id="sh" class="ip" placeholder="🔍" onkeyup="sr(this.value)"><div id="ls">${L.results.map((l:any)=>`<a href="${l.url}" target="_blank" class="lk" data-t="${l.tag||''}" data-s="${l.title} ${l.description}"><div class="ic">${!l.icon?`<img src="https://api.iowen.cn/favicon/${new URL(l.url).hostname}.png" loading="lazy">`:(l.icon.startsWith('http')?`<img src="${l.icon}" loading="lazy">`:l.icon)}</div><div class="mn"><div class="tt">${l.title} ${l.tag?`<span class="bd">${l.tag}</span>`:''}</div><div class="ds">${l.description||l.url}</div></div><button class="cp" onclick="cp('${l.url}',event)">📋</button></a>`).join('')}</div><div class="ft"><div class="fi"><span>👀 ${views}</span><span style="opacity:0.3">|</span><span>⏳ ${runDays} D</span><span style="opacity:0.3">|</span><span>⚡ <span id="pf">0</span>ms</span></div><div><a href="/admin" class="ad">Admin</a></div></div></div><div id="ts" class="tsb">✅ OK</div><script>
        document.addEventListener('DOMContentLoaded', () => {
           document.getElementById('pf').innerText=Math.round(performance.now()-ps);
           const ck=document.getElementById('ck');
           function tk(){
              const d=new Date();
              const b=new Date(d.getTime()+(d.getTimezoneOffset()*60000)+(3600000*8));
              ck.innerText=b.getHours().toString().padStart(2,'0')+':'+b.getMinutes().toString().padStart(2,'0')+':'+b.getSeconds().toString().padStart(2,'0');
              requestAnimationFrame(tk);
           }
           requestAnimationFrame(tk);
           const tx="${bio||'Hi'}";const el=document.getElementById('bi');let i=0;(function t(){if(i<tx.length){el.innerText+=tx.charAt(i++);setTimeout(t,50)}})();
           // 全局图片错误代理
           document.addEventListener('error', e=>{if(e.target.tagName==='IMG'){e.target.src='https://icons.duckduckgo.com/ip3/'+new URL(e.target.parentNode.parentNode.href).hostname+'.ico'}},true);
        });
        // QQ 智能跳转逻辑
        function qj(){
           const u="${qq}";
           if(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)){
              window.location.href="mqqapi://card/show_pslcard?src_type=internal&version=1&uin="+u+"&card_type=person&source=sharecard";
           }else{
              window.location.href="tencent://AddContact/?fromId=45&subcmd=all&uin="+u;
           }
        }
        function fl(t,b){document.querySelectorAll('.tg').forEach(x=>x.classList.remove('a'));b.classList.add('a');document.querySelectorAll('.lk').forEach(l=>l.style.display=(t==='全部'||l.dataset.t===t)?'flex':'none')}
        function sr(v){v=v.toLowerCase();document.querySelectorAll('.lk').forEach(l=>l.style.display=l.dataset.s.toLowerCase().includes(v)?'flex':'none')}
        function cp(u,e){e.preventDefault();e.stopPropagation();navigator.clipboard.writeText(u);const t=document.getElementById('ts');t.classList.add('s');setTimeout(()=>t.classList.remove('s'),2000)}
        function tm(){document.body.classList.toggle('dark');}
        function pm(){const a=document.getElementById('au');if(!a.src)a.src="${music||''}";const b=document.getElementById('mb');a.paused?(a.play(),b.style.transform='rotate(360deg)'):(a.pause(),b.style.transform='none')}
      </script></body></html>`)
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
  if (editId) editLink = await c.env.DB.prepare("SELECT * FROM links WHERE id = ?").bind(editId).first()
  const links = await c.env.DB.prepare('SELECT * FROM links ORDER BY sort_order ASC, created_at DESC').all();
  const configKeys = ['bio','email','qq','bg_url','site_title','status','start_date','notice','github','telegram','music_url'];
  const config = {};
  for(const k of configKeys) { config[k] = await getConfig(c.env.DB, k) || ''; }
  return c.html(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Admin</title><style>${ac}</style></head><body><div style="display:flex;justify-content:space-between;margin-bottom:20px"><h2>LX Admin</h2><a href="/" target="_blank" style="color:#3b82f6">View</a></div><div class="c"><h3>Config</h3><form action="/api/config" method="post">${Object.keys(config).map(k=>`<div style="margin-bottom:5px"><label style="font-size:10px;text-transform:uppercase;color:#888">${k}</label><input name="${k}" value="${config[k]}"></div>`).join('')}<button>Save</button></form></div><div class="c"><h3>${editLink?'Edit':'New'} Link</h3><form action="${editLink?'/api/links/update':'/api/links'}" method="post">${editLink?`<input type="hidden" name="id" value="${editLink.id}">`:''}<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><input name="title" value="${editLink?.title||''}" placeholder="Title" required><input name="url" value="${editLink?.url||''}" placeholder="URL" required></div><div style="display:grid;grid-template-columns:1fr 1fr 2fr;gap:10px"><input name="sort_order" value="${editLink?.sort_order||0}"><input name="tag" value="${editLink?.tag||''}"><input name="icon" value="${editLink?.icon||''}"></div><input name="description" value="${editLink?.description||''}"><button>${editLink?'Update':'Add'}</button></form><br>${links.results.map((l:any)=>`<div class="r"><form action="/api/links/update_order" method="post" style="margin:0"><input type="hidden" name="id" value="${l.id}"><input name="sort_order" value="${l.sort_order}" style="width:30px;text-align:center" onchange="this.form.submit()"></form><div style="flex:1"><b>${l.title}</b> <small style="color:#888">${l.url}</small></div><a href="/admin?edit_id=${l.id}" style="color:#3b82f6;margin-right:10px">Edit</a><form action="/api/links/delete" method="post" style="margin:0"><input type="hidden" name="id" value="${l.id}"><button style="background:red;width:auto;padding:5px 10px;font-size:12px" onclick="return confirm('Del?')">Del</button></form></div>`).join('')}</div></body></html>`)
})

app.post('/api/login', async (c) => { const body=await c.req.parseBody(); if(body.password===(c.env.ADMIN_PASSWORD||'lx123456')){setCookie(c,'auth','true',{httpOnly:true,maxAge:86400*30,path:'/'});return c.redirect('/admin')}return c.html(`<script>alert('Error');history.back()</script>`) })
app.post('/api/config', async (c) => {if(getCookie(c,'auth')!=='true')return c.redirect('/admin');const b=await c.req.parseBody();const k=['bio','email','qq','bg_url','site_title','status','start_date','notice','github','telegram','music_url'];const s=c.env.DB.prepare("UPDATE config SET value = ? WHERE key = ?");await c.env.DB.batch(k.map(key=>s.bind(b[key],key)));return c.redirect('/admin')})
app.post('/api/links', async (c) => {if(getCookie(c,'auth')!=='true')return c.redirect('/admin');const b=await c.req.parseBody();await c.env.DB.prepare("INSERT INTO links (title, url, icon, description, sort_order, tag) VALUES (?, ?, ?, ?, ?, ?)").bind(b.title, b.url, b.icon, b.description, b.sort_order||0, b.tag).run();return c.redirect('/admin')})
app.post('/api/links/update', async (c) => {if(getCookie(c,'auth')!=='true')return c.redirect('/admin');const b=await c.req.parseBody();await c.env.DB.prepare("UPDATE links SET title=?, url=?, icon=?, description=?, sort_order=?, tag=? WHERE id=?").bind(b.title, b.url, b.icon, b.description, b.sort_order, b.tag, b.id).run();return c.redirect('/admin')})
app.post('/api/links/update_order', async (c) => {if(getCookie(c,'auth')!=='true')return c.redirect('/admin');const b=await c.req.parseBody();await c.env.DB.prepare("UPDATE links SET sort_order=? WHERE id=?").bind(b.sort_order,b.id).run();return c.redirect('/admin')})
app.post('/api/links/delete', async (c) => {if(getCookie(c,'auth')!=='true')return c.redirect('/admin');const b=await c.req.parseBody();await c.env.DB.prepare("DELETE FROM links WHERE id=?").bind(b.id).run();return c.redirect('/admin')})

export const onRequest = handle(app)
