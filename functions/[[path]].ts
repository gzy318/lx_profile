/**
 * LX Profile - Ultimate V3
 * 修复：底部文字可见性
 * 新增：天气、公告、打字机、复制、二维码、预加载
 */
import { Hono } from 'hono'
import { handle } from 'hono/cloudflare-pages'
import { setCookie, getCookie } from 'hono/cookie'

interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
}

const app = new Hono<{ Bindings: Env }>()

// ------ 工具：获取配置 ------
async function getConfig(db: D1Database, key: string) {
  return await db.prepare("SELECT value FROM config WHERE key = ?").bind(key).first('value')
}

// ------ 1. 前台主页 ------
app.get('/', async (c) => {
  if (!c.env.DB) return c.text('Database Error', 500)

  // 获取地理位置 (用于天气)
  const city = c.req.raw.cf?.city || 'Earth'
  const lat = c.req.raw.cf?.latitude || '0'
  const lon = c.req.raw.cf?.longitude || '0'
  
  // 并发查询
  const [linksResult, bio, email, qq, views, bgUrl, siteTitle, status, startDate, notice] = await Promise.all([
    c.env.DB.prepare('SELECT * FROM links ORDER BY sort_order ASC, created_at DESC').all(),
    getConfig(c.env.DB, 'bio'),
    getConfig(c.env.DB, 'email'),
    getConfig(c.env.DB, 'qq'),
    getConfig(c.env.DB, 'views'),
    getConfig(c.env.DB, 'bg_url'),
    getConfig(c.env.DB, 'site_title'),
    getConfig(c.env.DB, 'status'),
    getConfig(c.env.DB, 'start_date'),
    getConfig(c.env.DB, 'notice')
  ])

  // 访问量 +1
  c.executionCtx.waitUntil(c.env.DB.prepare("UPDATE config SET value = CAST(value AS INTEGER) + 1 WHERE key = 'views'").run())

  // 计算天数
  const start = new Date(startDate as string || '2025-01-01').getTime()
  const daysRunning = Math.floor((new Date().getTime() - start) / (1000 * 60 * 60 * 24))

  // 资源与样式
  const favicon = "https://twbk.cn/wp-content/uploads/2025/12/tx.png"
  const bgStyle = bgUrl ? `background-image: url('${bgUrl}');` : `background: radial-gradient(circle at center, #eef2f3, #8e9eab);`

  // 缓存控制
  c.header('Cache-Control', 'public, max-age=60')

  return c.html(`
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${siteTitle || 'LX Profile'}</title>
      <link rel="icon" href="${favicon}">
      <!-- 性能优化：预连接 -->
      <link rel="preconnect" href="https://cdn.tailwindcss.com">
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://api.open-meteo.com">
      
      <script src="https://cdn.tailwindcss.com"></script>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&family=Noto+Sans+SC:wght@400;500;700&display=swap" rel="stylesheet">
      
      <style>
        body { font-family: 'Inter', 'Noto Sans SC', sans-serif; background-size: cover; background-position: center; background-attachment: fixed; min-height: 100vh; }
        
        /* 玻璃拟态 V3 - 更强的对比度 */
        .glass-panel { 
          background: rgba(255, 255, 255, 0.85); 
          backdrop-filter: blur(20px) saturate(180%); 
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          border: 1px solid rgba(255,255,255,0.8); 
          box-shadow: 0 8px 32px rgba(0,0,0,0.1);
        }
        
        .link-card {
          background: rgba(255, 255, 255, 0.75);
          border: 1px solid rgba(255,255,255,0.6);
          transition: all 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }
        .link-card:hover {
          background: #fff;
          transform: translateY(-4px);
          box-shadow: 0 15px 30px rgba(0,0,0,0.1);
          border-color: #fff;
        }

        /* 打字机光标 */
        .typing-cursor::after { content: '|'; animation: blink 1s infinite; }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }

        /* 底部胶囊样式 (解决看不清问题) */
        .footer-pill {
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(10px);
          color: white;
          padding: 6px 16px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.1);
          font-weight: 600;
          text-shadow: 0 1px 2px rgba(0,0,0,0.5);
        }
        
        /* 复制提示 Toast */
        #toast {
           visibility: hidden; min-width: 250px; background-color: #333; color: #fff; text-align: center; border-radius: 8px; padding: 16px; position: fixed; z-index: 50; left: 50%; bottom: 30px; transform: translateX(-50%); font-size: 14px; opacity: 0; transition: opacity 0.3s;
        }
        #toast.show { visibility: visible; opacity: 1; }
      </style>
    </head>
    <body class="flex flex-col items-center py-6 px-4 text-slate-800" style="${bgStyle}">
      
      <!-- 顶部：公告栏 & 天气 -->
      <div class="w-full max-w-xl flex justify-between items-center mb-4 gap-3">
         <!-- 天气挂件 -->
         <div class="glass-panel px-3 py-1.5 rounded-full flex items-center gap-2 text-xs font-bold text-slate-700 shadow-sm shrink-0" id="weather-widget">
            <span>📍 ${city}</span>
            <span id="weather-temp">Loading...</span>
         </div>
         
         <!-- 分享按钮 -->
         <button onclick="showQR()" class="glass-panel w-8 h-8 rounded-full flex items-center justify-center hover:bg-white transition">
           <svg class="w-4 h-4 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
         </button>
      </div>

      <!-- 跑马灯公告 -->
      ${notice ? `
      <div class="w-full max-w-xl mb-6 overflow-hidden rounded-xl glass-panel py-2 px-4 relative">
         <div class="whitespace-nowrap animate-[marquee_15s_linear_infinite] text-sm font-medium text-blue-600 flex items-center gap-4">
           <span>📢 ${notice}</span>
           <span>📢 ${notice}</span> <!-- 重复一次以衔接动画 -->
         </div>
      </div>
      <style>@keyframes marquee { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }</style>
      ` : ''}

      <main class="w-full max-w-[520px] animate-[fadeIn_0.5s_ease-out]">
        
        <!-- 个人卡片 -->
        <div class="glass-panel rounded-[2rem] p-8 mb-6 text-center relative overflow-hidden group">
           <div class="absolute inset-0 bg-gradient-to-tr from-white/40 via-transparent to-white/40 pointer-events-none"></div>
           
           <div class="relative z-10">
             <!-- 头像 -->
             <div class="w-28 h-28 mx-auto mb-4 p-1 bg-white/50 rounded-full shadow-lg backdrop-blur-sm">
                <img src="/avatar" onerror="this.src='${favicon}'" class="w-full h-full rounded-full object-cover transition-transform duration-700 group-hover:rotate-[360deg]"/>
             </div>
             
             <h1 class="text-3xl font-extrabold mb-1 tracking-tight text-slate-900 drop-shadow-sm">${siteTitle}</h1>
             
             <!-- 打字机 Bio -->
             <div class="h-6 mb-6 flex justify-center items-center">
                <p id="bio-text" class="text-sm font-medium text-slate-600 typing-cursor"></p>
             </div>
             
             <!-- 社交按钮 -->
             <div class="flex justify-center gap-3">
               <a href="mailto:${email}" class="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:scale-105 transition shadow-lg flex items-center gap-2">
                 <span>📩</span> Email
               </a>
               ${qq ? `
               <a href="tencent://AddContact/?fromId=45&subcmd=all&uin=${qq}" class="px-5 py-2 bg-[#0099FF] text-white rounded-xl text-xs font-bold hover:scale-105 transition shadow-lg flex items-center gap-2">
                 <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8 8 8zm4.59-12.42c-.94-.94-2.48-.94-3.42 0L12 8.75l-1.17-1.17c-.94-.94-2.48-.94-3.42 0-.94.94-.94 2.48 0 3.42l2.59 2.59c.94.94 2.48.94 3.42 0l4.17-4.17c.94-.94.94-2.48 0-3.42z"/></svg>
                 Add QQ
               </a>` : ''}
             </div>
           </div>
        </div>

        <!-- 搜索 -->
        <div class="relative mb-6">
          <input type="text" id="search-input" placeholder="🔍 搜索精彩内容..." 
                 class="w-full pl-5 pr-4 py-3.5 rounded-2xl glass-panel text-sm font-medium placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-400/50 transition shadow-sm"
                 onkeyup="filterLinks()">
        </div>

        <!-- 链接列表 -->
        <div id="link-container" class="space-y-3 pb-8">
          ${linksResult.results.map((link: any) => {
            const iconHtml = !link.icon 
              ? `<img src="https://www.google.com/s2/favicons?domain=${link.url}&sz=64" class="w-full h-full object-cover" loading="lazy"/>`
              : (link.icon.startsWith('http') ? `<img src="${link.icon}" class="w-full h-full object-cover" loading="lazy"/>` : `<span class="text-xl">${link.icon}</span>`);
            
            return `
            <div class="link-item link-card p-3 rounded-2xl flex items-center gap-4 relative group">
              <!-- 点击区域 -->
              <a href="${link.url}" target="_blank" class="absolute inset-0 z-10"></a>
              
              <div class="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm shrink-0 overflow-hidden border border-slate-100">
                ${iconHtml}
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="font-bold text-slate-800 truncate text-sm link-title">${link.title}</h3>
                <p class="text-xs text-slate-500 truncate mt-0.5 link-desc font-medium opacity-80">${link.description || link.url}</p>
              </div>
              
              <!-- 右侧功能区 (Z-Index高于链接) -->
              <div class="relative z-20 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                 <!-- 复制按钮 -->
                 <button onclick="copyLink('${link.url}')" class="p-2 bg-slate-100 rounded-lg hover:bg-blue-100 hover:text-blue-600 transition" title="复制链接">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                 </button>
              </div>
              
              <!-- 默认箭头 -->
              <div class="pr-2 text-slate-300 group-hover:opacity-0 transition-opacity absolute right-2">
                 <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
              </div>
            </div>
          `}).join('')}
        </div>
        
        <!-- 底部数据 (修复看不清问题) -->
        <footer class="mt-4 text-center space-y-3 pb-8">
            <div class="inline-flex items-center gap-4 text-xs footer-pill">
               <span>👀 ${views} 访问</span>
               <span class="w-1 h-1 bg-white/50 rounded-full"></span>
               <span>⏳ 运行 ${daysRunning} 天</span>
            </div>
            <div>
               <a href="/admin" class="text-[10px] text-white/50 hover:text-white transition drop-shadow-md">Admin Login</a>
            </div>
        </footer>
      </main>

      <!-- 二维码弹窗 -->
      <div id="qr-modal" class="fixed inset-0 bg-black/60 backdrop-blur-sm hidden z-50 flex items-center justify-center" onclick="closeQR()">
         <div class="bg-white p-6 rounded-2xl shadow-2xl text-center transform transition scale-95 animate-[fadeIn_0.2s_ease-out] relative" onclick="event.stopPropagation()">
            <h3 class="font-bold text-lg mb-4 text-slate-800">扫码分享主页</h3>
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://${c.req.header('host')}" class="w-48 h-48 rounded-lg mx-auto mb-4 border" />
            <p class="text-xs text-slate-400">点击背景关闭</p>
         </div>
      </div>

      <!-- 复制提示 -->
      <div id="toast">✅ 链接已复制到剪贴板</div>

      <script>
        // 1. 打字机特效
        const bioText = "${bio || 'Welcome to my profile!'}";
        const bioEl = document.getElementById('bio-text');
        let i = 0;
        function typeWriter() {
          if (i < bioText.length) {
            bioEl.innerHTML += bioText.charAt(i);
            i++;
            setTimeout(typeWriter, 50); // 打字速度
          } else {
             bioEl.classList.remove('typing-cursor'); // 打完移除光标
          }
        }
        window.onload = () => {
           typeWriter();
           fetchWeather();
        };

        // 2. 实时天气 (OpenMeteo 免费 API)
        async function fetchWeather() {
           const lat = ${lat};
           const lon = ${lon};
           const el = document.getElementById('weather-temp');
           try {
              const res = await fetch(\`https://api.open-meteo.com/v1/forecast?latitude=\${lat}&longitude=\${lon}&current_weather=true\`);
              const data = await res.json();
              const temp = Math.round(data.current_weather.temperature);
              const code = data.current_weather.weathercode;
              // 简单天气图标映射
              let icon = '☀️';
              if (code > 3) icon = '☁️';
              if (code > 50) icon = '🌧️';
              if (code > 70) icon = '❄️';
              el.innerText = \`\${icon} \${temp}°C\`;
           } catch(e) {
              el.innerText = 'N/A';
           }
        }

        // 3. 搜索功能
        function filterLinks() {
          const input = document.getElementById('search-input').value.toUpperCase();
          const items = document.getElementsByClassName('link-item');
          for (let item of items) {
            const title = item.querySelector('.link-title').innerText.toUpperCase();
            const desc = item.querySelector('.link-desc').innerText.toUpperCase();
            item.style.display = (title.indexOf(input) > -1 || desc.indexOf(input) > -1) ? "" : "none";
          }
        }

        // 4. 复制功能
        function copyLink(url) {
           navigator.clipboard.writeText(url).then(() => {
              const x = document.getElementById("toast");
              x.className = "show";
              setTimeout(function(){ x.className = x.className.replace("show", ""); }, 3000);
           });
        }

        // 5. 二维码
        function showQR() { document.getElementById('qr-modal').classList.remove('hidden'); }
        function closeQR() { document.getElementById('qr-modal').classList.add('hidden'); }
      </script>
    </body>
    </html>
  `)
})

// ------ 2. 图片代理 ------
app.get('/avatar', async (c) => {
  if (!c.env.BUCKET) return c.redirect('https://twbk.cn/wp-content/uploads/2025/12/tx.png')
  const object = await c.env.BUCKET.get('avatar.png')
  if (!object) return c.redirect('https://twbk.cn/wp-content/uploads/2025/12/tx.png')
  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('etag', object.httpEtag)
  return new Response(object.body, { headers })
})

// ------ 3. 后台管理 (功能完全保留) ------
app.get('/admin', async (c) => {
  if (!c.env.DB) return c.text('DB Error', 500)
  
  const cookie = getCookie(c, 'auth')
  if (cookie !== 'true') {
    return c.html(`
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <body style="height:100vh;display:flex;align-items:center;justify-content:center;background:#f1f5f9;">
        <form action="/api/login" method="post" style="padding:2rem;background:white;border-radius:1rem;box-shadow:0 10px 15px rgba(0,0,0,0.1);">
          <h2 style="margin-bottom:1rem;font-weight:bold;">Lx Admin</h2>
          <input type="password" name="password" placeholder="Passcode" style="padding:8px;border:1px solid #ccc;border-radius:4px;width:100%;margin-bottom:10px;" required>
          <button style="width:100%;padding:8px;background:#000;color:white;border:none;border-radius:4px;">Login</button>
        </form>
      </body>
    `)
  }

  const editId = c.req.query('edit_id')
  let editLink = null
  if (editId) editLink = await c.env.DB.prepare("SELECT * FROM links WHERE id = ?").bind(editId).first()

  const [linksResult, bio, email, qq, bgUrl, siteTitle, status, startDate, notice] = await Promise.all([
    c.env.DB.prepare('SELECT * FROM links ORDER BY sort_order ASC, created_at DESC').all(),
    getConfig(c.env.DB, 'bio'),
    getConfig(c.env.DB, 'email'),
    getConfig(c.env.DB, 'qq'),
    getConfig(c.env.DB, 'bg_url'),
    getConfig(c.env.DB, 'site_title'),
    getConfig(c.env.DB, 'status'),
    getConfig(c.env.DB, 'start_date'),
    getConfig(c.env.DB, 'notice')
  ])

  return c.html(`
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>LX Admin</title>
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-slate-100 p-4 min-h-screen pb-20">
      <div class="max-w-5xl mx-auto">
        <div class="flex justify-between items-center mb-6 bg-white p-4 rounded-xl shadow-sm">
          <h1 class="font-bold text-xl">控制台</h1>
          <a href="/" target="_blank" class="text-blue-600 text-sm">查看主页 →</a>
        </div>

        <div class="grid lg:grid-cols-3 gap-6">
          <div class="lg:col-span-1 space-y-4">
            <div class="bg-white p-5 rounded-xl shadow-sm">
              <h2 class="font-bold mb-4">基本信息</h2>
              <form action="/api/config" method="post" class="space-y-3">
                <input type="text" name="site_title" value="${siteTitle || ''}" class="w-full border p-2 rounded text-sm" placeholder="网站标题">
                <textarea name="bio" class="w-full border p-2 rounded text-sm" rows="3" placeholder="个人简介">${bio || ''}</textarea>
                <textarea name="notice" class="w-full border p-2 rounded text-sm text-red-500" rows="2" placeholder="公告栏 (滚动播放)">${notice || ''}</textarea>
                <input type="text" name="bg_url" value="${bgUrl || ''}" class="w-full border p-2 rounded text-sm" placeholder="背景图 URL">
                <div class="grid grid-cols-2 gap-2">
                   <input type="text" name="email" value="${email || ''}" class="border p-2 rounded text-sm" placeholder="Email">
                   <input type="text" name="qq" value="${qq || ''}" class="border p-2 rounded text-sm" placeholder="QQ">
                </div>
                <div class="grid grid-cols-2 gap-2">
                   <select name="status" class="border p-2 rounded text-sm">
                     <option value="online" ${status === 'online' ? 'selected' : ''}>🟢 Online</option>
                     <option value="busy" ${status === 'busy' ? 'selected' : ''}>🔴 Busy</option>
                   </select>
                   <input type="date" name="start_date" value="${startDate || ''}" class="border p-2 rounded text-sm">
                </div>
                <button class="w-full bg-slate-800 text-white py-2 rounded font-medium text-sm">保存设置</button>
              </form>
            </div>
          </div>

          <div class="lg:col-span-2 space-y-4">
             <!-- 编辑/添加区 -->
             <div class="bg-white p-5 rounded-xl shadow-sm border-l-4 ${editLink ? 'border-blue-500' : 'border-emerald-500'}">
                <div class="flex justify-between items-center mb-3">
                   <h2 class="font-bold">${editLink ? '✏️ 编辑模式' : '➕ 添加新链接'}</h2>
                   ${editLink ? '<a href="/admin" class="text-xs bg-gray-100 px-2 py-1 rounded">退出编辑</a>' : ''}
                </div>
                <form action="${editLink ? '/api/links/update' : '/api/links'}" method="post" class="space-y-3">
                   ${editLink ? `<input type="hidden" name="id" value="${editLink.id}">` : ''}
                   <div class="grid md:grid-cols-2 gap-3">
                      <input type="text" name="title" value="${editLink?.title || ''}" placeholder="标题" class="w-full border p-2 rounded" required>
                      <input type="url" name="url" value="${editLink?.url || ''}" placeholder="链接" class="w-full border p-2 rounded" required>
                   </div>
                   <div class="flex gap-2">
                      <input type="number" name="sort_order" value="${editLink?.sort_order || 0}" placeholder="排序" class="w-20 border p-2 rounded text-center">
                      <input type="text" name="icon" value="${editLink?.icon || ''}" placeholder="图标 (留空自动获取)" class="flex-1 border p-2 rounded">
                   </div>
                   <input type="text" name="description" value="${editLink?.description || ''}" placeholder="描述" class="w-full border p-2 rounded">
                   <button class="w-full py-2 rounded text-white font-medium ${editLink ? 'bg-blue-600' : 'bg-emerald-600'}">
                      ${editLink ? '更新链接' : '添加链接'}
                   </button>
                </form>
             </div>

             <!-- 列表 -->
             <div class="bg-white rounded-xl shadow-sm overflow-hidden">
                ${linksResult.results.map((link: any) => `
                  <div class="flex items-center gap-3 p-3 border-b hover:bg-slate-50">
                     <form action="/api/links/update_order" method="post">
                        <input type="hidden" name="id" value="${link.id}">
                        <input name="sort_order" value="${link.sort_order}" class="w-8 text-center border rounded text-xs" onchange="this.form.submit()">
                     </form>
                     <div class="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-lg overflow-hidden">
                        ${!link.icon ? '🕸️' : (link.icon.startsWith('http') ? `<img src="${link.icon}" class="w-full h-full object-cover">` : link.icon)}
                     </div>
                     <div class="flex-1 min-w-0">
                        <div class="font-medium text-sm truncate">${link.title}</div>
                        <div class="text-xs text-gray-400 truncate">${link.url}</div>
                     </div>
                     <a href="/admin?edit_id=${link.id}" class="text-blue-500 text-xs px-2">编辑</a>
                     <form action="/api/links/delete" method="post" onsubmit="return confirm('删？')">
                        <input type="hidden" name="id" value="${link.id}">
                        <button class="text-red-500 text-xs px-2">删除</button>
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

// ------ 4. API 逻辑 (保持不变) ------
app.post('/api/login', async (c) => {
  const body = await c.req.parseBody()
  const dbPass = await getConfig(c.env.DB, 'password')
  if (body.password === dbPass) {
    setCookie(c, 'auth', 'true', { httpOnly: true, maxAge: 86400 * 30, path: '/' })
    return c.redirect('/admin')
  }
  return c.text('Error', 403)
})
app.post('/api/config', async (c) => {
  if (getCookie(c, 'auth') !== 'true') return c.redirect('/admin')
  const body = await c.req.parseBody()
  const updates = ['bio', 'email', 'qq', 'bg_url', 'site_title', 'status', 'start_date', 'notice']
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
  const body = await c.req.parseBody()
  await c.env.DB.prepare("UPDATE links SET sort_order = ? WHERE id = ?").bind(body.sort_order, body.id).run()
  return c.redirect('/admin')
})
app.post('/api/links/delete', async (c) => {
  if (getCookie(c, 'auth') !== 'true') return c.redirect('/admin')
  const body = await c.req.parseBody()
  await c.env.DB.prepare("DELETE FROM links WHERE id = ?").bind(body.id).run()
  return c.redirect('/admin')
})

export const onRequest = handle(app)
