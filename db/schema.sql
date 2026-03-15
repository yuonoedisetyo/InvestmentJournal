CREATE TABLE users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(60) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  email VARCHAR(120) UNIQUE,
  phone_number VARCHAR(30) NULL,
  role VARCHAR(30) DEFAULT 'USER',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE portfolios (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(100) NOT NULL,
  currency VARCHAR(10) DEFAULT 'IDR',
  initial_capital DECIMAL(20,4) DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_portfolios_user_active (user_id, is_active),
  CONSTRAINT fk_portfolios_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE stocks (
  stock_code VARCHAR(20) PRIMARY KEY,
  stock_name VARCHAR(150) NOT NULL,
  sector VARCHAR(100) NULL,
  exchange VARCHAR(20) DEFAULT 'IDX',
  currency VARCHAR(10) DEFAULT 'IDR',
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE portfolio_positions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  portfolio_id BIGINT UNSIGNED NOT NULL,
  stock_code VARCHAR(20) NOT NULL,
  total_shares BIGINT UNSIGNED DEFAULT 0,
  average_price DECIMAL(20,8) DEFAULT 0,
  invested_amount DECIMAL(20,4) DEFAULT 0,
  realized_pnl DECIMAL(20,4) DEFAULT 0,
  dividend_income DECIMAL(20,4) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_portfolio_stock (portfolio_id, stock_code),
  KEY idx_portfolio_shares (portfolio_id, total_shares),
  CONSTRAINT fk_positions_portfolio FOREIGN KEY (portfolio_id) REFERENCES portfolios(id)
);

CREATE TABLE stock_transactions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  portfolio_id BIGINT UNSIGNED NOT NULL,
  stock_code VARCHAR(20) NOT NULL,
  type ENUM('BUY', 'SELL') NOT NULL,
  lot INT UNSIGNED NOT NULL,
  price DECIMAL(20,4) NOT NULL,
  fee DECIMAL(20,4) DEFAULT 0,
  gross_amount DECIMAL(20,4) NOT NULL,
  net_amount DECIMAL(20,4) NOT NULL,
  transaction_date DATE NOT NULL,
  notes VARCHAR(500) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_portfolio_stock (portfolio_id, stock_code),
  KEY idx_transaction_date (transaction_date),
  CONSTRAINT fk_stock_transactions_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_stock_transactions_portfolio FOREIGN KEY (portfolio_id) REFERENCES portfolios(id)
);

CREATE TABLE dividends (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  portfolio_id BIGINT UNSIGNED NOT NULL,
  stock_code VARCHAR(20) NOT NULL,
  amount DECIMAL(20,4) NOT NULL,
  ex_date DATE NULL,
  pay_date DATE NOT NULL,
  notes VARCHAR(500) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_dividends_portfolio_pay (portfolio_id, pay_date),
  CONSTRAINT fk_dividends_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_dividends_portfolio FOREIGN KEY (portfolio_id) REFERENCES portfolios(id)
);

CREATE TABLE cash_mutations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  portfolio_id BIGINT UNSIGNED NOT NULL,
  type ENUM('DEPOSIT','WITHDRAW','DIVIDEND','FEE','ADJUSTMENT') NOT NULL,
  amount DECIMAL(20,4) NOT NULL,
  reference_id BIGINT UNSIGNED NULL,
  description VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_cash_portfolio_created (portfolio_id, created_at),
  CONSTRAINT fk_cash_mutations_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_cash_mutations_portfolio FOREIGN KEY (portfolio_id) REFERENCES portfolios(id)
);

CREATE TABLE stock_prices (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  stock_code VARCHAR(20) NOT NULL,
  price DECIMAL(20,4) NOT NULL,
  price_date DATE NOT NULL,
  source VARCHAR(30) DEFAULT 'CUSTOM_API',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_stock_price_day (stock_code, price_date),
  KEY idx_stock_date (stock_code, price_date)
);
