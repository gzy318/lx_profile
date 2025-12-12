DROP TABLE IF EXISTS config;
DROP TABLE IF EXISTS links;

CREATE TABLE config (key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE links (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, url TEXT, description TEXT, icon TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);

-- 初始化数据
INSERT INTO config (key, value) VALUES ('bio', '欢迎来到零星主页。在这里记录我的数字足迹。');
INSERT INTO config (key, value) VALUES ('email', 'hi@example.com');
INSERT INTO config (key, value) VALUES ('password', 'lx123456'); -- 初始密码
