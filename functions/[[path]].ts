import { Hono } from 'hono'
import { handle } from 'hono/cloudflare-pages'
import { setCookie, getCookie } from 'hono/cookie'

interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
}

const app = new Hono<{ Bindings: Env }>()

// ------ 工具函数：获取配置 ------
async function getConfig(db: D1Database, key: string) {
  return await db.prepare("SELECT value FROM config WHERE key = ?").bind(key).first('value')
}

// ------ 1. 前台主页 ------
app.get('/', async (c) => {
  if (!c.env.DB) return c.text('Database Error: Bindings not found', 500)

  // 并发获取所有数据，速度飞快
  const [linksResult, bio, email, qq, views, bgUrl, siteTitle, status] = await Promise.all([
    c.env.DB.prepare('SELECT * FROM links ORDER BY sort_order ASC, created_at DESC').all(),
    getConfig(c.env.DB, 'bio'),
    getConfig(c.env.DB, 'email'),
    getConfig(c.env.DB, 'qq'),
    getConfig(c.env.DB, 'views'),
    getConfig(c.env.DB, 'bg_url'),
    getConfig(c.env.DB, 'site_title'),
    getConfig(c.env.DB, 'status')
  ])

  // 访问量 +1 (异步执行，不阻塞页面加载)
  c.executionCtx.waitUntil(c.env.DB.prepare("UPDATE config SET value = CAST(value AS INTEGER) + 1 WHERE key = 'views'").run())

  // 状态颜色逻辑
  const statusColors: any = { online: 'bg-green-500', busy: 'bg-red-500', offline: 'bg-gray-400' }
  const statusColor = statusColors[status as string] || 'bg-green-500'
  
  // 背景图逻辑 (如果为空则使用默认渐变)
  const bgStyle = bgUrl 
    ? `background-image: url('${bgUrl}'); background-size: cover; background-position: center;` 
    : `background: linear-gradient(135deg, #fdfbf7 0%, #eef2f3 100%);`

  return c.html(`
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${siteTitle}</title>
      <meta name="description" content="${bio}">
      <script src="https://cdn.tailwindcss.com"></script>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;500;700&display=swap" rel="stylesheet">
      <style>
        body { font-family: 'Noto Sans SC', sans-serif; }
        /* 玻璃拟态 - 支持夜间模式自动适配 */
        .glass { 
          background: rgba(255, 255, 255, 0.65); 
          backdrop-filter: blur(16px); 
          -webkit-backdrop-filter: blur(16px); 
          border: 1px solid rgba(255,255,255,0.5); 
        }
        @media (prefers-color-scheme: dark) {
          body { background-color: #111; color: #eee; }
          .glass { background: rgba(30, 30, 30, 0.6); border: 1px solid rgba(255,255,255,0.1); color: #eee; }
          .text-stone-800 { color: #eee !important; }
          .text-stone-500 { color: #aaa !important; }
          .bg-stone-900 { background-color: #eee !important; color: #000 !important; }
        }
        .btn-hover { transition: transform 0.2s, box-shadow 0.2s; }
        .btn-hover:hover { transform: translateY(-3px); box-shadow: 0 10px 20px rgba(0,0,0,0.1); }
      </style>
    </head>
    <body class="min-h-screen flex flex-col items-center justify-center p-4 relative transition-colors duration-500" style="${bgStyle}">
      
      <!-- 主卡片 -->
      <main class="w-full max-w-xl animate-[fadeIn_0.6s_ease-out]">
        <div class="glass rounded-3xl p-8 mb-6 text-center shadow-lg relative overflow-hidden">
           
           <!-- 头像 & 状态灯 -->
           <div class="relative w-28 h-28 mx-auto mb-5">
              <div class="w-full h-full rounded-full p-1 bg-white/50 shadow-sm overflow-hidden">
                <img src="/avatar" onerror="this.src='https://ui-avatars.com/api/?name=LX&size=128'" class="w-full h-full rounded-full object-cover"/>
              </div>
              <div class="absolute bottom-1 right-1 w-5 h-5 ${statusColor} rounded-full border-2 border-white shadow-sm animate-pulse"></div>
           </div>

           <h1 class="text-3xl font-bold mb-2 tracking-tight text-stone-800">${siteTitle}</h1>
           <p class="text-stone-500 mb-6 font-light leading-relaxed text-sm px-4">${bio || '这个人很懒，什么都没写'}</p>
           
           <!-- 社交按钮组 -->
           <div class="flex justify-center gap-3">
             <a href="mailto:${email}" class="flex items-center gap-2 px-5 py-2 bg-stone-900 text-white rounded-full text-sm font-medium hover:opacity-90 transition shadow-lg">
               ✉️ Email
             </a>
             ${qq ? `
             <a href="https://wpa.qq.com/msgrd?v=3&uin=${qq}&site=qq&menu=yes" target="_blank" class="flex items-center gap-2 px-5 py-2 bg-blue-500 text-white rounded-full text-sm font-medium hover:bg-blue-600 transition shadow-lg">
               <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8 8 8zm4.59-12.42c-.94-.94-2.48-.94-3.42 0L12 8.75l-1.17-1.17c-.94-.94-2.48-.94-3.42 0-.94.94-.94 2.48 0 3.42l2.59 2.59c.94.94 2.48.94 3.42 0l4.17-4.17c.94-.94.94-2.48 0-3.42z"/></svg>
               QQ交谈
             </a>` : ''}
           </div>
        </div>

        <!-- 链接列表 -->
        <div class="space-y-3">
          ${linksResult.results.map((link: any) => {
            // 自动图标逻辑: 如果没填icon，用Google Favicon；如果填了emoji，直接显示；如果填了http，显示图片
            let iconHtml = '';
            if (!link.icon) {
              iconHtml = `<img src="https://www.google.com/s2/favicons?domain=${link.url}&sz=64" class="w-6 h-6 rounded-md" />`;
            } else if (link.icon.startsWith('http')) {
              iconHtml = `<img src="${link.icon}" class="w-8 h-8 rounded-md" />`;
            } else {
              iconHtml = `<span class="text-2xl">${link.icon}</span>`;
            }

            return `
            <a href="${link.url}" target="_blank" class="glass block p-4 rounded-2xl flex items-center group btn-hover no-underline relative overflow-hidden">
              <div class="absolute left-0 top-0 h-full w-1 bg-stone-800 opacity-0 group-hover:opacity-100 transition"></div>
              <div class="w-12 h-12 rounded-xl bg-white/60 flex items-center justify-center shadow-sm mr-4 shrink-0">
                ${iconHtml}
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="font-bold text-stone-800 truncate">${link.title}</h3>
                <p class="text-xs text-stone-500 mt-0.5 truncate">${link.description || link.url}</p>
              </div>
              <div class="text-stone-400 group-hover:translate-x-1 transition">→</div>
            </a>
          `}).join('')}
        </div>
        
        <footer class="mt-10 text-center pb-6">
            <p class="text-xs text-stone-400 font-mono">Total Views: ${views}</p>
            <a href="/admin" class="text-[10px] text-stone-300 hover:text-stone-500 transition mt-2 inline-block">Manager</a>
        </footer>
      </main>
    </body>
    </html>
  `)
})

// ------ 2. 图片代理 ------
app.get('/avatar', async (c) => {
  if (!c.env.BUCKET) return c.redirect('https://ui-avatars.com/api/?name=User')
  const object = await c.env.BUCKET.get('avatar.png')
  if (!object) return c.redirect('https://ui-avatars.com/api/?name=User')
  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('etag', object.httpEtag)
  return new Response(object.body, { headers })
})

// ------ 3. 后台管理 ------
app.get('/admin', async (c) => {
  if (!c.env.DB) return c.text('DB Error', 500)
  
  const cookie = getCookie(c, 'auth')
  if (cookie !== 'true') {
    return c.html(`
      <body style="height:100vh;display:flex;align-items:center;justify-content:center;background:#f3f4f6;">
        <form action="/api/login" method="post" style="padding:2rem;background:white;border-radius:1rem;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
          <h2 style="margin:0 0 1rem 0;">管理员登录</h2>
          <input type="password" name="password" placeholder="密码" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;margin-bottom:1rem;" required>
          <button style="width:100%;padding:10px;background:black;color:white;border:none;border-radius:6px;cursor:pointer;">Enter</button>
        </form>
      </body>
    `)
  }

  // 获取所有配置
  const [linksResult, bio, email, qq, bgUrl, siteTitle, status] = await Promise.all([
    c.env.DB.prepare('SELECT * FROM links ORDER BY sort_order ASC, created_at DESC').all(),
    getConfig(c.env.DB, 'bio'),
    getConfig(c.env.DB, 'email'),
    getConfig(c.env.DB, 'qq'),
    getConfig(c.env.DB, 'bg_url'),
    getConfig(c.env.DB, 'site_title'),
    getConfig(c.env.DB, 'status')
  ])

  return c.html(`
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gray-100 min-h-screen p-4 pb-20">
      <div class="max-w-4xl mx-auto">
        <div class="flex justify-between items-center mb-6">
          <h1 class="text-2xl font-bold">后台控制台</h1>
          <a href="/" class="text-blue-600 hover:underline">预览主页</a>
        </div>

        <div class="grid md:grid-cols-2 gap-6">
          <!-- 1. 基础配置 -->
          <div class="bg-white p-6 rounded-xl shadow-sm space-y-4">
            <h2 class="font-bold border-b pb-2">基础设置</h2>
            <form action="/api/config" method="post" class="space-y-3">
              <div>
                <label class="text-xs text-gray-500">网站标题</label>
                <input type="text" name="site_title" value="${siteTitle || ''}" class="w-full border p-2 rounded">
              </div>
              <div>
                <label class="text-xs text-gray-500">个人简介</label>
                <textarea name="bio" rows="2" class="w-full border p-2 rounded">${bio || ''}</textarea>
              </div>
              <div>
                 <label class="text-xs text-gray-500">当前状态</label>
                 <select name="status" class="w-full border p-2 rounded bg-white">
                   <option value="online" ${status === 'online' ? 'selected' : ''}>🟢 在线 (Online)</option>
                   <option value="busy" ${status === 'busy' ? 'selected' : ''}>🔴 忙碌 (Busy)</option>
                   <option value="offline" ${status === 'offline' ? 'selected' : ''}>🌑 隐身 (Offline)</option>
                 </select>
              </div>
              <div>
                <label class="text-xs text-gray-500">背景图片 URL (留空则默认)</label>
                <input type="text" name="bg_url" value="${bgUrl || ''}" placeholder="https://..." class="w-full border p-2 rounded">
              </div>
              <div class="grid grid-cols-2 gap-2">
                 <div>
                    <label class="text-xs text-gray-500">邮箱</label>
                    <input type="text" name="email" value="${email || ''}" class="w-full border p-2 rounded">
                 </div>
                 <div>
                    <label class="text-xs text-gray-500">QQ号</label>
                    <input type="text" name="qq" value="${qq || ''}" class="w-full border p-2 rounded">
                 </div>
              </div>
              <button class="w-full bg-slate-800 text-white py-2 rounded hover:bg-slate-700">保存设置</button>
            </form>
          </div>

          <!-- 2. 添加链接 -->
          <div class="bg-white p-6 rounded-xl shadow-sm">
            <h2 class="font-bold border-b pb-2 mb-4">添加新链接</h2>
            <form action="/api/links" method="post" class="space-y-3">
              <input type="text" name="title" placeholder="标题 (如: 我的博客)" class="w-full border p-2 rounded" required>
              <input type="url" name="url" placeholder="链接 (https://...)" class="w-full border p-2 rounded" required>
              <div class="flex gap-2">
                 <input type="number" name="sort_order" value="0" placeholder="排序(0最前)" class="w-24 border p-2 rounded">
                 <input type="text" name="icon" placeholder="图标(空则自动获取)" class="flex-1 border p-2 rounded">
              </div>
              <input type="text" name="description" placeholder="一句话描述" class="w-full border p-2 rounded">
              <button class="w-full bg-emerald-600 text-white py-2 rounded hover:bg-emerald-700">添加链接</button>
            </form>
          </div>
        </div>

        <!-- 3. 链接管理列表 -->
        <div class="mt-6 bg-white p-6 rounded-xl shadow-sm">
           <h2 class="font-bold border-b pb-2 mb-4">现有链接 (共 ${linksResult.results.length} 个)</h2>
           <div class="space-y-2">
             ${linksResult.results.map((link: any) => `
               <div class="flex items-center gap-3 p-3 border rounded hover:bg-gray-50">
                  <form action="/api/links/update_order" method="post" class="flex flex-col items-center">
                    <label class="text-[10px] text-gray-400">排序</label>
                    <input name="sort_order" value="${link.sort_order}" class="w-10 text-center border rounded text-sm" onchange="this.form.submit()">
                    <input type="hidden" name="id" value="${link.id}">
                  </form>
                  <div class="flex-1">
                     <div class="font-bold">${link.title}</div>
                     <div class="text-xs text-gray-500">${link.url}</div>
                  </div>
                  <div class="text-2xl">${link.icon ? link.icon : '🕸️'}</div>
                  <form action="/api/links/delete" method="post" onsubmit="return confirm('删掉？')">
                    <input type="hidden" name="id" value="${link.id}">
                    <button class="text-red-500 text-sm px-2">删除</button>
                  </form>
               </div>
             `).join('')}
           </div>
        </div>

      </div>
    </body>
    </html>
  `)
})

// ------ 4. API 逻辑 ------
app.post('/api/login', async (c) => {
  const body = await c.req.parseBody()
  const dbPass = await getConfig(c.env.DB, 'password')
  if (body.password === dbPass) {
    setCookie(c, 'auth', 'true', { httpOnly: true, maxAge: 86400 * 30, path: '/' })
    return c.redirect('/admin')
  }
  return c.text('密码错误', 403)
})

app.post('/api/config', async (c) => {
  if (getCookie(c, 'auth') !== 'true') return c.redirect('/admin')
  const body = await c.req.parseBody()
  // 批量更新
  const updates = ['bio', 'email', 'qq', 'bg_url', 'site_title', 'status']
  const stmt = c.env.DB.prepare("UPDATE config SET value = ? WHERE key = ?")
  const batch = updates.map(key => stmt.bind(body[key], key))
  await c.env.DB.batch(batch)
  return c.redirect('/admin')
})

app.post('/api/links', async (c) => {
  if (getCookie(c, 'auth') !== 'true') return c.redirect('/admin')
  const body = await c.req.parseBody()
  await c.env.DB.prepare("INSERT INTO links (title, url, icon, description, sort_order) VALUES (?, ?, ?, ?, ?)")
    .bind(body.title, body.url, body.icon, body.description, body.sort_order || 0).run()
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
