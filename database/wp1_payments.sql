-- =========================================================
-- WP1 - Virtual payments (MockGateway)
-- Run AFTER schema.sql (schema.sql recreates the cms database).
--
-- Order status flow (team agreement):
--   'Awaiting Payment' -> (paid) -> 'Pending' -> 'Initiated' -> 'In Progress' -> 'Completed'
-- Couriers / dispatch (WP3) only ever look at 'Pending' or later, so unpaid orders stay invisible.
-- =========================================================
USE cms;

-- Price of the order in EUROS (e.g. 9.70). Calculated by the server when the order is created.
-- The gateway is sent cents: (int) round(price * 100).
-- TODO(team): move this column into the orders table in schema.sql and delete this ALTER.
ALTER TABLE orders ADD COLUMN price DECIMAL(10,2) NULL AFTER dest_lon;

-- One row per payment attempt. An order can have several (a failed try, then a successful one).
-- 'rto_adjustment' = extra fee paid by the client after re-weighting (WP4).
CREATE TABLE payment (
    payment_id          INT AUTO_INCREMENT PRIMARY KEY,
    order_id            INT NOT NULL,
    amount              DECIMAL(10,2) NOT NULL,                 -- euros, copied from the DB, never from the browser
    type                ENUM('order','rto_adjustment') NOT NULL DEFAULT 'order',
    gateway_reference   VARCHAR(64) NOT NULL UNIQUE,            -- MockGateway payment intent id (pi_...)
    status              ENUM('pending','paid','failed') NOT NULL DEFAULT 'pending',
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    paid_at             DATETIME NULL,
    FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
    INDEX idx_payment_order (order_id, status),
    CHECK (amount > 0)
) ENGINE=InnoDB;


-- =========================================================
-- SAMPLE DATA
-- =========================================================

-- Prices for the demo orders from schema.sql
UPDATE orders SET price = CASE order_id
    WHEN 1 THEN 4.86  WHEN 2 THEN 8.64  WHEN 3 THEN 5.20  WHEN 4 THEN 9.83
    WHEN 5 THEN 4.29  WHEN 6 THEN 4.15  WHEN 7 THEN 30.57 WHEN 8 THEN 6.30
END
WHERE order_id BETWEEN 1 AND 8;

-- Every order a courier can see (1-7) has a successful payment.
-- Order 8 (client 1, 'Awaiting Payment') has no payment: use it to test the payment flow.
INSERT INTO payment (order_id, amount, type, gateway_reference, status, created_at, paid_at)
SELECT order_id, price, 'order', CONCAT('pi_seed_', order_id), 'paid', created_at, created_at
FROM orders
WHERE status <> 'Awaiting Payment';
