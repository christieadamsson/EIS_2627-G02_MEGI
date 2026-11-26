-- This will build our database.

-- This is for the construction part of our work
-- it enables us to run the file again and again while we develop 
-- This removes all data, so we should probably remove it when we are finished 
DROP DATABASE IF EXISTS cms;
CREATE DATABASE cms CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE cms;

CREATE TABLE user (
    user_id         INT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    username        VARCHAR(20)  NOT NULL UNIQUE,
    email           VARCHAR(150) NOT NULL UNIQUE,
    phone           VARCHAR(15)  NOT NULL,
    nif             CHAR(9)      NOT NULL,
    citizen_card    CHAR(12)     NOT NULL UNIQUE,   -- Cartão de Cidadão, stored without spaces, e.g. 123456789ZZ4
    password_hash   VARCHAR(255) NOT NULL,
    role            ENUM('client','courier','staff','admin') NOT NULL,
    account_status  ENUM('active','pending','disabled') NOT NULL DEFAULT 'pending',
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ;

CREATE TABLE client (
    user_id         INT PRIMARY KEY,
    FOREIGN KEY (user_id) REFERENCES user(user_id) ON DELETE CASCADE
);

CREATE TABLE admin (
    user_id         INT PRIMARY KEY,
    FOREIGN KEY (user_id) REFERENCES user(user_id) ON DELETE CASCADE
) ;

CREATE TABLE staff (
    user_id         INT PRIMARY KEY,
    approved_by     INT NULL,
    FOREIGN KEY (user_id)     REFERENCES user(user_id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES admin(user_id) ON DELETE SET NULL
) ;

CREATE TABLE courier (
    user_id           INT PRIMARY KEY,
    approved_by       INT NULL,
    active_vehicle_id INT NULL,   -- WP2/WP3: the vehicle whose capacity counts (FK added after vehicle exists)
    FOREIGN KEY (user_id)     REFERENCES user(user_id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES staff(user_id) ON DELETE SET NULL
) ;

CREATE TABLE product (
    product_id      INT AUTO_INCREMENT PRIMARY KEY,
    client_id       INT NOT NULL,
    description     VARCHAR(150) NOT NULL,
    category        VARCHAR(30)  NOT NULL,
    weight_kg       DECIMAL(8,2) NOT NULL,
    volume_m3       DECIMAL(8,4) NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES client(user_id) ON DELETE CASCADE
) ;

CREATE TABLE vehicle_type (
    type_id         INT AUTO_INCREMENT PRIMARY KEY,
    type_name       VARCHAR(30) NOT NULL UNIQUE
) ;

CREATE TABLE vehicle (
    vehicle_id      INT AUTO_INCREMENT PRIMARY KEY,
    license_plate   VARCHAR(10) NOT NULL UNIQUE,
    type_id         INT NOT NULL,
    courier_id      INT NOT NULL,
    reviewed_by     INT NULL,
    model           VARCHAR(80) NOT NULL,
    max_weight_kg   DECIMAL(8,2) NOT NULL,
    max_vol_m3      DECIMAL(6,2) NOT NULL,
    insurance_expiry_date   DATE NOT NULL,
    inspection_expiry_date  DATE NOT NULL,
    insurance_expiry_doc    VARCHAR(255) NULL,
    inspection_expiry_doc   VARCHAR(255) NULL,
    approval_status         ENUM('Pending','Approved','Rejected') NOT NULL DEFAULT 'Pending',
    created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (type_id)     REFERENCES vehicle_type(type_id),
    FOREIGN KEY (courier_id)  REFERENCES courier(user_id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES staff(user_id)   ON DELETE SET NULL
);

-- courier and vehicle point to each other, so this link is added once both tables exist
ALTER TABLE courier
    ADD FOREIGN KEY (active_vehicle_id) REFERENCES vehicle(vehicle_id) ON DELETE SET NULL;

CREATE TABLE route (
    route_id        INT AUTO_INCREMENT PRIMARY KEY,
    courier_id      INT NOT NULL,
    vehicle_id      INT NOT NULL,
    status          VARCHAR(30) NOT NULL DEFAULT 'Planned',
    FOREIGN KEY (courier_id) REFERENCES courier(user_id),
    FOREIGN KEY (vehicle_id) REFERENCES vehicle(vehicle_id)
) ;

-- Order status flow (agreed for WP1/WP3):
--   Awaiting Payment -> Pending (paid, in the dispatch queue) -> Initiated (courier accepted)
--   -> In Progress (picked up) -> Completed
--   WP4: Initiated / In Progress -> RTO Hold -> In Progress (client paid) or Returned
CREATE TABLE orders (
    order_id        INT AUTO_INCREMENT PRIMARY KEY,
    client_id       INT NOT NULL,
    product_id      INT NOT NULL,
    route_id        INT NULL,
    courier_id      INT NULL,                -- WP3: courier who accepted the order
    origin_lat      DECIMAL(9,6) NOT NULL,
    origin_lon      DECIMAL(9,6) NOT NULL,
    dest_lat        DECIMAL(9,6) NOT NULL,
    dest_lon        DECIMAL(9,6) NOT NULL,
    status          VARCHAR(30) NOT NULL DEFAULT 'Awaiting Payment',   -- WP3: only paid ('Pending') orders are dispatched
    attempt         INT NOT NULL DEFAULT 1,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    accepted_at     DATETIME NULL,           -- WP3: courier accepted the offer
    picked_up_at    DATETIME NULL,
    completed_at    DATETIME NULL,           -- WP3: last drop-off = courier's location
    FOREIGN KEY (client_id)  REFERENCES client(user_id),
    FOREIGN KEY (product_id) REFERENCES product(product_id),
    FOREIGN KEY (route_id)   REFERENCES route(route_id) ON DELETE SET NULL,
    FOREIGN KEY (courier_id) REFERENCES courier(user_id) ON DELETE SET NULL,
    INDEX idx_orders_status (status),
    INDEX idx_orders_courier (courier_id, status, completed_at),
    CHECK (status IN ('Awaiting Payment','Pending','Initiated','In Progress',
                      'RTO Hold','Completed','Returned','Cancelled'))
) ;

-- WP3: one row per proposal sent to a courier. Each courier gets their own 60-second window
-- (expires_at = offered_at + 60 s). Declined / expired -> the next-nearest courier with capacity.
CREATE TABLE dispatch_offer (
    offer_id        INT AUTO_INCREMENT PRIMARY KEY,
    order_id        INT NOT NULL,
    courier_id      INT NOT NULL,
    distance_km     DECIMAL(8,2) NULL,       -- distance from the courier's last drop-off to the pickup
    offered_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at      DATETIME NOT NULL,
    responded_at    DATETIME NULL,
    status          ENUM('Offered','Accepted','Declined','Expired') NOT NULL DEFAULT 'Offered',
    FOREIGN KEY (order_id)   REFERENCES orders(order_id) ON DELETE CASCADE,
    FOREIGN KEY (courier_id) REFERENCES courier(user_id) ON DELETE CASCADE,
    INDEX idx_offer_order (order_id, status),
    INDEX idx_offer_courier (courier_id, status),
    CHECK (expires_at > offered_at)
) ;

CREATE TABLE proof_of_delivery (
    pod_id          INT AUTO_INCREMENT PRIMARY KEY,
    order_id        INT NOT NULL UNIQUE,
    pod_type        ENUM('Signature','Photo') NOT NULL,
    file            VARCHAR(255) NULL,
    submitted_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(order_id)
) ;

-- WP3: every courier's current location = the destination of their last completed delivery
CREATE VIEW courier_last_dropoff AS
SELECT o.courier_id, o.dest_lat AS lat, o.dest_lon AS lon, o.completed_at
FROM orders o
WHERE o.status = 'Completed'
  AND o.completed_at = (SELECT MAX(o2.completed_at)
                        FROM orders o2
                        WHERE o2.courier_id = o.courier_id AND o2.status = 'Completed');


-- =========================================================
-- SAMPLE DATA (same demo accounts as the frontend prototype)
-- Passwords are hashed with PHP password_hash():
--   client123, courier123, coraline123, confucius123, cleopatra123, staff123, admin123
-- =========================================================

INSERT INTO vehicle_type (type_id, type_name) VALUES
    (1, 'Bike'), (2, 'Moto'), (3, 'Van'), (4, 'Truck');

INSERT INTO user (user_id, name, username, email, phone, nif, citizen_card, password_hash, role, account_status) VALUES
 (1, 'Carla Cliente',       'client',    'client@pdp.pt',    '912000001', '500000001', '100000011ZZ1', '$2y$10$vlgzlKA3YoigqCnWNy65yebJl2bwduMEwDBDRnF1dcPt8JW5FSD/C', 'client',  'active'),
 (2, 'Constantino Courier', 'courier',   'courier@pdp.pt',   '912000002', '500000002', '100000022ZZ2', '$2y$10$vUGVS9.LkpRgULfrtvt7DO0xDFLmwGqxbRnNnrV7G6r8D8v8DSXeK', 'courier', 'active'),
 (3, 'Sofia Staff',         'staff',     'staff@pdp.pt',     '912000003', '500000003', '100000033ZZ3', '$2y$10$lqCFIEk7pRp.4YokSTOq9OXIZYk0f4oORiPIvKxdzpnDqwap1y2tO', 'staff',   'active'),
 (4, 'António Admin',       'admin',     'admin@pdp.pt',     '912000004', '500000004', '100000044ZZ4', '$2y$10$8.J2Kfw5SYO4iGskq5oxUexhN5LS3uGSw/Hwv9Rl3uD4CXAsZoGjO', 'admin',   'active'),
 (5, 'Coraline Cargo',      'coraline',  'coraline@pdp.pt',  '912000008', '500000008', '100000088ZZ8', '$2y$10$gMSaz33YUdeuJMYSwAu60O2vUqsfslD9sWvtN.mvwZcr61HH/i1q2', 'courier', 'active'),
 (6, 'Confucius Courier',   'confucius', 'confucius@pdp.pt', '912000009', '500000009', '100000099ZZ9', '$2y$10$8gxfwVXseCRIR8/KhN0u/u1fFGRW4Qfj5ChasMh.wRk7a3L4WmdjS', 'courier', 'active'),
 (7, 'Cleopatra Carrier',   'cleopatra', 'cleopatra@pdp.pt', '912000011', '500000011', '100000112ZZ2', '$2y$10$2K365GbY.eZlA5QTV9OYGeYRQKp99psDA9IR/LNsbU9ZE2sIxrxie', 'courier', 'active');

INSERT INTO client (user_id) VALUES (1);
INSERT INTO admin  (user_id) VALUES (4);
INSERT INTO staff  (user_id, approved_by) VALUES (3, 4);
INSERT INTO courier (user_id, approved_by) VALUES (2, 3), (5, 3), (6, 3), (7, 3);

-- Capacity per vehicle (same values as the frontend prototype)
INSERT INTO vehicle (vehicle_id, license_plate, type_id, courier_id, reviewed_by, model, max_weight_kg, max_vol_m3,
                     insurance_expiry_date, inspection_expiry_date, approval_status) VALUES
 (1, 'AA-12-BC', 3, 2, 3,    'Renault Kangoo',    650.00,  3.30, CURDATE() + INTERVAL 200 DAY, CURDATE() + INTERVAL 120 DAY, 'Approved'),
 (2, '45-XY-90', 2, 2, 3,    'Honda PCX 125',      25.00,  0.10, CURDATE() + INTERVAL 12 DAY,  CURDATE() + INTERVAL 90 DAY,  'Approved'),
 (3, 'BK-0007',  1, 2, NULL, 'Cargo bike',         40.00,  0.20, CURDATE() + INTERVAL 300 DAY, CURDATE() + INTERVAL 300 DAY, 'Pending'),
 (4, 'CR-01-AL', 3, 5, 3,    'Citroën Berlingo',  650.00,  3.30, CURDATE() + INTERVAL 180 DAY, CURDATE() + INTERVAL 150 DAY, 'Approved'),
 (5, 'CF-88-WU', 2, 6, 3,    'Yamaha NMAX 125',    25.00,  0.10, CURDATE() + INTERVAL 240 DAY, CURDATE() + INTERVAL 200 DAY, 'Approved'),
 (6, 'CL-30-PA', 4, 7, 3,    'Mercedes Sprinter', 3500.00, 20.00, CURDATE() + INTERVAL 90 DAY,  CURDATE() + INTERVAL 60 DAY,  'Approved');

UPDATE courier SET active_vehicle_id = 1 WHERE user_id = 2;   -- Constantino: van
UPDATE courier SET active_vehicle_id = 4 WHERE user_id = 5;   -- Coraline: van
UPDATE courier SET active_vehicle_id = 5 WHERE user_id = 6;   -- Confucius: moto (small!)
UPDATE courier SET active_vehicle_id = 6 WHERE user_id = 7;   -- Cleopatra: truck

INSERT INTO product (product_id, client_id, description, category, weight_kg, volume_m3) VALUES
 (1, 1, 'Books',            'Other',       5.00, 0.0200),
 (2, 1, 'Board games',      'Other',       3.00, 0.0150),
 (3, 1, 'Tea set',          'Fragile',     2.00, 0.0100),
 (4, 1, 'Garden chairs',    'Other',      18.00, 0.4000),
 (5, 1, 'Shoe box',         'Clothing',    2.50, 0.0120),
 (6, 1, 'Office supplies',  'Documents',   6.00, 0.0300),
 (7, 1, 'Washing machine',  'Other',      70.00, 0.3500),
 (8, 1, 'Laptop',           'Electronics', 3.00, 0.0150);

-- All orders start at the FEUP depot (41.1780, -8.5980)
INSERT INTO orders (order_id, client_id, product_id, courier_id, origin_lat, origin_lon, dest_lat, dest_lon,
                    status, created_at, accepted_at, picked_up_at, completed_at) VALUES
 -- Completed deliveries = each courier's last drop-off (their location for WP3)
 (1, 1, 1, 2, 41.178000, -8.598000, 41.147500, -8.611000, 'Completed',          -- Constantino: Aliados
     NOW() - INTERVAL 3 DAY, NOW() - INTERVAL 3 DAY, NOW() - INTERVAL 2 DAY, NOW() - INTERVAL 2 DAY),
 (2, 1, 2, 5, 41.178000, -8.598000, 41.184400, -8.696300, 'Completed',          -- Coraline: Matosinhos
     NOW() - INTERVAL 2 DAY, NOW() - INTERVAL 2 DAY, NOW() - INTERVAL 2 DAY, NOW() - INTERVAL 47 HOUR),
 (3, 1, 3, 6, 41.178000, -8.598000, 41.137000, -8.612000, 'Completed',          -- Confucius: Gaia
     NOW() - INTERVAL 1 DAY, NOW() - INTERVAL 1 DAY, NOW() - INTERVAL 1 DAY, NOW() - INTERVAL 20 HOUR),
 (4, 1, 4, 7, 41.178000, -8.598000, 41.153000, -8.676000, 'Completed',          -- Cleopatra: Foz
     NOW() - INTERVAL 3 DAY, NOW() - INTERVAL 3 DAY, NOW() - INTERVAL 3 DAY, NOW() - INTERVAL 70 HOUR),
 -- Constantino is on the road with one order: this already uses part of his van's capacity
 (5, 1, 5, 2, 41.178000, -8.598000, 41.148900, -8.606200, 'In Progress',
     NOW() - INTERVAL 2 HOUR, NOW() - INTERVAL 90 MINUTE, NOW() - INTERVAL 1 HOUR, NULL),
 -- Paid and waiting in the dispatch queue: small parcel, every courier fits it
 (6, 1, 6, NULL, 41.178000, -8.598000, 41.165500, -8.598500, 'Pending',
     NOW() - INTERVAL 10 MINUTE, NULL, NULL, NULL),
 -- Paid and waiting: 70 kg is too heavy for Confucius's moto (25 kg) -> he must be skipped
 (7, 1, 7, NULL, 41.178000, -8.598000, 41.158000, -8.640000, 'Pending',
     NOW() - INTERVAL 5 MINUTE, NULL, NULL, NULL),
 -- Not paid yet: must NOT be dispatched (WP1)
 (8, 1, 8, NULL, 41.178000, -8.598000, 41.152000, -8.619000, 'Awaiting Payment',
     NOW(), NULL, NULL, NULL);

INSERT INTO proof_of_delivery (order_id, pod_type, file) VALUES
 (1, 'Signature', NULL),
 (2, 'Signature', NULL),
 (3, 'Photo', 'pod_3.jpg'),
 (4, 'Photo', 'pod_4.jpg');

