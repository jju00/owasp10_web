DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,   -- 학습용이라 해시 안 씀 (고의취약)
  role TEXT NOT NULL        -- 'admin' | 'user'
);

INSERT INTO users (username, password, role) VALUES
('admin', 'admin123', 'admin'),
('nagox', 'nagox123', 'user');
