-- Database Schema for Inventory Management System

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'supervisor', 'user')),
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_code VARCHAR(50) UNIQUE NOT NULL,
    product_name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    unit_price DECIMAL(10,2),
    min_stock_level INTEGER DEFAULT 0,
    max_stock_level INTEGER DEFAULT 1000,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Locations table
CREATE TABLE IF NOT EXISTS locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    location_code VARCHAR(20) UNIQUE NOT NULL,
    location_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Stock table - current stock levels
CREATE TABLE IF NOT EXISTS stock (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    location_id INTEGER NOT NULL,
    current_quantity INTEGER NOT NULL DEFAULT 0,
    reserved_quantity INTEGER DEFAULT 0,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (location_id) REFERENCES locations(id),
    UNIQUE(product_id, location_id)
);

-- Transactions table - all inventory movements
CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id VARCHAR(36) UNIQUE NOT NULL,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('inbound', 'outbound', 'move', 'stocktake', 'adjustment')),
    product_id INTEGER NOT NULL,
    from_location_id INTEGER,
    to_location_id INTEGER,
    quantity INTEGER NOT NULL,
    reference_number VARCHAR(50),
    notes TEXT,
    user_id INTEGER NOT NULL,
    transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (from_location_id) REFERENCES locations(id),
    FOREIGN KEY (to_location_id) REFERENCES locations(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    action VARCHAR(50) NOT NULL,
    table_name VARCHAR(50),
    record_id INTEGER,
    old_values TEXT,
    new_values TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Stock take sessions
CREATE TABLE IF NOT EXISTS stocktake_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id VARCHAR(36) UNIQUE NOT NULL,
    location_id INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    started_by INTEGER NOT NULL,
    completed_by INTEGER,
    start_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    end_date DATETIME,
    notes TEXT,
    FOREIGN KEY (location_id) REFERENCES locations(id),
    FOREIGN KEY (started_by) REFERENCES users(id),
    FOREIGN KEY (completed_by) REFERENCES users(id)
);

-- Stock take details
CREATE TABLE IF NOT EXISTS stocktake_details (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id VARCHAR(36) NOT NULL,
    product_id INTEGER NOT NULL,
    expected_quantity INTEGER NOT NULL,
    counted_quantity INTEGER,
    variance INTEGER,
    notes TEXT,
    counted_by INTEGER,
    counted_at DATETIME,
    FOREIGN KEY (session_id) REFERENCES stocktake_sessions(session_id),
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (counted_by) REFERENCES users(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_product ON transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_product_location ON stock(product_id, location_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);

-- Insert default data
INSERT OR IGNORE INTO locations (location_code, location_name, description) VALUES
('WH001', 'Main Warehouse', 'Primary storage facility'),
('WH002', 'Secondary Warehouse', 'Overflow storage'),
('RETAIL', 'Retail Store', 'Customer-facing retail location'),
('SHIPPING', 'Shipping Dock', 'Outbound shipping area'),
('RECEIVING', 'Receiving Dock', 'Inbound receiving area');

-- Insert default admin user will be created by the application

-- Insert sample products
INSERT OR IGNORE INTO products (product_code, product_name, description, category, unit_price, min_stock_level, max_stock_level) VALUES
('PRD001', 'Sample Product 1', 'Description for product 1', 'Electronics', 99.99, 10, 100),
('PRD002', 'Sample Product 2', 'Description for product 2', 'Office Supplies', 29.99, 5, 50),
('PRD003', 'Sample Product 3', 'Description for product 3', 'Tools', 149.99, 3, 30);
