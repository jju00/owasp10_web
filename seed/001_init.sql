DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(255) UNIQUE NOT NULL,
  password CHAR(32) NOT NULL,   -- MD5 해시 길이는 32글자 (hex)
  role ENUM('admin','user') NOT NULL
);

-- 비밀번호를 MD5로 해싱해서 저장
INSERT INTO users (username, password, role) VALUES
('admin', MD5('NoBrute123'), 'admin'),
('nagox', MD5('NoGoyang76'), 'user');
