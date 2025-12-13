-- 删除旧表（如果存在），确保结构最新
DROP TABLE IF EXISTS config;
DROP TABLE IF EXISTS links;

-- 1. 配置表：存储网站标题、简介、统计数据等
CREATE TABLE config (
    key TEXT PRIMARY KEY,
    value TEXT
);

-- 2. 链接表：存储你的个人网站导航
CREATE TABLE links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,       -- 标题
    url TEXT NOT NULL,         -- 链接
    description TEXT,          -- 描述
    icon TEXT,                 -- 图标 (URL 或 Emoji)
    sort_order INTEGER DEFAULT 0, -- 排序 (数字越小越靠前)
    tag TEXT DEFAULT '全部',    -- 标签分类
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. 初始化默认数据 (防止空数据报错)
INSERT INTO config (key, value) VALUES ('site_title', 'LX Profile');
INSERT INTO config (key, value) VALUES ('bio', 'Hello, World. 这是一个极速个人主页。');
INSERT INTO config (key, value) VALUES ('email', 'example@gmail.com');
INSERT INTO config (key, value) VALUES ('status', 'online'); -- 状态: online, busy, coding, away, offline
INSERT INTO config (key, value) VALUES ('start_date', '2025-01-01');
INSERT INTO config (key, value) VALUES ('views', '0');
INSERT INTO config (key, value) VALUES ('notice', '欢迎访问我的个人主页！');
-- 以下字段可选，留空即可
INSERT INTO config (key, value) VALUES ('qq', '');
INSERT INTO config (key, value) VALUES ('github', '');
INSERT INTO config (key, value) VALUES ('telegram', '');
INSERT INTO config (key, value) VALUES ('music_url', '');
INSERT INTO config (key, value) VALUES ('bg_url', '');
