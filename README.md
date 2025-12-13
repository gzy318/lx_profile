# 🚀 LX Profile (极速个人主页系统)

![Version](https://img.shields.io/badge/Version-28.0.0-blue.svg)
![License](https://img.shields.io/badge/License-MIT-green.svg)
![Platform](https://img.shields.io/badge/Platform-Cloudflare%20Pages-orange.svg)
![Performance](https://img.shields.io/badge/Performance-Extreme-brightgreen.svg)

> **LX Profile** 是一个基于 **Cloudflare Workers/Pages + D1 + R2** 构建的超高性能、全栈无服务器（Serverless）个人主页系统。
>
> 它的核心设计哲学是：**极致轻量、零外部依赖、针对中国大陆网络环境的绝对优化**。

---

## ✨ 核心特性 (Features)

### ⚡ 极致性能与中国大陆优化
*   **0 CDN 依赖 (Zero External Requests)**
    *   彻底移除了 Tailwind CSS、Google Fonts 等所有外部资源引用。
    *   所有 CSS 样式表（经过极致压缩）和 JS 逻辑直接内嵌于 HTML，确保在中国大陆恶劣的网络环境下也能**毫秒级秒开**。
*   **SSR 服务端渲染 (Server-Side Rendering)**
    *   **倒计时直出**：年份进度条、访客地理位置等数据由 Cloudflare 边缘节点直接计算并渲染为静态 HTML。用户打开网页瞬间即看到完整内容，**无 Loading，无布局偏移 (CLS)**。
    *   **时区校准**：服务端强制锁定 `Asia/Shanghai` (UTC+8) 时区，无论访问者在地球哪里，都显示准确的北京时间进度。
*   **LCP 优先加载**
    *   头像资源使用 `fetchpriority="high"` 策略，确保核心视觉元素优先渲染。

### 📱 全端适配与交互细节
*   **QQ 智能分流跳转**
    *   独创的 User-Agent 检测逻辑。
    *   **移动端**：唤起 `mqqapi://` 协议，直接打开 QQ 资料卡。
    *   **PC 端**：唤起 `tencent://` 协议，弹出加好友窗口。
*   **极光深色模式 (Aurora Dark Mode)**
    *   支持系统自动检测，也可通过右上角按钮手动切换。
    *   深色模式下对背景图进行 `brightness` 和 `saturate` 滤镜处理，护眼且保留质感。
*   **容错机制**
    *   **图标三级备份**：国内源 (Iowen) -> DuckDuckGo -> 备用图标。任何一个挂了都能自动降级，绝不裂图。
*   **GPU 硬件加速**
    *   进度条动画使用 `transform: scaleX` 替代 `width`，触发 GPU 合成，动画丝般顺滑。

### 🛡️ 现代化后台管理 (Admin V28)
*   **Dashboard 风格**：全汉化、基于磨砂玻璃拟态（Glassmorphism）设计的管理后台。
*   **完全本地化**：后台 CSS 同样手写内置，不依赖任何第三方 UI 库。
*   **丰富的功能**：
    *   **状态管理**：一键切换“在线、忙碌、摸鱼、离开、隐身”，前台头像光圈同步呼吸变色。
    *   **链接管理**：支持拖拽排序逻辑（数字越小越靠前）、标签分类、自定义图标。
    *   **实时配置**：随时修改网站标题、简介、背景音乐、滚动公告栏。

---

## 🛠️ 技术栈 (Tech Stack)

*   **Runtime**: [Cloudflare Pages Functions](https://developers.cloudflare.com/pages/platform/functions/) (V8 Isolate)
*   **Framework**: [Hono](https://hono.dev) (专为 Edge 设计的超轻量框架)
*   **Database**: [Cloudflare D1](https://developers.cloudflare.com/d1/) (分布式 SQLite)
*   **Storage**: [Cloudflare R2](https://developers.cloudflare.com/r2/) (对象存储，用于头像)
*   **Frontend**: Native HTML5 + Hand-written Optimized CSS + Vanilla JS

*   ---

## 🚀 部署教程 (Deployment)

无需购买服务器，只需一个 Cloudflare 账号即可免费部署。

### 1. 准备工作
*   拥有一个 Cloudflare 账号。
*   Fork 本仓库到你的 GitHub。

### 2. 创建 Cloudflare 资源
登录 Cloudflare Dashboard：

#### A. 创建数据库 (D1)
1.  进入左侧菜单 `Workers & Pages` -> `D1`。
2.  点击 `Create`，命名为 `lx-db` (或任意名字)。
3.  点击进入数据库，选择 **Console** 标签页。
4.  复制本项目 `schema.sql` 文件中的**所有内容**，粘贴到控制台并点击 **Execute**。
    *   *(这一步会创建表结构并写入初始数据)*

#### B. 创建存储桶 (R2)
1.  进入左侧菜单 `R2`。
2.  点击 `Create Bucket`，命名为 `lx-assets`。
3.  进入桶，点击 `Upload`，上传你的头像图片，**务必重命名为 `avatar.png`**。

### 3. 部署 Pages 项目
1.  进入 `Workers & Pages` -> `Overview` -> `Create Application` -> `Pages` -> `Connect to Git`。
2.  选择你的 GitHub 账号和本仓库 `lx_profile`。
3.  **Build settings (构建设置)**:
    *   **Framework preset**: 选择 `None`。
    *   **Build command**: 输入 `npm install`。
    *   **Build output directory**: 留空 (不要填)。
4.  点击 **Save and Deploy**。

### 4. 绑定资源 (关键步骤！)
部署完成后，项目会报错（因为没连数据库），需要手动绑定：

1.  进入项目主页 -> **Settings** -> **Functions**。
2.  找到 **D1 Database Bindings**:
    *   Variable name: `DB` (必须大写，不能改)
    *   Value: 选择你刚才创建的 `lx-db`。
3.  找到 **R2 Bucket Bindings**:
    *   Variable name: `BUCKET` (必须大写，不能改)
    *   Value: 选择你刚才创建的 `lx-assets`。
4.  **设置后台密码**:
    *   进入 **Settings** -> **Environment variables**。
    *   点击 `Add variable`。
    *   Variable name: `ADMIN_PASSWORD`
    *   Value: 输入你想要的后台密码 (如 `admin888`)。
    *   *(如果不设置，默认密码为 `lx123456`)*

### 5. 最后重启
回到 **Deployments** 选项卡，找到最新的部署记录，点击右侧的 `...` -> **Retry deployment**。
等待几秒钟，变成绿色 **Success** 后，点击链接即可访问！

---

## 📂 目录结构

```text
lx_profile/
├── functions/
│   └── [[path]].ts    # 核心逻辑 (单文件全栈，包含前后端所有代码)
├── schema.sql         # 数据库初始化脚本
├── package.json       # 项目依赖配置
└── README.md          # 项目说明书
```

## 📅 版本迭代日志 (Changelog)

### v26.0 - v31.0 (最终完善与颜值巅峰)
*   **UI 重构**: 后台界面彻底重写为“极光深色”Dashboard 风格，移除 Tailwind CDN，全手写 CSS，实现 0 外部依赖。
*   **状态增强**: 后台新增 5 种状态切换（在线、忙碌、摸鱼、离开、隐身），前台头像光圈同步呼吸变色。
*   **细节修复**: 修复 Telegram 图标显示问题，美化 Email 按钮为渐变胶囊样式，修复暗黑模式bug，修复秒级时间和访问者归属地显示bug。
*   **全汉化**: 后台管理界面实现 100% 中文本地化。
*   **功能回归**: 恢复了主页顶部的秒级时钟 (`00:00:00`) 和访客城市定位显示。

### v21.0 - v25.0 (稳健性与代码修复)
*   **变量名修复**: 修复了代码压缩导致的 `runDays is not defined` 和 `music is not defined` 错误，恢复全称变量名。
*   **语法修复**: 解决了因代码过长被截断导致的 `Unexpected end of file` 错误，优化了代码结构。
*   **后台回滚**: 将简陋的纯文本后台恢复为图形化界面，并在此基础上进行了去 CDN 本地化处理。
*   **安全增强**: 后台密码改为优先从环境变量读取，数据库兜底。

### v16.0 - v20.0 (性能革命：中国大陆特供)
*   **SSR 倒计时**: 年份进度由服务端直接计算并直出 HTML，解决国内加载 JS 慢导致进度条为 0% 的问题。
*   **QQ 智能分流**: 独创分流逻辑，手机端唤起 `mqqapi://` (资料卡)，电脑端唤起 `tencent://` (加好友)。
*   **0 依赖重构**: 彻底移除 Tailwind CSS、Google Fonts 和所有外部 JS，所有资源内嵌，实现毫秒级首屏。
*   **时钟优化**: 顶部双时钟改为单时钟（强制显示北京时间），采用 RAF (requestAnimationFrame) 驱动，解决移动端布局拥挤问题。
*   **GPU 加速**: 进度条动画改用 `transform: scaleX`，极大降低 CPU 占用。

### v8.0 - v15.0 (功能增强期)
*   **双时钟尝试**: 曾尝试同时显示北京时间和本地时间（后因移动端适配问题在 V16 优化）。
*   **环境变量**: 引入 `ADMIN_PASSWORD` 环境变量，替代数据库明文存储密码。
*   **错误诊断**: 引入 `app.onError` 全局错误捕获机制，方便调试。
*   **资源预热**: 添加 `dns-prefetch` 和 `preconnect` 提升连接速度。

### v1.0 - v7.0 (初期架构搭建)
*   **架构初始化**: 建立基于 Cloudflare Workers (Hono) + D1 (数据库) + R2 (存储) 的全栈架构。
*   **基础功能**: 实现网站链接的增删改查 (CRUD)、排序、置顶功能。
*   **UI 原型**: 初步实现 Glassmorphism (毛玻璃) 风格和暗黑模式切换。
*   **打字机特效**: 引入个人简介 (Bio) 的打字机动画效果。
