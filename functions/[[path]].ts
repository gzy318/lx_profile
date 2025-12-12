/**
 * LX Profile - Ultimate Version
 * 集成编辑、搜索、位置识别、极致性能优化
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

// ------ 1. 前台主页 (极致性能 + 搜索 + 位置) ------
app.get('/', async (c) => {
  if (!c.env.DB) return c.text('Database Error', 500)

  // 1. 获取位置信息 (Cloudflare 原生能力)
  const city = c.req.raw.cf?.city || '未知星球'
  const country = c.req.raw.cf?.country || 'Universe'
  
  // 2. 并发查询数据
  const [linksResult, bio, email, qq, views, bgUrl, siteTitle, status, startDate] = await Promise.all([
    c.env.DB.prepare('SELECT * FROM links ORDER BY sort_order ASC, created_at DESC').all(),
    getConfig(c.env.DB, 'bio'),
    getConfig(c.env.DB, 'email'),
    getConfig(c.env.DB, 'qq'),
    getConfig(c.env.DB, 'views'),
    getConfig(c.env.DB, 'bg_url'),
    getConfig(c.env.DB, 'site_title'),
    getConfig(c.env.DB, 'status'),
    getConfig(c.env.DB, 'start_date')
  ])

  // 3. 异步增加访问量 (不阻塞页面渲染)
  c.executionCtx.waitUntil(c.env.DB.prepare("UPDATE config SET value = CAST(value AS INTEGER) + 1 WHERE key = 'views'").run())

  // 4. 计算运行天数
  const start = new Date(startDate as string || '2025-01-01').getTime()
  const now = new Date().getTime()
  const daysRunning = Math.floor((now - start) / (1000 * 60 * 60 * 24))

  // 5. 样式与资源
  const favicon = "https://twbk.cn/wp-content/uploads/2025/12/tx.png"
  const bgStyle = bgUrl 
    ? `background-image: url('${bgUrl}');` 
    : `background: radial-gradient(circle at top left, #fceec5, #f3f4f6, #e0e7ff);`

  // 6. 设置缓存 (浏览器缓存 60秒，CDN 缓存 60秒)
  c.header('Cache-Control', 'public, max-age=60')

  return c.html(`
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${siteTitle || 'LX Profile'}</title>
      <link rel="icon" href="${favicon}">
      <script src="https://cdn.tailwindcss.com"></script>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap" rel="stylesheet">
      <style>
        body { font-family: 'Inter', sans-serif; -webkit-font-smoothing: antialiased; background-size: cover; background-position: center; background-attachment: fixed;}
        /* 高级毛玻璃 */
        .glass-panel { 
          background: rgba(255, 255, 255, 0.75); 
          backdrop-filter: blur(24px) saturate(180%); 
          -webkit-backdrop-filter: blur(24px) saturate(180%);
          border: 1px solid rgba(255,255,255,0.6); 
          box-shadow: 0 8px 32px rgba(0,0,0,0.05);
        }
        .glass-card {
          background: rgba(255, 255, 255, 0.6);
          border: 1px solid rgba(255,255,255,0.4);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .glass-card:hover {
          background: rgba(255, 255, 255, 0.85);
          transform: translateY(-4px) scale(1.01);
          box-shadow: 0 12px 24px -8px rgba(0,0,0,0.1);
          border-color: rgba(255,255,255,0.9);
        }
        /* 搜索框动画 */
        #search-input:focus { box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.15); }
      </style>
    </head>
    <body class="min-h-screen flex flex-col items-center py-10 px-4 text-slate-800" style="${bgStyle}">
      
      <!-- 顶部欢迎条 -->
      <div class="mb-6 px-4 py-1.5 rounded-full glass-panel text-xs font-medium text-slate-500 animate-bounce cursor-default">
         👋 欢迎来自 ${city}, ${country} 的朋友
      </div>

      <main class="w-full max-w-[520px] animate-[fadeIn_0.6s_ease-out]">
        
        <!-- 个人信息卡片 -->
        <div class="glass-panel rounded-[2rem] p-8 mb-6 text-center relative overflow-hidden group">
           <!-- 背景光效 -->
           <div class="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-blue-50/50 to-transparent"></div>
           
           <div class="relative">
             <div class="w-28 h-28 mx-auto mb-5 rounded-full p-1.5 bg-white/80 shadow-inner">
                <img src="/avatar" onerror="this.src='${favicon}'" class="w-full h-full rounded-full object-cover shadow-sm transition duration-700 group-hover:rotate-[360deg]"/>
             </div>
             
             <!-- 状态标识 -->
             <div class="flex justify-center items-center gap-2 mb-2">
                <h1 class="text-2xl font-bold tracking-tight text-slate-900">${siteTitle}</h1>
                ${status === 'online' ? '<span class="relative flex h-3 w-3"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span class="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span></span>' : ''}
             </div>
             
             <p class="text-slate-500 mb-6 text-sm leading-relaxed max-w-[90%] mx-auto">${bio || 'Digital Nomad.'}</p>
             
             <!-- 联系按钮 -->
             <div class="flex justify-center gap-3">
               <a href="mailto:${email}" class="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-700 transition shadow-lg shadow-slate-200/50 flex items-center gap-2">
                 <span>📩</span> Email
               </a>
               ${qq ? `
               <a href="tencent://AddContact/?fromId=45&subcmd=all&uin=${qq}" class="px-5 py-2.5 bg-[#0099FF] text-white rounded-xl text-sm font-semibold hover:bg-[#007acc] transition shadow-lg shadow-blue-200/50 flex items-center gap-2">
                 <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8 8 8zm4.59-12.42c-.94-.94-2.48-.94-3.42 0L12 8.75l-1.17-1.17c-.94-.94-2.48-.94-3.42 0-.94.94-.94 2.48 0 3.42l2.59 2.59c.94.94 2.48.94 3.42 0l4.17-4.17c.94-.94.94-2.48 0-3.42z"/></svg>
                 Add QQ
               </a>` : ''}
             </div>
           </div>
        </div>

        <!-- 搜索框 -->
        <div class="relative mb-6 group">
          <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg class="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </div>
          <input type="text" id="search-input" placeholder="Search links..." 
                 class="w-full pl-10 pr-4 py-3 rounded-xl glass-panel text-sm text-slate-700 placeholder-slate-400 outline-none transition-all"
                 onkeyup="filterLinks()">
        </div>

        <!-- 链接列表 -->
        <div id="link-container" class="space-y-3">
          ${linksResult.results.map((link: any) => {
            let iconHtml = !link.icon 
              ? `<img src="https://www.google.com/s2/favicons?domain=${link.url}&sz=128" class="w-full h-full object-cover" />`
              : (link.icon.startsWith('http') ? `<img src="${link.icon}" class="w-full h-full object-cover" />` : `<span class="text-xl">${link.icon}</span>`);
            
            return `
            <a href="${link.url}" target="_blank" class="link-item glass-card block p-4 rounded-2xl flex items-center gap-4 group no-underline">
              <div class="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm shrink-0 overflow-hidden border border-slate-100">
                ${iconHtml}
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="font-bold text-slate-800 truncate text-[15px] group-hover:text-blue-600 transition-colors link-title">${link.title}</h3>
                <p class="text-xs text-slate-500 truncate mt-0.5 link-desc">${link.description || link.url}</p>
              </div>
              <div class="w-8 h-8 rounded-full bg-white/50 flex items-center justify-center text-slate-300 group-hover:bg-blue-50 group-hover:text-blue-500 transition-all">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
              </div>
            </a>
          `}).join('')}
        </div>
        
        <footer class="mt-12 text-center space-y-2">
            <div class="inline-flex items-center gap-4 text-[10px] text-slate-400 font-mono uppercase tracking-wider">
               <span>Views: ${views}</span>
               <span class="w-1 h-1 bg-slate-300 rounded-full"></span>
               <span>Running: ${daysRunning} Days</span>
            </div>
            <div>
               <a href="/admin" class="text-[10px] text-slate-300 hover:text-slate-500 transition p-2">Admin Panel</a>
            </div>
        </footer>
      </main>

      <script>
        // 前端搜索逻辑
        function filterLinks() {
          const input = document.getElementById('search-input');
          const filter = input.value.toUpperCase();
          const container = document.getElementById('link-container');
          const items = container.getElementsByClassName('link-item');

          for (let i = 0; i < items.length; i++) {
            const title = items[i].getElementsByClassName('link-title')[0].textContent || items[i].getElementsByClassName('link-title')[0].innerText;
            const desc = items[i].getElementsByClassName('link-desc')[0].textContent || items[i].getElementsByClassName('link-desc')[0].innerText;
            if (title.toUpperCase().indexOf(filter) > -1 || desc.toUpperCase().indexOf(filter) > -1) {
              items[i].style.display = "";
            } else {
              items[i].style.display = "none";
            }
          }
        }
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

// ------ 3. 后台管理 (支持编辑模式) ------
app.get('/admin', async (c) => {
  if (!c.env.DB) return c.text('DB Error', 500)
  
  const cookie = getCookie(c, 'auth')
  if (cookie !== 'true') {
    // 登录页
    return c.html(`
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <body style="height:100vh;display:flex;align-items:center;justify-content:center;background:#f8fafc;font-family:system-ui;">
        <form action="/api/login" method="post" style="padding:2.5rem;background:white;border-radius:1.5rem;box-shadow:0 20px 25px -5px rgba(0,0,0,0.1);width:320px;">
          <h2 style="margin:0 0 1.5rem 0;font-size:1.5rem;font-weight:700;">Admin Login</h2>
          <input type="password" name="password" placeholder="Passcode" style="width:100%;padding:12px;border:1px solid #e2e8f0;border-radius:0.75rem;margin-bottom:1rem;background:#f8fafc;box-sizing:border-box;" required>
          <button style="width:100%;padding:12px;background:#0f172a;color:white;border:none;border-radius:0.75rem;font-weight:600;cursor:pointer;">Unlock</button>
        </form>
      </body>
    `)
  }

  // 获取 URL 参数看是否在编辑模式
  const editId = c.req.query('edit_id')
  let editLink = null
  if (editId) {
    editLink = await c.env.DB.prepare("SELECT * FROM links WHERE id = ?").bind(editId).first()
  }

  // 并发获取数据
  const [linksResult, bio, email, qq, bgUrl, siteTitle, status, startDate] = await Promise.all([
    c.env.DB.prepare('SELECT * FROM links ORDER BY sort_order ASC, created_at DESC').all(),
    getConfig(c.env.DB, 'bio'),
    getConfig(c.env.DB, 'email'),
    getConfig(c.env.DB, 'qq'),
    getConfig(c.env.DB, 'bg_url'),
    getConfig(c.env.DB, 'site_title'),
    getConfig(c.env.DB, 'status'),
    getConfig(c.env.DB, 'start_date')
  ])

  return c.html(`
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>LX Admin</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet">
      <style>body { font-family: 'Inter', sans-serif; background: #f1f5f9; }</style>
    </head>
    <body class="p-4 pb-20">
      <div class="max-w-5xl mx-auto">
        <!-- 头部 -->
        <div class="flex justify-between items-center mb-8 bg-white p-4 rounded-xl shadow-sm">
          <div class="flex items-center gap-3">
             <div class="w-10 h-10 bg-slate-900 rounded-full flex items-center justify-center text-white font-bold">L</div>
             <h1 class="text-xl font-bold text-slate-800">Console</h1>
          </div>
          <a href="/" target="_blank" class="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center gap-1">
            Open Site <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
          </a>
        </div>

        <div class="grid lg:grid-cols-3 gap-6">
          
          <!-- 左栏：基本设置 -->
          <div class="lg:col-span-1 space-y-6">
            <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h2 class="font-bold text-slate-800 mb-4 flex items-center gap-2">⚙️ 个人资料</h2>
              <form action="/api/config" method="post" class="space-y-4">
                <div>
                  <label class="block text-xs font-semibold text-slate-400 mb-1">站点标题</label>
                  <input type="text" name="site_title" value="${siteTitle || ''}" class="w-full border p-2.5 rounded-lg text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition">
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-400 mb-1">简介</label>
                  <textarea name="bio" rows="3" class="w-full border p-2.5 rounded-lg text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition">${bio || ''}</textarea>
                </div>
                <div class="grid grid-cols-2 gap-3">
                   <div>
                      <label class="block text-xs font-semibold text-slate-400 mb-1">Email</label>
                      <input type="text" name="email" value="${email || ''}" class="w-full border p-2.5 rounded-lg text-sm bg-slate-50">
                   </div>
                   <div>
                      <label class="block text-xs font-semibold text-slate-400 mb-1">QQ (加好友)</label>
                      <input type="text" name="qq" value="${qq || ''}" class="w-full border p-2.5 rounded-lg text-sm bg-slate-50">
                   </div>
                </div>
                <div>
                   <label class="block text-xs font-semibold text-slate-400 mb-1">背景图 URL</label>
                   <input type="text" name="bg_url" value="${bgUrl || ''}" placeholder="https://..." class="w-full border p-2.5 rounded-lg text-sm bg-slate-50">
                </div>
                <div class="grid grid-cols-2 gap-3">
                   <div>
                     <label class="block text-xs font-semibold text-slate-400 mb-1">状态</label>
                     <select name="status" class="w-full border p-2.5 rounded-lg text-sm bg-slate-50">
                       <option value="online" ${status === 'online' ? 'selected' : ''}>🟢 Online</option>
                       <option value="busy" ${status === 'busy' ? 'selected' : ''}>🔴 Busy</option>
                       <option value="offline" ${status === 'offline' ? 'selected' : ''}>🌑 Offline</option>
                     </select>
                   </div>
                   <div>
                     <label class="block text-xs font-semibold text-slate-400 mb-1">建站日期</label>
                     <input type="date" name="start_date" value="${startDate || ''}" class="w-full border p-2.5 rounded-lg text-sm bg-slate-50">
                   </div>
                </div>
                <button class="w-full bg-slate-900 text-white py-2.5 rounded-lg font-medium hover:bg-slate-800 transition shadow-lg shadow-slate-200">Save Config</button>
              </form>
            </div>
          </div>

          <!-- 右栏：链接管理 -->
          <div class="lg:col-span-2 space-y-6">
            
            <!-- 添加/编辑 链接表单 -->
            <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden" id="edit-area">
              <div class="absolute top-0 right-0 p-4 opacity-10 text-6xl">🔗</div>
              <h2 class="font-bold text-slate-800 mb-4 flex items-center gap-2">
                 ${editLink ? '✏️ 编辑链接 (Editing)' : '➕ 添加链接 (Add New)'}
                 ${editLink ? `<a href="/admin" class="text-xs font-normal text-red-500 bg-red-50 px-2 py-1 rounded ml-2">取消编辑</a>` : ''}
              </h2>
              
              <form action="${editLink ? '/api/links/update' : '/api/links'}" method="post" class="space-y-4 relative z-10">
                ${editLink ? `<input type="hidden" name="id" value="${editLink.id}">` : ''}
                
                <div class="grid md:grid-cols-2 gap-4">
                  <div>
                    <input type="text" name="title" value="${editLink ? editLink.title : ''}" placeholder="标题 (Title)" class="w-full border p-3 rounded-xl bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500/20 transition" required>
                  </div>
                  <div>
                    <input type="url" name="url" value="${editLink ? editLink.url : ''}" placeholder="链接 (URL)" class="w-full border p-3 rounded-xl bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500/20 transition" required>
                  </div>
                </div>
                
                <div class="grid grid-cols-4 gap-4">
                   <div class="col-span-1">
                      <input type="number" name="sort_order" value="${editLink ? editLink.sort_order : '0'}" placeholder="排序" class="w-full border p-3 rounded-xl bg-slate-50 text-center" title="数字越小越靠前">
                   </div>
                   <div class="col-span-3">
                      <input type="text" name="icon" value="${editLink ? (editLink.icon || '') : ''}" placeholder="图标 (Emoji 或 图片URL，留空自动获取)" class="w-full border p-3 rounded-xl bg-slate-50">
                   </div>
                </div>
                
                <input type="text" name="description" value="${editLink ? (editLink.description || '') : ''}" placeholder="描述 (可选)" class="w-full border p-3 rounded-xl bg-slate-50">
                
                <button class="w-full ${editLink ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'} text-white py-3 rounded-xl font-bold transition shadow-lg transform active:scale-[0.99]">
                   ${editLink ? 'Update Link' : 'Add Link'}
                </button>
              </form>
            </div>

            <!-- 列表 -->
            <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
               <div class="p-4 border-b bg-slate-50 flex justify-between items-center">
                  <h3 class="font-bold text-slate-700">Links List</h3>
                  <span class="text-xs bg-white px-2 py-1 rounded border">Total: ${linksResult.results.length}</span>
               </div>
               <div class="divide-y divide-slate-100">
                 ${linksResult.results.map((link: any) => `
                   <div class="p-4 flex items-center gap-4 hover:bg-slate-50 transition group">
                      <!-- 排序修改 -->
                      <form action="/api/links/update_order" method="post">
                        <input type="hidden" name="id" value="${link.id}">
                        <input name="sort_order" value="${link.sort_order}" class="w-8 h-8 text-center border rounded bg-white text-xs focus:ring-2 focus:ring-blue-500 outline-none" onchange="this.form.submit()">
                      </form>
                      
                      <!-- 图标 -->
                      <div class="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-xl overflow-hidden">
                        ${!link.icon ? '🕸️' : (link.icon.startsWith('http') ? `<img src="${link.icon}" class="w-full h-full object-cover">` : link.icon)}
                      </div>

                      <!-- 内容 -->
                      <div class="flex-1 min-w-0">
                         <div class="font-bold text-slate-800 truncate">${link.title}</div>
                         <div class="text-xs text-slate-400 truncate">${link.url}</div>
                      </div>

                      <!-- 操作按钮 -->
                      <div class="flex items-center gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition">
                        <a href="/admin?edit_id=${link.id}#edit-area" class="px-3 py-1.5 bg-blue-50 text-blue-600 text-xs font-medium rounded-lg hover:bg-blue-100">Edit</a>
                        
                        <form action="/api/links/delete" method="post" onsubmit="return confirm('Delete?')">
                          <input type="hidden" name="id" value="${link.id}">
                          <button class="px-3 py-1.5 bg-red-50 text-red-500 text-xs font-medium rounded-lg hover:bg-red-100">Del</button>
                        </form>
                      </div>
                   </div>
                 `).join('')}
               </div>
            </div>

          </div>
        </div>
      </div>
    </body>
    </html>
  `)
})

// ------ 4. API 逻辑 ------

// 登录
app.post('/api/login', async (c) => {
  const body = await c.req.parseBody()
  const dbPass = await getConfig(c.env.DB, 'password')
  if (body.password === dbPass) {
    setCookie(c, 'auth', 'true', { httpOnly: true, maxAge: 86400 * 30, path: '/' })
    return c.redirect('/admin')
  }
  return c.text('Wrong Password', 403)
})

// 更新配置
app.post('/api/config', async (c) => {
  if (getCookie(c, 'auth') !== 'true') return c.redirect('/admin')
  const body = await c.req.parseBody()
  const updates = ['bio', 'email', 'qq', 'bg_url', 'site_title', 'status', 'start_date']
  const stmt = c.env.DB.prepare("UPDATE config SET value = ? WHERE key = ?")
  const batch = updates.map(key => stmt.bind(body[key], key))
  await c.env.DB.batch(batch)
  return c.redirect('/admin')
})

// 添加链接
app.post('/api/links', async (c) => {
  if (getCookie(c, 'auth') !== 'true') return c.redirect('/admin')
  const body = await c.req.parseBody()
  await c.env.DB.prepare("INSERT INTO links (title, url, icon, description, sort_order) VALUES (?, ?, ?, ?, ?)")
    .bind(body.title, body.url, body.icon, body.description, body.sort_order || 0).run()
  return c.redirect('/admin')
})

// 更新链接 (编辑模式新增接口)
app.post('/api/links/update', async (c) => {
  if (getCookie(c, 'auth') !== 'true') return c.redirect('/admin')
  const body = await c.req.parseBody()
  await c.env.DB.prepare(`
    UPDATE links SET title = ?, url = ?, icon = ?, description = ?, sort_order = ? 
    WHERE id = ?
  `).bind(body.title, body.url, body.icon, body.description, body.sort_order, body.id).run()
  return c.redirect('/admin')
})

// 更新排序
app.post('/api/links/update_order', async (c) => {
  if (getCookie(c, 'auth') !== 'true') return c.redirect('/admin')
  const body = await c.req.parseBody()
  await c.env.DB.prepare("UPDATE links SET sort_order = ? WHERE id = ?").bind(body.sort_order, body.id).run()
  return c.redirect('/admin')
})

// 删除链接
app.post('/api/links/delete', async (c) => {
  if (getCookie(c, 'auth') !== 'true') return c.redirect('/admin')
  const body = await c.req.parseBody()
  await c.env.DB.prepare("DELETE FROM links WHERE id = ?").bind(body.id).run()
  return c.redirect('/admin')
})

export const onRequest = handle(app)
