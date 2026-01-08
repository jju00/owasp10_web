DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(255) UNIQUE NOT NULL,
  password CHAR(64) NOT NULL,   -- MD5 해시 길이는 32글자 (hex)
  role ENUM('admin','user') NOT NULL
);

-- 비밀번호를 MD5로 해싱해서 저장
INSERT INTO users (username, password, role) VALUES
  ('cookbob',   SHA1('NoBrute123'), 'admin'),
  ('nagox',   MD5('ashley76'), 'user'),
  ('alice',   MD5('alice123'),   'user'),
  ('bob',     MD5('bob123'),     'user'),
  ('charlie', MD5('charlie123'), 'user'),
  ('diana',   MD5('diana123'),   'user'),
  ('richard', MD5('richard123'), 'user');