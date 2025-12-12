/**
 * LX Profile - Final V4.0 (Dark Mode + Performance Edition)
 * 保留：天气、搜索、公告、QQ加好友、链接编辑、打字机、QR、复制、运行天数
 * 新增：暗黑模式切换、社交图标组、全年进度、动态问候、加载耗时、背景音乐
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

app.get('/', async (c) => {
  const startTime = Date.now();
  if (!c.env.DB) return c.text('DB Bindings Missing', 500)

  // 1. 获取访客地理位置
  const city = c.req.raw.cf?.city || 'Earth'
  const lat = c.req.raw.cf?.latitude || '0'
  const lon = c.req.raw.cf?.longitude || '0'
  
  // 2. 并发拉取数据库所有数据
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

  // 4. 指定图标
  const favicon = "https://twbk.cn/wp-content/uploads/2025/12/tx.png"

  return c.html(`
    <!DOCTYPE html>
    <html lang="zh-CN" class="">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0">
      <title>${siteTitle || 'LX Profile'}</title>
      <link rel="icon" href="${favicon}">
      
      <!-- 极速预加载 -->
      <script>
        // 立即执行暗黑模式判断，防止闪屏
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
          theme: { extend: { colors: { darkbg: '#0f172a' } } }
        }
      </script>
      
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&family=Noto+Sans+SC:wght@500;700&display=swap" rel="stylesheet">
      
      <style>
        body { font-family: 'Inter', 'Noto Sans SC', sans-serif; transition: background-color 0.5s ease; }
        .glass { background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.4); }
        .dark .glass { background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(255,255,255,0.05); color: #e2e8f0; }
        
        .link-card { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .link-card:hover { transform: scale(1.02) translateY(-2px); box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); }
        
        .dark .text-slate-800 { color: #f1f5f9; }
        .dark .text-slate-500 { color: #94a3b8; }
        
        @keyframes marquee { 0% { transform: translateX(102%); } 100% { transform: translateX(-102%); } }
        .animate-marquee { animation: marquee 15s linear infinite; }
        
        /* 进度条样式 */
        .progress-bar { background: rgba(0,0,0,0.05); border-radius: 4px; overflow: hidden; height: 6px; }
        .dark .progress-bar { background: rgba(255,255,255,0.1); }
        .progress-fill { background: linear-gradient(90deg, #3b82f6, #8b5cf6); height: 100%; transition: width 1s ease-in-out; }
      </style>
    </head>
    <body class="bg-slate-50 dark:bg-darkbg text-slate-800 min-h-screen flex flex-col items-center py-8 px-4 relative overflow-x-hidden">
      
      <!-- 背景图层 -->
      <div id="bg-layer" class="fixed inset-0 -z-10 bg-cover bg-center transition-opacity duration-1000 opacity-60" style="${bgUrl ? `background-image: url('${bgUrl}');` : ''}"></div>

      <!-- 1. 顶部功能条：天气 & 暗黑切换 & 音乐 -->
      <div class="w-full max-w-xl flex justify-between items-center mb-6 gap-3">
         <div class="glass px-4 py-2 rounded-full text-[11px] font-bold shadow-sm flex items-center gap-2">
            <span id="greeting">Hello</span> • <span id="weather-info">📍 ${city} 加载中...</span>
         </div>
         
         <div class="flex gap-2">
            <!-- 音乐播放器 (如果有URL) -->
            ${music ? `
            <button onclick="toggleMusic()" id="music-btn" class="glass w-9 h-9 rounded-full flex items-center justify-center hover:scale-110 transition">
               <span id="music-icon">🎵</span>
               <audio id="bg-audio" src="${music}" loop></audio>
            </button>` : ''}
            
            <!-- 模式切换 -->
            <button onclick="toggleTheme()" class="glass w-9 h-9 rounded-full flex items-center justify-center hover:scale-110 transition">
               <span class="dark:hidden">🌙</span><span class="hidden dark:inline">☀️</span>
            </button>
            
            <!-- 分享 -->
            <button onclick="showQR()" class="glass w-9 h-9 rounded-full flex items-center justify-center hover:scale-110 transition">
               📤
            </button>
         </div>
      </div>

      <!-- 2. 跑马灯公告 -->
      ${notice ? `
      <div class="w-full max-w-xl mb-6 glass rounded-2xl py-2.5 px-4 overflow-hidden relative">
         <div class="animate-marquee whitespace-nowrap text-sm font-bold text-blue-500">
            📢 ${notice} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 📢 ${notice}
         </div>
      </div>` : ''}

      <main class="w-full max-w-[500px] z-10">
        
        <!-- 3. 个人核心卡片 -->
        <div class="glass rounded-[2.5rem] p-8 mb-6 text-center shadow-xl relative overflow-hidden group">
           <div class="w-28 h-28 mx-auto mb-5 rounded-full p-1 bg-white/50 dark:bg-white/10 shadow-lg relative">
              <img src="/avatar" onerror="this.src='${favicon}'" class="w-full h-full rounded-full object-cover transition duration-1000 group-hover:rotate-[360deg]"/>
              ${status === 'online' ? '<div class="absolute bottom-1 right-2 w-5 h-5 bg-green-500 border-4 border-white dark:border-slate-800 rounded-full animate-pulse"></div>' : ''}
           </div>
           
           <h1 class="text-3xl font-extrabold mb-2 tracking-tighter">${siteTitle}</h1>
           
           <div class="h-6 mb-6">
              <p id="bio-text" class="text-sm font-medium text-slate-500 dark:text-slate-400"></p>
           </div>

           <!-- 社交图标组 (新功能) -->
           <div class="flex justify-center gap-4 mb-6">
              ${github ? `<a href="${github}" target="_blank" class="hover:scale-125 transition">
                <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
              </a>` : ''}
              ${telegram ? `<a href="${telegram}" target="_blank" class="text-[#0088cc] hover:scale-125 transition">
                <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.14-.24.24-.44.24l.197-2.97 5.407-4.882c.232-.204-.055-.317-.366-.113L7.18 13.9l-2.87-.898c-.628-.19-.643-.628.131-.928l11.22-4.322c.52-.19.974.12.833.469z"/></svg>
              </a>` : ''}
              <a href="tencent://AddContact/?fromId=45&subcmd=all&uin=${qq}" class="text-[#12B7F5] hover:scale-125 transition">
                <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2zm3.22 6.97a.75.75 0 00-1.06 0L12 11.19l-2.16-2.22a.75.75 0 00-1.06 1.06l2.16 2.22-2.16 2.22a.75.75 0 101.06 1.06L12 13.31l2.16 2.22a.75.75 0 101.06-1.06l-2.16-2.22 2.16-2.22a.75.75 0 000-1.06z"/></svg>
              </a>
           </div>

           <a href="mailto:${email}" class="inline-block px-8 py-3 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-2xl text-sm font-bold shadow-lg hover:shadow-blue-500/20 transition-all active:scale-95">联系我 Email</a>
        </div>

        <!-- 4. 全年进度条 (新功能) -->
        <div class="glass rounded-2xl p-4 mb-6">
           <div class="flex justify-between text-[10px] font-bold mb-2 uppercase tracking-widest opacity-60">
              <span>2025 年进度</span>
              <span id="year-percent">0%</span>
           </div>
           <div class="progress-bar"><div id="year-fill" class="progress-fill" style="width: 0%"></div></div>
        </div>

        <!-- 5. 搜索框 -->
        <div class="relative mb-6">
          <input type="text" id="search-input" placeholder="🔍 快速寻找..." 
                 class="w-full pl-5 pr-4 py-4 rounded-2xl glass outline-none text-sm font-bold shadow-inner"
                 onkeyup="filterLinks()">
        </div>

        <!-- 6. 链接列表 -->
        <div id="link-container" class="space-y-4">
          ${linksResult.results.map((link: any) => `
            <div class="link-item link-card glass p-4 rounded-3xl flex items-center gap-4 relative group cursor-pointer overflow-hidden">
              <a href="${link.url}" target="_blank" class="absolute inset-0 z-10"></a>
              <div class="w-14 h-14 rounded-2xl bg-white/50 dark:bg-white/5 flex items-center justify-center shadow-inner shrink-0 overflow-hidden border border-white/20">
                ${!link.icon ? `<img src="https://www.google.com/s2/favicons?domain=${link.url}&sz=128" class="w-full h-full object-cover" />` : (link.icon.startsWith('http') ? `<img src="${link.icon}" class="w-full h-full object-cover" />` : `<span class="text-2xl">${link.icon}</span>`)}
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="font-bold text-base truncate link-title">${link.title}</h3>
                <p class="text-[11px] opacity-60 truncate link-desc font-medium">${link.description || link.url}</p>
              </div>
              <button onclick="copyLink('${link.url}')" class="relative z-20 p-2.5 rounded-xl hover:bg-blue-500 hover:text-white transition group-hover:opacity-100 opacity-0">
                 📋
              </button>
            </div>
          `).join('')}
        </div>
        
        <!-- 7. 底部信息：胶囊背景 -->
        <footer class="mt-10 text-center space-y-4 pb-12">
            <div class="inline-flex flex-wrap justify-center gap-3">
               <span class="px-4 py-1.5 bg-black/70 backdrop-blur-md text-white rounded-full text-[10px] font-bold border border-white/10 shadow-xl">👀 ${views} 访问</span>
               <span class="px-4 py-1.5 bg-black/70 backdrop-blur-md text-white rounded-full text-[10px] font-bold border border-white/10 shadow-xl">⏳ 运行 ${daysRunning} 天</span>
               <span class="px-4 py-1.5 bg-black/70 backdrop-blur-md text-white rounded-full text-[10px] font-bold border border-white/10 shadow-xl">⚡ <span id="load-time">0</span>ms</span>
            </div>
            <div>
               <a href="/admin" class="text-[10px] text-slate-400 font-bold hover:text-blue-500 uppercase tracking-widest">Admin Login</a>
            </div>
        </footer>
      </main>

      <!-- 二维码 & 提示弹窗 -->
      <div id="qr-modal" class="fixed inset-0 bg-black/80 backdrop-blur-sm hidden z-50 flex items-center justify-center p-6" onclick="this.classList.add('hidden')">
         <div class="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] text-center shadow-2xl" onclick="event.stopPropagation()">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=https://${c.req.header('host')}" class="w-56 h-56 rounded-2xl mx-auto mb-4 border-4 border-slate-50 dark:border-slate-800" />
            <p class="font-bold text-slate-800 dark:text-white">扫一扫分享主页</p>
         </div>
      </div>
      <div id="toast" class="fixed bottom-10 left-1/2 -translate-x-1/2 glass px-6 py-3 rounded-2xl font-bold text-sm shadow-2xl transition-all opacity-0 translate-y-10 pointer-events-none z-[100]">✅ 链接已复制</div>

      <script>
        // 1. 动态问候 & 时间
        const hours = new Date().getHours();
        const greetEl = document.getElementById('greeting');
        if(hours < 5) greetEl.innerText = '🌙 深夜好';
        else if(hours < 11) greetEl.innerText = '☀️ 早安';
        else if(hours < 14) greetEl.innerText = '🍲 午安';
        else if(hours < 18) greetEl.innerText = '☕ 下午好';
        else greetEl.innerText = '🌆 晚安';

        // 2. 暗黑模式切换
        function toggleTheme() {
          const isDark = document.documentElement.classList.toggle('dark');
          localStorage.theme = isDark ? 'dark' : 'light';
        }

        // 3. 全年进度计算
        const start = new Date(new Date().getFullYear(), 0, 1);
        const end = new Date(new Date().getFullYear() + 1, 0, 1);
        const progress = (new Date() - start) / (end - start);
        document.getElementById('year-percent').innerText = (progress * 100).toFixed(1) + '%';
        setTimeout(() => document.getElementById('year-fill').style.width = (progress * 100) + '%', 500);

        // 4. 打字机
        const bioText = "${bio || 'Welcome to my space!'}";
        const bioEl = document.getElementById('bio-text');
        let i = 0;
        (function type() {
          if (i < bioText.length) { bioEl.innerHTML += bioText.charAt(i++); setTimeout(type, 50); }
        })();

        // 5. 天气与加载耗时
        window.onload = () => {
          document.getElementById('load-time').innerText = Date.now() - ${startTime};
          fetchWeather();
        };
        async function fetchWeather() {
           try {
              const res = await fetch(\`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true\`);
              const data = await res.json();
              document.getElementById('weather-info').innerText = \`📍 ${city} • \${Math.round(data.current_weather.temperature)}°C\`;
           } catch(e) { document.getElementById('weather-info').innerText = '📍 ${city}'; }
        }

        // 6. 搜索
        function filterLinks() {
           const val = document.getElementById('search-input').value.toUpperCase();
           document.querySelectorAll('.link-item').forEach(item => {
              const text = item.innerText.toUpperCase();
              item.style.display = text.includes(val) ? "" : "none";
           });
        }

        // 7. 复制
        function copyLink(url) {
           navigator.clipboard.writeText(url);
           const t = document.getElementById('toast');
           t.classList.remove('opacity-0', 'translate-y-10');
           setTimeout(() => t.classList.add('opacity-0', 'translate-y-10'), 2000);
        }

        function showQR() { document.getElementById('qr-modal').classList.remove('hidden'); }

        // 8. 音乐切换
        function toggleMusic() {
           const audio = document.getElementById('bg-audio');
           const icon = document.getElementById('music-icon');
           if(audio.paused) { audio.play(); icon.innerText = '⏸️'; icon.classList.add('animate-spin'); }
           else { audio.pause(); icon.innerText = '🎵'; icon.classList.remove('animate-spin'); }
        }
      </script>
    </body>
    </html>
  `)
})

// 头像读取
app.get('/avatar', async (c) => {
  const favicon = "https://twbk.cn/wp-content/uploads/2025/12/tx.png"
  if (!c.env.BUCKET) return c.redirect(favicon)
  const object = await c.env.BUCKET.get('avatar.png')
  if (!object) return c.redirect(favicon)
  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('etag', object.httpEtag)
  return new Response(object.body, { headers })
})

// 后台管理页 (已适配暗黑模式)
app.get('/admin', async (c) => {
  if (!c.env.DB) return c.text('DB Error', 500)
  const cookie = getCookie(c, 'auth')
  if (cookie !== 'true') {
    return c.html(`
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <body style="height:100vh;display:flex;align-items:center;justify-content:center;background:#0f172a;color:white;font-family:system-ui;">
        <form action="/api/login" method="post" style="padding:2rem;background:#1e293b;border-radius:1rem;width:300px;">
          <h2 style="margin-bottom:1rem">LX Admin</h2>
          <input type="password" name="password" placeholder="Passcode" style="width:100%;padding:10px;border-radius:5px;border:none;margin-bottom:1rem;">
          <button style="width:100%;padding:10px;background:#3b82f6;color:white;border:none;border-radius:5px;cursor:pointer;">Login</button>
        </form>
      </body>
    `)
  }

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
      <title>Admin Console</title>
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-slate-900 text-slate-200 p-4 pb-20">
      <div class="max-w-5xl mx-auto">
        <div class="flex justify-between items-center mb-6 bg-slate-800 p-4 rounded-2xl">
          <h1 class="font-bold">LX Console V4.0</h1>
          <a href="/" target="_blank" class="text-blue-400 text-sm">Preview Site</a>
        </div>

        <div class="grid lg:grid-cols-3 gap-6">
          <div class="lg:col-span-1 space-y-4">
            <div class="bg-slate-800 p-5 rounded-2xl">
              <h2 class="font-bold mb-4 border-b border-slate-700 pb-2">Global Settings</h2>
              <form action="/api/config" method="post" class="space-y-3">
                <input type="text" name="site_title" value="${siteTitle || ''}" class="w-full bg-slate-900 border-none p-2 rounded text-sm" placeholder="Site Title">
                <textarea name="bio" class="w-full bg-slate-900 border-none p-2 rounded text-sm" rows="2" placeholder="Bio">${bio || ''}</textarea>
                <textarea name="notice" class="w-full bg-slate-900 border-none p-2 rounded text-sm text-yellow-500" rows="2" placeholder="Notice bar">${notice || ''}</textarea>
                <input type="text" name="bg_url" value="${bgUrl || ''}" class="w-full bg-slate-900 border-none p-2 rounded text-sm" placeholder="Background Image URL">
                <input type="text" name="music_url" value="${music || ''}" class="w-full bg-slate-900 border-none p-2 rounded text-sm" placeholder="Music MP3 URL">
                <div class="grid grid-cols-2 gap-2">
                   <input type="text" name="email" value="${email || ''}" class="bg-slate-900 border-none p-2 rounded text-sm" placeholder="Email">
                   <input type="text" name="qq" value="${qq || ''}" class="bg-slate-900 border-none p-2 rounded text-sm" placeholder="QQ">
                </div>
                <div class="grid grid-cols-2 gap-2">
                   <input type="text" name="github" value="${github || ''}" class="bg-slate-900 border-none p-2 rounded text-sm" placeholder="Github URL">
                   <input type="text" name="telegram" value="${telegram || ''}" class="bg-slate-900 border-none p-2 rounded text-sm" placeholder="TG URL">
                </div>
                <div class="grid grid-cols-2 gap-2">
                   <select name="status" class="bg-slate-900 border-none p-2 rounded text-sm">
                     <option value="online" ${status === 'online' ? 'selected' : ''}>🟢 Online</option>
                     <option value="busy" ${status === 'busy' ? 'selected' : ''}>🔴 Busy</option>
                   </select>
                   <input type="date" name="start_date" value="${startDate || ''}" class="bg-slate-900 border-none p-2 rounded text-sm">
                </div>
                <button class="w-full bg-blue-600 text-white py-2 rounded font-bold mt-2">Update Config</button>
              </form>
            </div>
          </div>

          <div class="lg:col-span-2 space-y-4">
             <div class="bg-slate-800 p-5 rounded-2xl border-l-4 ${editLink ? 'border-blue-500' : 'border-emerald-500'}">
                <h2 class="font-bold mb-4">${editLink ? '✏️ Edit Link' : '➕ Add Link'}</h2>
                <form action="${editLink ? '/api/links/update' : '/api/links'}" method="post" class="space-y-3">
                   ${editLink ? `<input type="hidden" name="id" value="${editLink.id}">` : ''}
                   <div class="grid md:grid-cols-2 gap-3">
                      <input type="text" name="title" value="${editLink?.title || ''}" placeholder="Title" class="w-full bg-slate-900 border-none p-2 rounded" required>
                      <input type="url" name="url" value="${editLink?.url || ''}" placeholder="URL" class="w-full bg-slate-900 border-none p-2 rounded" required>
                   </div>
                   <div class="flex gap-2">
                      <input type="number" name="sort_order" value="${editLink?.sort_order || 0}" class="w-20 bg-slate-900 border-none p-2 rounded text-center">
                      <input type="text" name="icon" value="${editLink?.icon || ''}" placeholder="Icon (Emoji/URL)" class="flex-1 bg-slate-900 border-none p-2 rounded">
                   </div>
                   <input type="text" name="description" value="${editLink?.description || ''}" placeholder="Short desc" class="w-full bg-slate-900 border-none p-2 rounded">
                   <button class="w-full py-2 rounded text-white font-bold ${editLink ? 'bg-blue-600' : 'bg-emerald-600'}">
                      ${editLink ? 'Save Changes' : 'Create Link'}
                   </button>
                </form>
             </div>

             <div class="bg-slate-800 rounded-2xl overflow-hidden">
                ${linksResult.results.map((link: any) => `
                  <div class="flex items-center gap-4 p-4 border-b border-slate-700 hover:bg-slate-700/50">
                     <span class="text-xs text-slate-500 font-mono">${link.sort_order}</span>
                     <div class="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center overflow-hidden">
                        ${!link.icon ? '🔗' : (link.icon.startsWith('http') ? `<img src="${link.icon}" class="w-full h-full object-cover">` : link.icon)}
                     </div>
                     <div class="flex-1">
                        <div class="font-bold text-sm">${link.title}</div>
                        <div class="text-[10px] text-slate-500">${link.url}</div>
                     </div>
                     <a href="/admin?edit_id=${link.id}" class="text-blue-400 text-xs">Edit</a>
                     <form action="/api/links/delete" method="post">
                        <input type="hidden" name="id" value="${link.id}">
                        <button class="text-red-400 text-xs px-2">Del</button>
                     </form>
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

// API 逻辑处理
app.post('/api/login', async (c) => {
  const body = await c.req.parseBody(); const dbPass = await getConfig(c.env.DB, 'password')
  if (body.password === dbPass) { setCookie(c, 'auth', 'true', { httpOnly: true, maxAge: 86400 * 30, path: '/' }); return c.redirect('/admin') }
  return c.text('Unauthorized', 401)
})
app.post('/api/config', async (c) => {
  if (getCookie(c, 'auth') !== 'true') return c.redirect('/admin')
  const body = await c.req.parseBody()
  const updates = ['bio', 'email', 'qq', 'bg_url', 'site_title', 'status', 'start_date', 'notice', 'github', 'telegram', 'music_url']
  const stmt = c.env.DB.prepare("UPDATE config SET value = ? WHERE key = ?")
  await c.env.DB.batch(updates.map(key => stmt.bind(body[key], key)))
  return c.redirect('/admin')
})
app.post('/api/links', async (c) => {
  if (getCookie(c, 'auth') !== 'true') return c.redirect('/admin')
  const body = await c.req.parseBody()
  await c.env.DB.prepare("INSERT INTO links (title, url, icon, description, sort_order) VALUES (?, ?, ?, ?, ?)")
    .bind(body.title, body.url, body.icon, body.description, body.sort_order || 0).run()
  return c.redirect('/admin')
})
app.post('/api/links/update', async (c) => {
  if (getCookie(c, 'auth') !== 'true') return c.redirect('/admin')
  const body = await c.req.parseBody()
  await c.env.DB.prepare("UPDATE links SET title=?, url=?, icon=?, description=?, sort_order=? WHERE id=?")
    .bind(body.title, body.url, body.icon, body.description, body.sort_order, body.id).run()
  return c.redirect('/admin')
})
app.post('/api/links/update_order', async (c) => {
  if (getCookie(c, 'auth') !== 'true') return c.redirect('/admin')
  const body = await c.req.parseBody(); await c.env.DB.prepare("UPDATE links SET sort_order = ? WHERE id = ?").bind(body.sort_order, body.id).run(); return c.redirect('/admin')
})
app.post('/api/links/delete', async (c) => {
  if (getCookie(c, 'auth') !== 'true') return c.redirect('/admin')
  const body = await c.req.parseBody(); await c.env.DB.prepare("DELETE FROM links WHERE id = ?").bind(body.id).run(); return c.redirect('/admin')
})

export const onRequest = handle(app)
