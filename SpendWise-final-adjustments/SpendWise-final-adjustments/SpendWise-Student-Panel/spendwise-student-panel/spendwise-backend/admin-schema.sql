-- SpendWise admin integration migration.
-- Back up the spendwise database before running this script.
-- Safe to run again: it only adds users columns when they are missing.

SET @has_status = (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'status'
);
SET @ddl = IF(@has_status = 0,
  'ALTER TABLE users ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT ''Active''',
  'SELECT ''users.status already exists''');
PREPARE spendwise_stmt FROM @ddl;
EXECUTE spendwise_stmt;
DEALLOCATE PREPARE spendwise_stmt;

SET @has_created_at = (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'created_at'
);
SET @ddl = IF(@has_created_at = 0,
  'ALTER TABLE users ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP',
  'SELECT ''users.created_at already exists''');
PREPARE spendwise_stmt FROM @ddl;
EXECUTE spendwise_stmt;
DEALLOCATE PREPARE spendwise_stmt;

CREATE TABLE IF NOT EXISTS categories (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL UNIQUE,
  icon VARCHAR(16) NOT NULL DEFAULT '📌',
  color CHAR(7) NOT NULL DEFAULT '#087e62',
  status VARCHAR(20) NOT NULL DEFAULT 'Active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT IGNORE INTO categories (name, icon, color, status) VALUES
('Food', '🍴', '#f39b34', 'Active'),
('Transport', '🚌', '#08a6b7', 'Active'),
('Education', '🎓', '#7e61dc', 'Active'),
('Entertainment', '🎮', '#d842ae', 'Active'),
('Shopping', '🛍️', '#f4a22d', 'Active'),
('Health', '♥', '#12b8a4', 'Active'),
('Bills', '▣', '#4db7b1', 'Active'),
('Other', '•••', '#9ba9a2', 'Active');
