import { Hono } from 'hono'
import { setCookie, getCookie } from 'hono/cookie'

interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
}

const app = new Hono<{ Bindings: Env }>()

// 1. 前台主页
app.get('/', async (c) => {
  const { results: links } = await c.env.DB.prepare('SELECT * FROM links ORDER BY created_at DESC').all()
  const bio = await c.env.DB.prepare("SELECT value FROM config WHERE key = 'bio'").first('value')
  const email = await c.env.DB.prepare("SELECT value FROM config WHERE key = 'email'").first('value')

  return c.html(`
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>零星主页 | LX Profile</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;700&display=swap" rel="stylesheet">
      <style>
        body { font-family: 'Noto Sans SC', sans-serif; background: #fdfbf7; color: #1c1917; }
        .glass { background: rgba(255, 255, 255, 0.6); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.8); }
        .btn-hover { transition: all 0.2s ease; }
        .btn-hover:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
      </style>
    </head>
    <body class="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-x-hidden">
      <!-- 背景装饰 -->
      <div class="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-orange-100 blur-3xl opacity-50 -z-10"></div>
      <div class="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-100 blur-3xl opacity-50 -z-10"></div>

      <main class="w-full max-w-2xl animate-[fadeIn_0.5s_ease-out]">
        <!-- 头部卡片 -->
        <div class="glass rounded-3xl p-8 mb-6 text-center shadow-sm">
           <div class="w-28 h-28 mx-auto mb-5 rounded-full p-1 bg-white shadow-sm overflow-hidden">
              <img src="/avatar" onerror="this.src='https://ui-avatars.com/api/?name=LX&background=000&color=fff'" class="w-full h-full rounded-full object-cover"/>
           </div>
           <h1 class="text-3xl font-bold mb-2 tracking-tight text-stone-800">Lx Profile</h1>
           <p class="text-stone-500 mb-6 font-light leading-relaxed">${bio}</p>
           <a href="mailto:${email}" class="inline-flex items-center px-6 py-2 bg-stone-900 text-white rounded-full text-sm hover:bg-stone-700 transition shadow-lg shadow-stone-200">
             联系我
           </a>
        </div>

        <!-- 链接列表 -->
        <div class="space-y-3">
          ${links.map((link: any) => `
            <a href="${link.url}" target="_blank" class="glass block p-4 rounded-xl flex items-center group btn-hover no-underline">
              <div class="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-xl shadow-sm text-stone-700 mr-4">
                ${link.icon || '✦'}
              </div>
              <div class="flex-1">
                <h3 class="font-bold text-stone-800">${link.title}</h3>
                <p class="text-xs text-stone-400 mt-0.5">${link.description || '点击访问'}</p>
              </div>
              <div class="text-stone-300 group-hover:text-stone-500 transition">→</div>
            </a>
          `).join('')}
        </div>
        
        <footer class="mt-12 text-center">
            <a href="/admin" class="text-xs text-stone-300 hover:text-stone-500 transition">管理后台</a>
        </footer>
      </main>
    </body>
    </html>
  `)
})

// 2. 头像图片代理 (R2)
app.get('/avatar', async (c) => {
  const object = await c.env.BUCKET.get('avatar.png')
  if (!object) return c.text('No Avatar', 404)
  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('etag', object.httpEtag)
  return new Response(object.body, { headers })
})

// 3. 后台管理 (Admin)
app.get('/admin', async (c) => {
  const cookie = getCookie(c, 'auth')
  const isLogged = cookie === 'true'

  if (!isLogged) {
    return c.html(`
      <body style="height:100vh;display:flex;align-items:center;justify-content:center;background:#fafafa;font-family:sans-serif;">
        <form action="/api/login" method="post" style="padding:2rem;background:white;border-radius:1rem;box-shadow:0 4px 20px rgba(0,0,0,0.05);width:300px;">
          <h2 style="margin:0 0 1.5rem 0;color:#333;">零星后台验证</h2>
          <input type="password" name="password" placeholder="输入密码" style="width:100%;padding:10px;margin-bottom:1rem;border:1px solid #eee;border-radius:6px;box-sizing:border-box;" required>
          <button style="width:100%;padding:10px;background:#1c1917;color:white;border:none;border-radius:6px;cursor:pointer;">登录</button>
        </form>
      </body>
    `)
  }

  const { results: links } = await c.env.DB.prepare('SELECT * FROM links ORDER BY created_at DESC').all()
  const bio = await c.env.DB.prepare("SELECT value FROM config WHERE key = 'bio'").first('value')

  return c.html(`
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head><script src="https://cdn.tailwindcss.com"></script></head>
    <body class="bg-stone-50 min-h-screen p-6 font-sans">
      <div class="max-w-3xl mx-auto">
        <div class="flex justify-between items-center mb-8">
          <h1 class="text-2xl font-bold text-stone-800">零星控制台</h1>
          <a href="/" class="text-stone-500 hover:underline text-sm">返回主页</a>
        </div>

        <div class="bg-white p-6 rounded-2xl shadow-sm mb-6">
          <h2 class="font-bold text-stone-700 mb-4">个人资料</h2>
          <form action="/api/config" method="post" class="space-y-4">
             <textarea name="bio" class="w-full border p-3 rounded-lg bg-stone-50 text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-200" rows="3">${bio}</textarea>
             <div class="text-right"><button class="bg-stone-800 text-white px-4 py-2 rounded-lg text-sm">保存资料</button></div>
          </form>
        </div>

        <div class="bg-white p-6 rounded-2xl shadow-sm mb-6">
          <h2 class="font-bold text-stone-700 mb-4">添加链接</h2>
          <form action="/api/links" method="post" class="grid grid-cols-1 md:grid-cols-2 gap-3">
             <input type="text" name="title" placeholder="标题 (例如: 博客)" class="border p-2 rounded-lg bg-stone-50" required>
             <input type="url" name="url" placeholder="链接 (https://...)" class="border p-2 rounded-lg bg-stone-50" required>
             <input type="text" name="icon" placeholder="图标Emoji (✦)" class="border p-2 rounded-lg bg-stone-50">
             <input type="text" name="description" placeholder="一句话描述" class="border p-2 rounded-lg bg-stone-50">
             <button class="md:col-span-2 bg-emerald-600 text-white p-2 rounded-lg text-sm hover:bg-emerald-700 transition">添加</button>
          </form>
        </div>

        <div class="space-y-2">
          ${links.map((link: any) => `
            <div class="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-stone-100">
               <div>
                 <div class="font-bold text-stone-800">${link.icon || '✦'} ${link.title}</div>
                 <div class="text-xs text-stone-400">${link.url}</div>
               </div>
               <form action="/api/links/delete" method="post" onsubmit="return confirm('确认删除？')">
                 <input type="hidden" name="id" value="${link.id}">
                 <button class="text-red-400 hover:text-red-600 text-sm">删除</button>
               </form>
            </div>
          `).join('')}
        </div>
      </div>
    </body>
    </html>
  `)
})

// 4. API 逻辑
app.post('/api/login', async (c) => {
  const body = await c.req.parseBody()
  const dbPass = await c.env.DB.prepare("SELECT value FROM config WHERE key = 'password'").first('value')
  if (body.password === dbPass) {
    setCookie(c, 'auth', 'true', { httpOnly: true, maxAge: 86400 * 7, path: '/' })
    return c.redirect('/admin')
  }
  return c.text('密码错误', 403)
})

app.post('/api/config', async (c) => {
  if (getCookie(c, 'auth') !== 'true') return c.redirect('/admin')
  const body = await c.req.parseBody()
  await c.env.DB.prepare("UPDATE config SET value = ? WHERE key = 'bio'").bind(body.bio).run()
  return c.redirect('/admin')
})

app.post('/api/links', async (c) => {
  if (getCookie(c, 'auth') !== 'true') return c.redirect('/admin')
  const body = await c.req.parseBody()
  await c.env.DB.prepare("INSERT INTO links (title, url, icon, description) VALUES (?, ?, ?, ?)")
    .bind(body.title, body.url, body.icon, body.description).run()
  return c.redirect('/admin')
})

app.post('/api/links/delete', async (c) => {
  if (getCookie(c, 'auth') !== 'true') return c.redirect('/admin')
  const body = await c.req.parseBody()
  await c.env.DB.prepare("DELETE FROM links WHERE id = ?").bind(body.id).run()
  return c.redirect('/admin')
})

export const onRequest = app.fetch
