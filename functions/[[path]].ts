/**
 * LX Profile - V28.1 (Dark Mode Fixed Edition)
 * 1. 修复：前台黑暗模式切换按钮点击无反应的问题 (函数名统一为 toggleTheme)。
 * 2. 优化：黑暗模式状态持久化 (localStorage)，刷新页面保持状态。
 * 3. 保持：V28 的所有高颜值 UI 和 SSR 极速性能。
 */
import { Hono } from 'hono'
import { handle } from 'hono/cloudflare-pages'
import { setCookie, getCookie } from 'hono/cookie'

interface Env { DB: D1Database; BUCKET: R2Bucket; ADMIN_PASSWORD?: string; }
const app = new Hono<{ Bindings: Env }>()

async function getConfig(db: D1Database, key: string) {
  try { return await db.prepare("SELECT value FROM config WHERE key = ?").bind(key).first('value') } catch (e) { return null }
}

// ------ 前端 CSS (V28 美化 + 黑暗模式修复) ------
const frontCss = `
:root{--bg:#f8fafc;--txt:#0f172a;--sub:#64748b;--cd:rgba(255,255,255,0.85);--bd:rgba(255,255,255,0.6);--ac:#3b82f6;--sh:0 8px 30px rgba(0,0,0,0.08)}
/* 黑暗模式变量定义 */
html.dark{--bg:#020617;--txt:#f8fafc;--sub:#94a3b8;--cd:rgba(15,23,42,0.8);--bd:rgba(255,255,255,0.05);--ac:#60a5fa;--sh:0 10px 30px -5px rgba(0,0,0,0.5)}
@media(prefers-color-scheme:dark){:root:not(.light){--bg:#020617;--txt:#f8fafc;--sub:#94a3b8;--cd:rgba(15,23,42,0.8);--bd:rgba(255,255,255,0.05);--ac:#60a5fa;--sh:0 10px 30px -5px rgba(0,0,0,0.5)}}

*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
body{font-family:system-ui,-apple-system,sans-serif;background:var(--bg);color:var(--txt);min-height:100vh;display:flex;flex-direction:column;align-items:center;padding:20px;transition:background 0.3s, color 0.3s}
.bg{position:fixed;inset:0;z-index:-1;background-size:cover;background-position:center;transition:filter 0.3s}
html.dark .bg{filter:brightness(0.3) saturate(0.8)}

.box{width:100%;max-width:440px;z-index:1;animation:f 0.5s cubic-bezier(0.2,0.8,0.2,1)}
@keyframes f{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}

/* 卡片 */
.cd{background:var(--cd);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid var(--bd);border-radius:24px;padding:24px;margin-bottom:16px;box-shadow:var(--sh);text-align:center;position:relative;overflow:hidden;transition:background 0.3s, border-color 0.3s}

/* 顶部栏 */
.top{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
.pill{background:var(--cd);border:1px solid var(--bd);padding:6px 14px;border-radius:99px;font-size:12px;font-weight:700;display:flex;gap:8px;align-items:center;box-shadow:var(--sh)}
.btns{display:flex;gap:8px}
.btn{width:36px;height:36px;border-radius:50%;background:var(--cd);border:1px solid var(--bd);display:flex;justify-content:center;align-items:center;cursor:pointer;font-size:16px;transition:0.2s}
.btn:active{transform:scale(0.9)}

/* 头像与状态 */
.ava-box{position:relative;width:96px;height:96px;margin:0 auto 12px auto}
.ava{width:100%;height:100%;border-radius:50%;border:4px solid var(--cd);box-shadow:var(--sh);object-fit:cover;transition:0.6s}
.ava:hover{transform:rotate(360deg)}
.status-dot{position:absolute;bottom:5px;right:5px;width:18px;height:18px;border:3px solid var(--cd);border-radius:50%;animation:pulse 2s infinite}
@keyframes pulse{0%{box-shadow:0 0 0 0 rgba(255,255,255,0.4)}70%{box-shadow:0 0 0 6px rgba(255,255,255,0)}}

.h1{font-size:24px;font-weight:800;margin-bottom:4px;letter-spacing:-0.5px}
.bio{font-size:13px;color:var(--sub);margin-bottom:24px;min-height:1.2em;line-height:1.5}

/* 社交 */
.soc{display:flex;justify-content:center;gap:20px;margin-bottom:24px;align-items:center}
.si{width:26px;height:26px;fill:var(--sub);transition:0.2s;cursor:pointer}
.si:hover{fill:var(--ac);transform:translateY(-2px)}
.em{background:linear-gradient(135deg, var(--txt), #475569);color:var(--bg);padding:10px 24px;border-radius:99px;text-decoration:none;font-size:13px;font-weight:700;box-shadow:0 4px 15px rgba(0,0,0,0.15);transition:0.2s;display:flex;align-items:center;gap:6px}
.em:hover{transform:translateY(-2px);box-shadow:0 8px 20px rgba(0,0,0,0.25)}

/* 进度条 */
.pg-box{background:rgba(127,127,127,0.08);padding:14px;border-radius:16px;margin-top:12px;border:1px solid var(--bd)}
.pg-hd{display:flex;justify-content:space-between;font-size:11px;font-weight:700;margin-bottom:8px;opacity:0.7}
.pg-tk{width:100%;height:6px;background:rgba(127,127,127,0.1);border-radius:99px;overflow:hidden}
.pg-fl{height:100%;background:var(--ac);border-radius:99px;transform-origin:left;will-change:transform}

/* 列表 */
.sch{width:100%;padding:14px;border-radius:16px;border:1px solid var(--bd);background:var(--cd);color:var(--txt);margin-bottom:12px;outline:none;font-size:14px;transition:0.2s}
.sch:focus{border-color:var(--ac);box-shadow:0 0 0 3px rgba(59,130,246,0.1)}
.tgs{display:flex;gap:8px;overflow-x:auto;padding:2px 2px 10px 2px;justify-content:center;-ms-overflow-style:none;scrollbar-width:none}
.tgs::-webkit-scrollbar{display:none}
.tg{padding:6px 14px;background:var(--cd);border:1px solid var(--bd);border-radius:99px;font-size:11px;font-weight:700;color:var(--sub);cursor:pointer;white-space:nowrap;transition:0.2s}
.tg.act{background:var(--ac);color:#fff;border-color:var(--ac)}
.lnk{display:flex;align-items:center;gap:14px;padding:16px;background:var(--cd);border:1px solid var(--bd);border-radius:20px;text-decoration:none;color:inherit;margin-bottom:10px;transition:0.2s;position:relative}
.lnk:active{transform:scale(0.98)}
.lnk:hover{transform:translateY(-2px);background:rgba(255,255,255,0.95);z-index:2;border-color:var(--ac)}
html.dark .lnk:hover{background:rgba(60,60,60,0.9)}
.ic{width:44px;height:44px;border-radius:12px;background:rgba(127,127,127,0.1);flex-shrink:0;overflow:hidden;display:flex;justify-content:center;align-items:center;font-size:22px}
.ic img{width:100%;height:100%;object-fit:cover}
.mn{flex:1;min-width:0}
.tt{font-size:15px;font-weight:700;margin-bottom:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ds{font-size:12px;color:var(--sub);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bdg{font-size:10px;background:rgba(59,130,246,0.1);color:var(--ac);padding:2px 6px;border-radius:4px;margin-left:6px;font-weight:600}
.cp{padding:8px;background:0 0;border:none;cursor:pointer;opacity:0.3;font-size:16px}
.cp:hover{opacity:1;color:var(--ac)}

.ft{margin-top:30px;text-align:center;padding-bottom:40px;display:flex;flex-direction:column;gap:12px;align-items:center}
.info{display:inline-flex;gap:12px;background:rgba(0,0,0,0.8);backdrop-filter:blur(10px);color:#fff;padding:8px 20px;border-radius:99px;font-size:11px;font-weight:700}
.adm{font-size:10px;color:var(--sub);text-decoration:none;font-weight:700;text-transform:uppercase;opacity:0.4;letter-spacing:1px;transition:0.2s}
.adm:hover{opacity:1;color:var(--ac)}
.toast{position:fixed;top:24px;left:50%;translate:-50% -60px;background:#10b981;color:#fff;padding:10px 24px;border-radius:99px;font-size:13px;font-weight:700;z-index:99;transition:0.3s;box-shadow:0 10px 30px rgba(16,185,129,0.3)}
.toast.s{translate:-50% 0}
.mq{white-space:nowrap;overflow:hidden;font-size:12px;font-weight:700;color:var(--ac);text-align:left}.mq div{display:inline-block;padding-left:100%;animation:m 15s linear infinite}@keyframes m{to{translate:-100% 0}}
`;

// ------ 后台美化 CSS (V28 极光深色版) ------
const adminCss = `
:root { --bg:#0f172a; --card:#1e293b; --text:#e2e8f0; --sub:#94a3b8; --border:#334155; --accent:#3b82f6; --input:#020617; }
body { font-family: system-ui, -apple-system, sans-serif; background: var(--bg); color: var(--text); margin: 0; min-height: 100vh; font-size: 14px; }
a { text-decoration: none; color: inherit; transition: 0.2s; }
.nav { background: rgba(30,41,59,0.9); backdrop-filter: blur(10px); border-bottom: 1px solid var(--border); padding: 0 20px; height: 60px; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 10; }
.logo { font-weight: 800; font-size: 18px; color: #fff; letter-spacing: -0.5px; }
.logo span { color: var(--accent); }
.preview-btn { background: rgba(59,130,246,0.1); color: var(--accent); padding: 6px 12px; border-radius: 6px; font-weight: 600; font-size: 12px; border: 1px solid rgba(59,130,246,0.2); }
.preview-btn:hover { background: var(--accent); color: #fff; }
.container { max-width: 1100px; margin: 30px auto; padding: 0 20px; display: grid; grid-template-columns: 320px 1fr; gap: 24px; }
@media (max-width: 800px) { .container { grid-template-columns: 1fr; } }
.panel { background: var(--card); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.2); }
.panel-head { padding: 15px 20px; border-bottom: 1px solid var(--border); background: rgba(255,255,255,0.02); font-weight: 700; color: var(--sub); font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; display: flex; justify-content: space-between; align-items: center; }
.panel-body { padding: 20px; }
.form-grid { display: grid; gap: 16px; }
.field { display: flex; flex-direction: column; gap: 6px; }
.label { font-size: 11px; font-weight: 700; color: var(--sub); text-transform: uppercase; }
.input { background: var(--input); border: 1px solid var(--border); color: #fff; padding: 10px 12px; border-radius: 8px; font-size: 13px; transition: 0.2s; outline: none; width: 100%; box-sizing: border-box; }
.input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
textarea.input { resize: vertical; min-height: 80px; line-height: 1.5; }
select.input { appearance: none; background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e"); background-repeat: no-repeat; background-position: right 10px center; background-size: 14px; }
.btn { width: 100%; padding: 12px; border-radius: 8px; font-weight: 700; font-size: 13px; cursor: pointer; border: none; transition: 0.2s; text-align: center; }
.btn-primary { background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; box-shadow: 0 4px 10px rgba(37,99,235,0.3); }
.btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
.btn-add { background: linear-gradient(135deg, #10b981, #059669); color: white; box-shadow: 0 4px 10px rgba(16,185,129,0.3); }
.btn-add:hover { opacity: 0.9; transform: translateY(-1px); }
.btn-danger { background: rgba(239,68,68,0.1); color: #ef4444; padding: 4px 10px; font-size: 11px; border-radius: 4px; }
.btn-danger:hover { background: #ef4444; color: #fff; }
.btn-edit { background: rgba(59,130,246,0.1); color: var(--accent); padding: 4px 10px; font-size: 11px; border-radius: 4px; }
.btn-edit:hover { background: var(--accent); color: #fff; }
.link-list { display: flex; flex-direction: column; gap: 4px; }
.link-item { display: flex; align-items: center; gap: 12px; padding: 12px; background: rgba(255,255,255,0.02); border-radius: 8px; border: 1px solid transparent; transition: 0.2s; }
.link-item:hover { background: rgba(255,255,255,0.04); border-color: var(--border); }
.link-sort { width: 32px; text-align: center; background: var(--input); border: 1px solid var(--border); color: var(--sub); padding: 4px; border-radius: 4px; font-size: 11px; }
.link-icon { width: 32px; height: 32px; background: var(--input); border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 16px; border: 1px solid var(--border); color: var(--sub); overflow: hidden; flex-shrink: 0; }
.link-info { flex: 1; min-width: 0; }
.link-title { font-weight: 700; font-size: 13px; color: #fff; display: flex; align-items: center; gap: 6px; }
.link-tag { font-size: 9px; background: rgba(59,130,246,0.2); color: var(--accent); padding: 1px 5px; border-radius: 3px; }
.link-url { font-size: 11px; color: var(--sub); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.actions { display: flex; gap: 8px; }
.login-wrapper { display: flex; align-items: center; justify-content: center; height: 100vh; background: var(--bg); }
.login-box { width: 100%; max-width: 340px; padding: 30px; background: var(--card); border: 1px solid var(--border); border-radius: 16px; text-align: center; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3); }
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
  
  // 状态颜色
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
    // 初始化黑暗模式
    if(localStorage.theme==='dark'||(!('theme' in localStorage)&&window.matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark');
    const perfStart = performance.now();
  </script></head><body><div class="bg" style="${bgUrl ? `background-image: url('${bgUrl}');` : 'background-color:#f8fafc;'}"></div><div class="box"><div class="top"><div class="pill"><span id="ck">00:00:00</span><span style="opacity:0.2">|</span><span>CN</span></div><div class="btns">${music ? `<button class="btn" onclick="playMusic()" id="mb">🎵<audio id="au" loop></audio></button>` : ''}<button class="btn" onclick="toggleTheme()">🌗</button></div></div>${notice ? `<div class="cd" style="padding:10px 16px;border-left:4px solid var(--ac);color:var(--ac);font-weight:700;font-size:12px;text-align:left"><div class="mq"><div>🔔 ${notice}</div></div></div>` : ''}<div class="cd"><div class="ava-box"><img src="/avatar" onerror="this.src='${fav}'" class="ava" fetchpriority="high"><div class="status-dot" style="background:${curStColor};box-shadow:0 0 10px ${curStColor}"></div></div><h1 class="h1">${siteTitle}</h1><p class="bio" id="bio"></p><div class="soc">${github ? `<a href="${github}" target="_blank"><svg class="si" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.065 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.475-1.335-5.475-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></path></svg></a>` : ''}${telegram ? `<a href="${telegram}" target="_blank"><svg class="si" viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.14-.24.24-.44.24l.197-2.97 5.407-4.882c.232-.204-.055-.317-.366-.113L7.18 13.9l-2.87-.898c-.628-.19-.643-.628.131-.928l11.22-4.322c.52-.19.974.12.833.469z"/></svg></a>`:''}${qq ? `<a href="javascript:jumpQQ()" class="si"><svg class="si" viewBox="0 0 1024 1024"><path d="M824.8 613.2c-16-51.4-34.4-94.6-62.7-165.3C766.5 262.2 689.3 112 511.5 112 331.7 112 256.4 265.2 261 447.9c-28.4 70.8-46.7 113.7-62.7 165.3-34 109.5-23 154.8-14.6 155.8 18 2.2 70.1-82.4 70.1-82.4 0 49 25.2 112.9 79.8 159-26.4 8.1-85.7 29.9-71.6 53.8 11.4 19.3 196.2 12.3 249.5 6.3 53.3 6 238.1 13 249.5-6.3 14.1-23.8-45.2-45.7-71.6-53.8 54.6-46.2 79.8-110.1 79.8-159 0 0 52.1 84.6 70.1 82.4 8.5-1.1 19.5-46.4-14.5-155.8z"/></path></svg></a>` : ''}<a href="mailto:${email}" class="em"><span>✉️</span> 联系我</a></div><div class="pg-box"><div class="pg-hd"><span>${yr} 余额 ${leftDays} 天</span><span>${pctText}%</span></div><div class="pg-tk"><div class="pg-fl" style="transform: scaleX(${pctRatio})"></div></div></div></div><div class="tgs">${tags.map((t:string) => `<div class="tg ${t==='全部'?'act':''}" onclick="filter('${t}',this)">${t}</div>`).join('')}</div><input id="sch" class="sch" placeholder="🔍 搜索..." onkeyup="search(this.value)"><div id="lst">${links.results.map((l:any) => `<a href="${l.url}" target="_blank" class="lnk" data-t="${l.tag||''}" data-s="${l.title} ${l.description}"><div class="ic">${!l.icon ? `<img src="https://api.iowen.cn/favicon/${new URL(l.url).hostname}.png" loading="lazy">` : (l.icon.startsWith('http') ? `<img src="${l.icon}" loading="lazy">` : l.icon)}</div><div class="mn"><div class="tt">${l.title} ${l.tag?`<span class="bdg">${l.tag}</span>`:''}</div><div class="ds">${l.description||l.url}</div></div><button class="cp" onclick="copy('${l.url}',event)">📋</button></a>`).join('')}</div><div class="ft"><div class="info"><span>👀 ${views}</span><span style="opacity:0.3">|</span><span>⏳ ${runDays} D</span><span style="opacity:0.3">|</span><span>⚡ <span id="perf">0</span>ms</span></div><div><a href="/admin" class="adm">管理后台</a></div></div></div><div id="toast" class="toast">✅ 已复制</div><script>document.addEventListener('DOMContentLoaded', () => { setTimeout(() => { document.getElementById('perf').innerText = Math.round(performance.now() - perfStart); }, 50); const ck = document.getElementById('clock'); function tick(){ const d = new Date(); const b = new Date(d.getTime() + (d.getTimezoneOffset()*60000) + (3600000*8)); ck.innerText = b.getHours().toString().padStart(2,'0')+':'+b.getMinutes().toString().padStart(2,'0')+':'+b.getSeconds().toString().padStart(2,'0'); requestAnimationFrame(tick); } requestAnimationFrame(tick); const txt = "${bio || 'Hello'}"; const el = document.getElementById('bio'); let i = 0; (function t(){if(i<txt.length){el.innerText+=txt.charAt(i++);setTimeout(t,50)}})(); document.addEventListener('error', e => { if(e.target.tagName==='IMG' && !e.target.hasAttribute('d')){ e.target.setAttribute('d', 'true'); try { e.target.src = 'https://icons.duckduckgo.com/ip3/'+new URL(e.target.parentNode.href).hostname+'.ico'; } catch(err) {} } }, true); }); function qj() { const u = "${qq}"; if(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)){ window.location.href = "mqqapi://card/show_pslcard?src_type=internal&version=1&uin="+u+"&card_type=person&source=sharecard"; } else { window.location.href = "tencent://AddContact/?fromId=45&subcmd=all&uin="+u; } } function filter(tag, btn) { document.querySelectorAll('.tg').forEach(x=>x.classList.remove('active')); btn.classList.add('active'); document.querySelectorAll('.lnk').forEach(l => { l.style.display = (tag==='全部'||l.dataset.tag===tag) ? 'flex' : 'none'; }); } function search(v) { v = v.toLowerCase(); document.querySelectorAll('.lnk').forEach(l => { l.style.display = l.dataset.s.toLowerCase().includes(v) ? 'flex' : 'none'; }); } function copy(u, e) { e.preventDefault(); e.stopPropagation(); navigator.clipboard.writeText(u); const t = document.getElementById('toast'); t.classList.add('s'); setTimeout(() => t.classList.remove('s'), 2000); } 
  // 关键修复：toggleTheme 函数
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
  if (cookie !== 'true') return c.html(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>后台登录</title><style>${adminCss}</style></head><body><div class="login-wrapper"><div class="login-box"><div class="login-icon">🔐</div><h2 style="margin:0 0 20px 0;color:#fff">后台管理</h2><form action="/api/login" method="post"><div class="field"><input type="password" name="password" class="input" placeholder="输入密码" style="text-align:center"></div><button class="btn btn-primary" style="margin-top:20px">立即解锁</button></form></div></div></body></html>`)
  
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
    <div class="container">
      <div class="sidebar">
        <div class="panel">
          <div class="panel-head">系统配置</div>
          <div class="panel-body"><form action="/api/config" method="post" class="form-grid">
            ${Object.keys(config).map(k=> k === 'status' ? `
              <div class="field"><label class="label">${labelMap[k]}</label>
              <select name="${k}" class="input">
                <option value="online" ${config[k]==='online'?'selected':''}>🟢 在线 (Online)</option>
                <option value="busy" ${config[k]==='busy'?'selected':''}>🔴 忙碌 (Busy)</option>
                <option value="coding" ${config[k]==='coding'?'selected':''}>🟣 摸鱼 (Coding)</option>
                <option value="away" ${config[k]==='away'?'selected':''}>🟡 离开 (Away)</option>
                <option value="offline" ${config[k]==='offline'?'selected':''}>⚫ 隐身 (Offline)</option>
              </select></div>
            ` : `
              <div class="field"><label class="label">${labelMap[k]||k}</label>
              ${k==='bio'||k==='notice'?`<textarea name="${k}" class="input">${config[k]}</textarea>`:`<input type="text" name="${k}" value="${config[k]}" class="input">`}
              </div>`).join('')}
            <button class="btn btn-primary">保存配置</button>
          </form></div>
        </div>
      </div>
      <div class="content">
        <div class="panel">
          <div class="panel-head"><span>${editLink?'✏️ 编辑链接':'✨ 添加链接'}</span>${editLink?'<a href="/admin" class="btn-danger" style="text-decoration:none">取消</a>':''}</div>
          <div class="panel-body"><form action="${editLink?'/api/links/update':'/api/links'}" method="post" class="form-grid">
            ${editLink?`<input type="hidden" name="id" value="${editLink.id}">`:''}
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px"><div class="field"><label class="label">标题</label><input name="title" value="${editLink?.title||''}" class="input" required></div><div class="field"><label class="label">链接</label><input name="url" value="${editLink?.url||''}" class="input" required></div></div>
            <div style="display:grid;grid-template-columns:1fr 1fr 2fr;gap:15px"><div class="field"><label class="label">排序</label><input name="sort_order" value="${editLink?.sort_order||0}" class="input"></div><div class="field"><label class="label">标签</label><input name="tag" value="${editLink?.tag||''}" class="input"></div><div class="field"><label class="label">图标</label><input name="icon" value="${editLink?.icon||''}" class="input" placeholder="Emoji 或 URL"></div></div>
            <div class="field"><label class="label">描述</label><input name="description" value="${editLink?.description||''}" class="input"></div>
            <button class="${editLink?'btn btn-primary':'btn btn-add'}" style="${!editLink?'background:#10b981':''}">${editLink?'更新链接':'立即添加'}</button>
          </form></div>
        </div>
        <div class="panel">
          <div class="panel-head">链接列表 (${links.results.length})</div>
          <div class="panel-body link-list">
            ${links.results.map((l:any)=>`<div class="link-item">
              <form action="/api/links/update_order" method="post" style="margin:0"><input type="hidden" name="id" value="${l.id}"><input class="link-sort" name="sort_order" value="${l.sort_order}" onchange="this.form.submit()"></form>
              <div class="link-icon">${!l.icon?'🔗':(l.icon.startsWith('http')?`<img src="${l.icon}" style="width:100%;height:100%;object-fit:cover">`:l.icon)}</div>
              <div class="link-info"><div class="link-title">${l.title} ${l.tag?`<span class="link-tag">${l.tag}</span>`:''}</div><div class="link-url">${l.url}</div></div>
              <div class="actions"><a href="/admin?edit_id=${l.id}" class="btn-edit">编辑</a><form action="/api/links/delete" method="post" style="margin:0"><input type="hidden" name="id" value="${l.id}"><button class="btn-danger" style="border:none;cursor:pointer" onclick="return confirm('删?')">删除</button></form></div>
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
