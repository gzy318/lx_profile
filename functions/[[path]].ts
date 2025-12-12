/**
 * LX Profile - V6.0 (High Contrast & Bug Fix Edition)
 * 修复：标签去重、页脚可见性、QQ图标
 * 优化：DNS预解析、字体渲染、UI光影
 */
import { Hono } from 'hono'
import { handle } from 'hono/cloudflare-pages'
import { setCookie, getCookie } from 'hono/cookie'

interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
}

const app = new Hono<{ Bindings: Env }>()

// 获取配置工具
async function getConfig(db: D1Database, key: string) {
  return await db.prepare("SELECT value FROM config WHERE key = ?").bind(key).first('value')
}

// ------ 前台主页 ------
app.get('/', async (c) => {
  const startTime = Date.now();
  if (!c.env.DB) return c.text('DB Bindings Missing', 500)

  // 1. 获取访客地理位置
  const city = c.req.raw.cf?.city || 'Earth'
  const lat = c.req.raw.cf?.latitude || '0'
  const lon = c.req.raw.cf?.longitude || '0'
  
  // 2. 并发拉取数据库
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
  const daysRunning = Math.floor((new Date().getTime() - new Date(startDate as string || '2025-01-01').getTime()) / 86400000)
  
  // 4. 标签去重逻辑 (使用 Set 彻底解决重复问题)
  // 逻辑：获取所有 tag -> 去除空值 -> Trim空格 -> Set去重
  const rawTags = linksResult.results
    .map((l: any) => l.tag ? l.tag.trim() : '')
    .filter((t: string) => t !== '');
  const uniqueTags = [...new Set(rawTags)]; // 使用 Set 去重
  const tags = ['全部', ...uniqueTags];

  // 5. 缓存策略
  c.header('Cache-Control', 'public, max-age=60, stale-while-revalidate=600')

  const favicon = "https://twbk.cn/wp-content/uploads/2025/12/tx.png"

  return c.html(`
    <!DOCTYPE html>
    <html lang="zh-CN" class="">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0">
      <title>${siteTitle || 'LX Profile'}</title>
      <link rel="icon" href="${favicon}">
      
      <!-- 性能：DNS 预解析 -->
      <link rel="dns-prefetch" href="https://cdn.tailwindcss.com">
      <link rel="dns-prefetch" href="https://fonts.googleapis.com">
      <link rel="dns-prefetch" href="https://api.open-meteo.com">
      
      <!-- 暗黑模式初始化 -->
      <script>
        if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      </script>
      
      <script src="https://cdn.tailwindcss.com"></script>
      <script>
        tailwind.config = {
          darkMode: 'class',
          theme: { 
            extend: { 
              colors: { 
                darkbg: '#050505', 
                glass: 'rgba(255,255,255,0.7)', 
                darkglass: 'rgba(20,20,20,0.8)' 
              },
              fontFamily: {
                sans: ['Inter', 'Noto Sans SC', 'sans-serif'],
              }
            } 
          }
        }
      </script>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&family=Noto+Sans+SC:wght@500;700&display=swap" rel="stylesheet">
      
      <style>
        /* 字体加载优化 */
        body { font-display: swap; }
        
        /* 背景层优化 */
        .bg-fixed-layer {
            position: fixed; inset: 0; z-index: -10;
            background-size: cover; background-position: center;
            transition: filter 0.5s ease;
        }
        .dark .bg-fixed-layer {
            filter: brightness(0.4) saturate(0.8) contrast(1.1); /* 暗色模式增强对比度 */
        }

        /* 玻璃拟态 V6 */
        .glass-card {
            background: rgba(255, 255, 255, 0.75);
            backdrop-filter: blur(20px) saturate(180%);
            -webkit-backdrop-filter: blur(20px) saturate(180%);
            border: 1px solid rgba(255,255,255,0.6);
            box-shadow: 0 4px 30px rgba(0, 0, 0, 0.05);
        }
        .dark .glass-card {
            background: rgba(30, 30, 30, 0.7);
            border: 1px solid rgba(255,255,255,0.1);
            color: #e2e8f0;
            box-shadow: 0 4px 30px rgba(0, 0, 0, 0.4);
        }

        /* 链接悬停光影 */
        .link-item { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .link-item:active { transform: scale(0.98); }
        .link-item:hover { 
            transform: translateY(-3px); 
            background: rgba(255,255,255,0.95);
            box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);
        }
        .dark .link-item:hover { 
            background: rgba(50, 50, 50, 0.9); 
            border-color: rgba(255,255,255,0.2);
        }

        /* 标签选中态 */
        .tag-active { background: #2563eb; color: white; border-color: #2563eb; box-shadow: 0 2px 10px rgba(37, 99, 235, 0.3); }
        
        /* 页脚高亮胶囊 (High Contrast Pill) */
        .footer-pill {
            background: rgba(0, 0, 0, 0.75); /* 深黑底色 */
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: #ffffff;
            font-weight: 700;
            text-shadow: 0 1px 2px rgba(0,0,0,0.8);
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        }
        .admin-btn {
            background: rgba(255, 255, 255, 0.9);
            color: #000;
            font-weight: 800;
            box-shadow: 0 0 15px rgba(255,255,255,0.3);
        }
        .admin-btn:hover { background: #fff; transform: scale(1.05); }

        /* 跑马灯 */
        @keyframes marquee { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }
        .animate-marquee { animation: marquee 15s linear infinite; }
      </style>
    </head>
    <body class="text-slate-800 dark:text-slate-200 min-h-screen flex flex-col items-center py-6 px-4">
      
      <!-- 背景层 -->
      <div class="bg-fixed-layer" style="${bgUrl ? `background-image: url('${bgUrl}');` : 'background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);'}"></div>

      <!-- 1. 顶部栏 -->
      <div class="w-full max-w-[520px] flex justify-between items-center mb-5 gap-2 z-10">
         <div class="glass-card px-4 py-2 rounded-full text-xs font-bold flex items-center gap-3 shadow-sm border border-white/50 dark:border-white/10">
            <span id="clock" class="font-mono text-blue-600 dark:text-blue-400 w-16 text-center">00:00:00</span>
            <span class="w-px h-3 bg-slate-300 dark:bg-slate-600"></span>
            <span id="weather-info">📍 ${city}</span>
         </div>
         
         <div class="flex gap-2">
            ${music ? `
            <button onclick="toggleMusic()" class="glass-card w-9 h-9 rounded-full flex items-center justify-center hover:scale-110 transition shadow-sm">
               <span id="music-icon">🎵</span><audio id="bg-audio" src="${music}" loop></audio>
            </button>` : ''}
            <button onclick="toggleTheme()" class="glass-card w-9 h-9 rounded-full flex items-center justify-center hover:scale-110 transition shadow-sm">
               <span class="dark:hidden">🌙</span><span class="hidden dark:inline">☀️</span>
            </button>
         </div>
      </div>

      <!-- 2. 公告 -->
      ${notice ? `
      <div class="w-full max-w-[520px] mb-6 glass-card rounded-xl py-2 px-4 overflow-hidden relative z-10 border border-blue-500/20">
         <div class="animate-marquee whitespace-nowrap text-sm font-bold text-blue-500 dark:text-blue-400">
            🔔 ${notice}
         </div>
      </div>` : ''}

      <main class="w-full max-w-[520px] z-10 animate-[fadeIn_0.5s_ease-out]">
        
        <!-- 3. 个人核心 -->
        <div class="glass-card rounded-[2rem] p-6 mb-6 text-center relative overflow-hidden group">
           <div class="w-24 h-24 mx-auto mb-4 rounded-full p-1 bg-white/50 dark:bg-black/20 shadow-lg relative">
              <img src="/avatar" onerror="this.src='${favicon}'" decoding="async" class="w-full h-full rounded-full object-cover transition duration-700 group-hover:rotate-[360deg]"/>
              ${status === 'online' ? '<span class="absolute bottom-1 right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-slate-800 rounded-full animate-pulse shadow-[0_0_10px_#22c55e]"></span>' : ''}
           </div>
           
           <h1 class="text-2xl font-extrabold mb-1 tracking-tight">${siteTitle}</h1>
           <div class="h-5 mb-5"><p id="bio-text" class="text-xs font-medium opacity-70"></p></div>

           <!-- 社交图标 -->
           <div class="flex justify-center gap-6 mb-5 items-center">
              ${github ? `<a href="${github}" target="_blank" class="hover:text-blue-500 transition hover:-translate-y-1"><svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg></a>` : ''}
              ${telegram ? `<a href="${telegram}" target="_blank" class="hover:text-blue-500 transition hover:-translate-y-1"><svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.14-.24.24-.44.24l.197-2.97 5.407-4.882c.232-.204-.055-.317-.366-.113L7.18 13.9l-2.87-.898c-.628-.19-.643-.628.131-.928l11.22-4.322c.52-.19.974.12.833.469z"/></svg></a>` : ''}
              
              <!-- QQ (标准SVG路径) -->
              ${qq ? `<a href="tencent://AddContact/?fromId=45&subcmd=all&uin=${qq}" class="hover:text-blue-500 transition hover:-translate-y-1">
                 <svg class="w-5 h-5" viewBox="0 0 1024 1024" fill="currentColor"><path d="M824.8 613.2c-16-51.4-34.4-94.6-62.7-165.3C766.5 262.2 689.3 112 511.5 112 331.7 112 256.4 265.2 261 447.9c-28.4 70.8-46.7 113.7-62.7 165.3-34 109.5-23 154.8-14.6 155.8 18 2.2 70.1-82.4 70.1-82.4 0 49 25.2 112.9 79.8 159-26.4 8.1-85.7 29.9-71.6 53.8 11.4 19.3 196.2 12.3 249.5 6.3 53.3 6 238.1 13 249.5-6.3 14.1-23.8-45.2-45.7-71.6-53.8 54.6-46.2 79.8-110.1 79.8-159 0 0 52.1 84.6 70.1 82.4 8.5-1.1 19.5-46.4-14.5-155.8z" /></svg>
              </a>` : ''}
              
              <a href="mailto:${email}" class="text-xs font-bold bg-slate-900 dark:bg-white dark:text-black text-white px-5 py-2 rounded-xl hover:scale-105 transition shadow-lg">Email Me</a>
           </div>

           <!-- 进度条 -->
           <div class="bg-black/5 dark:bg-white/5 rounded-lg p-3 border border-black/5 dark:border-white/5">
              <div class="flex justify-between text-[10px] font-bold opacity-50 mb-1 uppercase">
                 <span>Year Progress</span><span id="year-percent">0%</span>
              </div>
              <div class="h-1.5 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
                 <div id="year-fill" class="h-full bg-blue-500 rounded-full transition-all duration-1000" style="width:0%"></div>
              </div>
           </div>
        </div>
        
        <!-- 4. 标签栏 (修复重复问题) -->
        <div class="flex gap-2 mb-4 overflow-x-auto pb-2 no-scrollbar px-1 justify-center mask-image">
           ${tags.map((tag: string) => `
             <button onclick="filterTag('${tag}')" class="tag-btn text-[11px] font-bold px-4 py-1.5 rounded-full glass-card hover:bg-white dark:hover:bg-slate-700 transition whitespace-nowrap border border-white/40 ${tag === '全部' ? 'tag-active' : ''}" data-tag="${tag}">
               ${tag}
             </button>
           `).join('')}
        </div>

        <!-- 5. 搜索 -->
        <div class="relative mb-5 group">
           <input type="text" id="search-input" placeholder="🔍  Search..." 
                  class="w-full pl-5 pr-4 py-3.5 rounded-2xl glass-card text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/50 transition border border-white/40 dark:border-white/10"
                  onkeyup="filterLinks()">
        </div>

        <!-- 6. 链接列表 -->
        <div id="link-container" class="space-y-3.5">
          ${linksResult.results.map((link: any) => `
            <div class="link-item glass-card p-3.5 rounded-2xl flex items-center gap-4 relative group cursor-pointer overflow-hidden border border-white/40 dark:border-white/10" data-tag="${link.tag || ''}">
              <a href="${link.url}" target="_blank" class="absolute inset-0 z-10"></a>
              <div class="w-12 h-12 rounded-xl bg-white/80 dark:bg-white/5 flex items-center justify-center shadow-inner shrink-0 overflow-hidden border border-black/5 dark:border-white/10">
                ${!link.icon ? `<img src="https://www.google.com/s2/favicons?domain=${link.url}&sz=64" decoding="async" class="w-full h-full object-cover">` : (link.icon.startsWith('http') ? `<img src="${link.icon}" decoding="async" class="w-full h-full object-cover">` : `<span class="text-xl">${link.icon}</span>`)}
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-0.5">
                   <h3 class="font-bold text-sm truncate link-title">${link.title}</h3>
                   ${link.tag ? `<span class="text-[9px] bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 px-1.5 py-px rounded font-bold">${link.tag}</span>` : ''}
                </div>
                <p class="text-[10px] opacity-60 truncate link-desc font-medium">${link.description || link.url}</p>
              </div>
              <div class="relative z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onclick="copyLink('${link.url}')" class="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-blue-500 hover:text-white transition shadow-sm">📋</button>
              </div>
            </div>
          `).join('')}
        </div>
        
        <!-- 7. 页脚 (High Visibility Mode) -->
        <footer class="mt-10 text-center pb-12 flex flex-col items-center gap-4">
            <div class="flex flex-wrap justify-center gap-3">
               <div class="footer-pill px-4 py-1.5 rounded-full flex items-center gap-2">
                  <span>👀</span> <span>${views}</span>
               </div>
               <div class="footer-pill px-4 py-1.5 rounded-full flex items-center gap-2">
                  <span>⏳</span> <span>${daysRunning} DAYS</span>
               </div>
               <div class="footer-pill px-4 py-1.5 rounded-full flex items-center gap-2">
                  <span>⚡</span> <span id="load-time">0</span>ms
               </div>
            </div>
            
            <a href="/admin" class="admin-btn px-6 py-2 rounded-full text-[10px] uppercase tracking-widest transition">
               Enter Admin Panel
            </a>
        </footer>
      </main>

      <!-- 弹窗 -->
      <div id="qr-modal" class="fixed inset-0 bg-black/80 backdrop-blur-sm hidden z-50 flex items-center justify-center" onclick="this.classList.add('hidden')">
         <div class="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-2xl transform scale-95 animate-[fadeIn_0.2s_ease-out]" onclick="event.stopPropagation()">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://${c.req.header('host')}" class="rounded-xl border-4 border-slate-100 dark:border-slate-800" />
         </div>
      </div>
      <div id="toast" class="fixed top-10 left-1/2 -translate-x-1/2 footer-pill px-6 py-2 rounded-full font-bold text-xs shadow-xl transition-all opacity-0 -translate-y-10 z-[100] flex items-center gap-2">
        <span>✅</span> Link Copied!
      </div>

      <script>
        // 时钟
        setInterval(() => document.getElementById('clock').innerText = new Date().toLocaleTimeString('en-GB'), 1000);

        // 标签筛选
        function filterTag(tag) {
           document.querySelectorAll('.tag-btn').forEach(b => {
              b.classList.toggle('tag-active', b.dataset.tag === tag);
           });
           document.querySelectorAll('.link-item').forEach(item => {
              const itemTag = item.dataset.tag || ''; // 处理 undefined
              if (tag === '全部') item.style.display = 'flex';
              else if (itemTag.trim() === tag.trim()) item.style.display = 'flex';
              else item.style.display = 'none';
           });
        }

        // 功能函数
        function toggleTheme() {
           const isDark = document.documentElement.classList.toggle('dark');
           localStorage.theme = isDark ? 'dark' : 'light';
        }
        function toggleMusic() {
           const audio = document.getElementById('bg-audio');
           const icon = document.getElementById('music-icon');
           audio.paused ? (audio.play(), icon.classList.add('animate-spin')) : (audio.pause(), icon.classList.remove('animate-spin'));
        }
        function copyLink(url) {
           navigator.clipboard.writeText(url);
           const t = document.getElementById('toast');
           t.classList.remove('opacity-0', '-translate-y-10');
           setTimeout(() => t.classList.add('opacity-0', '-translate-y-10'), 2000);
        }
        function showQR() { document.getElementById('qr-modal').classList.remove('hidden'); }
        
        // 初始化
        window.onload = () => {
           document.getElementById('load-time').innerText = Date.now() - ${startTime};
           const p = ((new Date() - new Date(new Date().getFullYear(),0,1)) / (new Date(new Date().getFullYear()+1,0,1) - new Date(new Date().getFullYear(),0,1))) * 100;
           document.getElementById('year-fill').style.width = p + '%';
           document.getElementById('year-percent').innerText = p.toFixed(1) + '%';
           
           const bioText = "${bio || 'Hello World'}";
           const bioEl = document.getElementById('bio-text');
           let i=0; (function type(){ if(i<bioText.length){ bioEl.innerText+=bioText.charAt(i++); setTimeout(type,50); } })();
           
           document.getElementById('search-input').addEventListener('keyup', (e) => {
              const val = e.target.value.toUpperCase();
              document.querySelectorAll('.link-item').forEach(el => {
                 el.style.display = el.innerText.toUpperCase().includes(val) ? 'flex' : 'none';
              });
           });
           
           fetch(\`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true\`)
             .then(r=>r.json()).then(d=>document.getElementById('weather-info').innerText=\`📍 ${city} \${Math.round(d.current_weather.temperature)}°C\`).catch(()=>{});
        };
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

// 后台管理 (保留美观的 UI)
app.get('/admin', async (c) => {
  if (!c.env.DB) return c.text('DB Error', 500)
  const cookie = getCookie(c, 'auth')
  if (cookie !== 'true') return c.html(`
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <body class="bg-[#0f172a] flex items-center justify-center min-h-screen font-sans">
      <form action="/api/login" method="post" class="bg-[#1e293b] p-8 rounded-2xl shadow-2xl w-80 text-center border border-gray-700">
         <div class="text-4xl mb-4">🔐</div>
         <h1 class="text-white text-xl font-bold mb-6">Admin Panel</h1>
         <input type="password" name="password" placeholder="Passcode" class="w-full bg-[#0f172a] text-white p-3 rounded-lg border border-gray-600 mb-4 focus:outline-none focus:border-blue-500 text-center">
         <button class="w-full bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-lg font-bold transition shadow-lg shadow-blue-500/30">Unlock</button>
      </form>
    </body>`)

  const editId = c.req.query('edit_id')
  let editLink = null
  if (editId) editLink = await c.env.DB.prepare("SELECT * FROM links WHERE id = ?").bind(editId).first()

  const [linksResult, bio, email, qq, bgUrl, siteTitle, status, startDate, notice, github, telegram, music] = await Promise.all([
    c.env.DB.prepare('SELECT * FROM links ORDER BY sort_order ASC, created_at DESC').all(),
    getConfig(c.env.DB, 'bio'),
    getConfig(c.env.DB, 'email'),
    getConfig(c.env.DB, 'qq'),
    getConfig(c.env.DB, 'bg_url'),
    getConfig(c.env.DB, 'site_title'),
    getConfig(c.env.DB, 'status'),
    getConfig(c.env.DB, 'start_date'),
    getConfig(c.env.DB, 'notice'),
    getConfig(c.env.DB, 'github'),
    getConfig(c.env.DB, 'telegram'),
    getConfig(c.env.DB, 'music_url')
  ])

  return c.html(`
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>LX Admin Dashboard</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet">
      <style>
        body { font-family: 'Inter', sans-serif; }
        .input-dark { background: #0f172a; border: 1px solid #334155; color: white; }
        .input-dark:focus { border-color: #3b82f6; outline: none; }
      </style>
    </head>
    <body class="bg-[#0b1120] text-slate-300 min-h-screen">
      <nav class="bg-[#1e293b]/80 backdrop-blur border-b border-gray-700 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
         <div class="flex items-center gap-3">
            <div class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-blue-600/20">LX</div>
            <h1 class="font-bold text-white tracking-tight">Dashboard <span class="text-[10px] bg-blue-900 text-blue-300 px-1.5 py-0.5 rounded ml-1">V6.0</span></h1>
         </div>
         <a href="/" target="_blank" class="text-sm font-bold text-blue-400 hover:text-white transition flex items-center gap-1 bg-[#0f172a] px-3 py-1.5 rounded-lg border border-gray-700 hover:border-blue-500">
            Preview <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
         </a>
      </nav>

      <div class="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <!-- 左侧配置 -->
        <div class="lg:col-span-4 space-y-6">
           <div class="bg-[#1e293b] rounded-2xl p-6 shadow-xl border border-gray-700/50">
              <h2 class="text-white font-bold mb-5 flex items-center gap-2 text-sm uppercase tracking-wider">⚙️ Config</h2>
              <form action="/api/config" method="post" class="space-y-4">
                 <div><label class="text-[10px] font-bold text-gray-500 uppercase">Title</label><input type="text" name="site_title" value="${siteTitle || ''}" class="w-full input-dark p-2.5 rounded-lg text-sm mt-1"></div>
                 <div><label class="text-[10px] font-bold text-gray-500 uppercase">Bio</label><textarea name="bio" rows="2" class="w-full input-dark p-2.5 rounded-lg text-sm mt-1">${bio || ''}</textarea></div>
                 <div><label class="text-[10px] font-bold text-gray-500 uppercase text-yellow-500">Notice</label><input type="text" name="notice" value="${notice || ''}" class="w-full input-dark p-2.5 rounded-lg text-sm mt-1 border-yellow-900/30"></div>
                 <div><label class="text-[10px] font-bold text-gray-500 uppercase">BG URL</label><input type="text" name="bg_url" value="${bgUrl || ''}" class="w-full input-dark p-2.5 rounded-lg text-sm mt-1"></div>
                 <div class="grid grid-cols-2 gap-3">
                    <div><label class="text-[10px] font-bold text-gray-500 uppercase">QQ</label><input type="text" name="qq" value="${qq || ''}" class="w-full input-dark p-2.5 rounded-lg text-sm mt-1"></div>
                    <div><label class="text-[10px] font-bold text-gray-500 uppercase">Start Date</label><input type="date" name="start_date" value="${startDate || ''}" class="w-full input-dark p-2.5 rounded-lg text-sm mt-1"></div>
                 </div>
                 <div class="grid grid-cols-2 gap-3">
                    <input type="text" name="email" value="${email || ''}" placeholder="Email" class="input-dark p-2.5 rounded-lg text-sm">
                    <input type="text" name="music_url" value="${music || ''}" placeholder="Music URL" class="input-dark p-2.5 rounded-lg text-sm">
                 </div>
                 <div class="grid grid-cols-2 gap-3">
                    <input type="text" name="github" value="${github || ''}" placeholder="GitHub" class="input-dark p-2.5 rounded-lg text-sm">
                    <input type="text" name="telegram" value="${telegram || ''}" placeholder="Telegram" class="input-dark p-2.5 rounded-lg text-sm">
                 </div>
                 <select name="status" class="w-full input-dark p-2.5 rounded-lg text-sm mt-1">
                    <option value="online" ${status === 'online' ? 'selected' : ''}>🟢 Online</option>
                    <option value="busy" ${status === 'busy' ? 'selected' : ''}>🔴 Busy</option>
                 </select>
                 <button class="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-900/50 transition mt-2">Save All</button>
              </form>
           </div>
        </div>

        <!-- 右侧管理 -->
        <div class="lg:col-span-8 space-y-6">
           <div class="bg-[#1e293b] rounded-2xl p-6 shadow-xl border border-gray-700/50 relative overflow-hidden group">
              <div class="absolute right-0 top-0 p-10 opacity-5 text-9xl pointer-events-none group-hover:scale-110 transition duration-700">🔗</div>
              <h2 class="text-white font-bold mb-5 flex justify-between items-center text-sm uppercase tracking-wider">
                 <span>${editLink ? '✏️ Edit Mode' : '✨ New Link'}</span>
                 ${editLink ? '<a href="/admin" class="text-xs bg-red-500/10 text-red-400 px-3 py-1 rounded-full border border-red-500/20">Cancel</a>' : ''}
              </h2>
              <form action="${editLink ? '/api/links/update' : '/api/links'}" method="post" class="space-y-4 relative z-10">
                 ${editLink ? `<input type="hidden" name="id" value="${editLink.id}">` : ''}
                 <div class="grid md:grid-cols-2 gap-4">
                    <input type="text" name="title" value="${editLink?.title || ''}" class="w-full input-dark p-3 rounded-lg" required placeholder="Title">
                    <input type="url" name="url" value="${editLink?.url || ''}" class="w-full input-dark p-3 rounded-lg" required placeholder="URL">
                 </div>
                 <div class="grid grid-cols-12 gap-4">
                    <div class="col-span-2"><input type="number" name="sort_order" value="${editLink?.sort_order || 0}" class="w-full input-dark p-3 rounded-lg text-center" placeholder="Sort"></div>
                    <div class="col-span-3"><input type="text" name="tag" value="${editLink?.tag || ''}" class="w-full input-dark p-3 rounded-lg" placeholder="Tag"></div>
                    <div class="col-span-7"><input type="text" name="icon" value="${editLink?.icon || ''}" class="w-full input-dark p-3 rounded-lg" placeholder="Icon (Emoji/URL)"></div>
                 </div>
                 <input type="text" name="description" value="${editLink?.description || ''}" class="w-full input-dark p-3 rounded-lg" placeholder="Description">
                 <button class="w-full ${editLink ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-emerald-600 hover:bg-emerald-500'} text-white font-bold py-3 rounded-xl transition shadow-lg">
                    ${editLink ? 'Update Link' : 'Add to List'}
                 </button>
              </form>
           </div>

           <div class="bg-[#1e293b] rounded-2xl shadow-xl border border-gray-700/50 overflow-hidden">
              <div class="p-4 bg-gray-800/50 border-b border-gray-700 flex justify-between items-center">
                 <span class="font-bold text-white text-sm">Links (${linksResult.results.length})</span>
                 <span class="text-[10px] text-gray-500 bg-gray-900 px-2 py-1 rounded">Sort: 0-9</span>
              </div>
              <div class="divide-y divide-gray-700/50">
                 ${linksResult.results.map((link: any) => `
                   <div class="p-4 flex items-center gap-4 hover:bg-gray-700/20 transition group">
                      <form action="/api/links/update_order" method="post">
                         <input type="hidden" name="id" value="${link.id}">
                         <input name="sort_order" value="${link.sort_order}" class="w-8 h-8 bg-[#0f172a] border border-gray-600 rounded text-center text-xs text-gray-400 focus:border-blue-500 outline-none" onchange="this.form.submit()">
                      </form>
                      <div class="w-10 h-10 rounded-lg bg-[#0f172a] flex items-center justify-center overflow-hidden border border-gray-600/50">
                         ${!link.icon ? '🔗' : (link.icon.startsWith('http') ? `<img src="${link.icon}" class="w-full h-full object-cover">` : link.icon)}
                      </div>
                      <div class="flex-1 min-w-0">
                         <div class="flex items-center gap-2">
                            <span class="font-bold text-gray-200 truncate text-sm">${link.title}</span>
                            ${link.tag ? `<span class="text-[9px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20">${link.tag}</span>` : ''}
                         </div>
                         <div class="text-[10px] text-gray-500 truncate font-mono mt-0.5">${link.url}</div>
                      </div>
                      <div class="flex items-center gap-2 opacity-100 lg:opacity-0 group-hover:opacity-100 transition">
                         <a href="/admin?edit_id=${link.id}" class="p-2 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-600 hover:text-white transition">✏️</a>
                         <form action="/api/links/delete" method="post" onsubmit="return confirm('Confirm Delete?')">
                            <input type="hidden" name="id" value="${link.id}">
                            <button class="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-600 hover:text-white transition">🗑️</button>
                         </form>
                      </div>
                   </div>
                 `).join('')}
              </div>
           </div>
        </div>
      </div>
    </body>
    </html>
  `)
})

// API
app.post('/api/login', async (c) => { const body=await c.req.parseBody(); const p=await getConfig(c.env.DB,'password'); if(body.password===p){setCookie(c,'auth','true',{httpOnly:true,maxAge:86400*30,path:'/'});return c.redirect('/admin')}return c.text('Error',403)})
app.post('/api/config', async (c) => {if(getCookie(c,'auth')!=='true')return c.redirect('/admin');const body=await c.req.parseBody();const keys=['bio','email','qq','bg_url','site_title','status','start_date','notice','github','telegram','music_url'];const stmt=c.env.DB.prepare("UPDATE config SET value = ? WHERE key = ?");await c.env.DB.batch(keys.map(k=>stmt.bind(body[k],k)));return c.redirect('/admin')})
app.post('/api/links', async (c) => {if(getCookie(c,'auth')!=='true')return c.redirect('/admin');const body=await c.req.parseBody();await c.env.DB.prepare("INSERT INTO links (title, url, icon, description, sort_order, tag) VALUES (?, ?, ?, ?, ?, ?)").bind(body.title, body.url, body.icon, body.description, body.sort_order||0, body.tag).run();return c.redirect('/admin')})
app.post('/api/links/update', async (c) => {if(getCookie(c,'auth')!=='true')return c.redirect('/admin');const body=await c.req.parseBody();await c.env.DB.prepare("UPDATE links SET title=?, url=?, icon=?, description=?, sort_order=?, tag=? WHERE id=?").bind(body.title, body.url, body.icon, body.description, body.sort_order, body.tag, body.id).run();return c.redirect('/admin')})
app.post('/api/links/update_order', async (c) => {if(getCookie(c,'auth')!=='true')return c.redirect('/admin');const b=await c.req.parseBody();await c.env.DB.prepare("UPDATE links SET sort_order=? WHERE id=?").bind(b.sort_order,b.id).run();return c.redirect('/admin')})
app.post('/api/links/delete', async (c) => {if(getCookie(c,'auth')!=='true')return c.redirect('/admin');const b=await c.req.parseBody();await c.env.DB.prepare("DELETE FROM links WHERE id=?").bind(b.id).run();return c.redirect('/admin')})

export const onRequest = handle(app)
