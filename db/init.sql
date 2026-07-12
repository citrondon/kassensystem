CREATE TABLE IF NOT EXISTS categories (
    id    SERIAL PRIMARY KEY,
    name  VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS products (
    id                  SERIAL PRIMARY KEY,
    name                VARCHAR(255) NOT NULL UNIQUE,
    barcode             VARCHAR(50) UNIQUE,
    price               DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    stock               INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    category_id         INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    image_url           VARCHAR(500),
    low_stock_threshold INTEGER NOT NULL DEFAULT 10 CHECK (low_stock_threshold >= 0)
);

CREATE TABLE IF NOT EXISTS orders (
    id              SERIAL PRIMARY KEY,
    order_date      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    total_amount    DECIMAL(10, 2) NOT NULL CHECK (total_amount >= 0),
    discount_amount DECIMAL(10, 2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
    payment_method  VARCHAR(50) NOT NULL DEFAULT 'cash',
    amount_tendered DECIMAL(10, 2) NOT NULL DEFAULT 0 CHECK (amount_tendered >= 0),
    change_amount   DECIMAL(10, 2) NOT NULL DEFAULT 0 CHECK (change_amount >= 0),
    status          VARCHAR(50) NOT NULL DEFAULT 'completed'
);

CREATE TABLE IF NOT EXISTS order_items (
    id          SERIAL PRIMARY KEY,
    order_id    INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id  INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity    INTEGER NOT NULL CHECK (quantity > 0),
    unit_price  DECIMAL(10, 2) NOT NULL
);

INSERT INTO categories (name) VALUES
    ('Obst & Gemuese'),
    ('Getraenke'),
    ('Backwaren'),
    ('Suessigkeiten'),
    ('Grundnahrungsmittel')
ON CONFLICT (name) DO NOTHING;

INSERT INTO products (name, barcode, price, stock, category_id, low_stock_threshold) VALUES
    ('Apfel',       '4000000012345', 0.49, 150, 1, 20),
    ('Banane',      '4000000067890', 0.29, 80,  1, 20),
    ('Milch 1L',    '4000000023456', 1.39, 40,  5, 10),
    ('Brot',        '4000000034567', 3.49, 20,  3, 10),
    ('Wasser 0.5L', '4000000045678', 0.69, 200, 2, 30),
    ('Schokolade',  '4000000056789', 1.49, 60,  4, 15),
    ('Kaffee 200g', '4000000067891', 5.99, 15,  5, 8),
    ('Eier 10er',   '4000000078901', 3.29, 30,  5, 10)
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    username      VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role          VARCHAR(50) NOT NULL DEFAULT 'cashier',
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO users (username, password_hash, role) VALUES
    ('admin', '$2b$10$zDk6cOB3pUV3WhbbRVIPx.qHjJ4Un5qrnxtoDEMvhqkTp3LVpc13S', 'manager'),
    ('kasse', '$2b$10$zDk6cOB3pUV3WhbbRVIPx.qHjJ4Un5qrnxtoDEMvhqkTp3LVpc13S', 'cashier')
ON CONFLICT (username) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_date ON orders(order_date DESC);

CREATE TABLE IF NOT EXISTS pgmigrations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    run_on TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO pgmigrations (name, run_on) VALUES
    ('1783847619918_initial-schema', NOW())
ON CONFLICT (name) DO NOTHING;
