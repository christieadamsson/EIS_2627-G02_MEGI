-- =========================================================
-- WP3 – Dynamic Dispatch Queue & Proximity Allocation: the SQL behind it
-- Run AFTER schema.sql (phpMyAdmin -> cms -> SQL tab). Uses the sample data.
--
-- These are the queries DispatchRepository.php will run with PDO. Here they use
-- @variables so they can be tried by hand; in PHP each @variable becomes a "?"
-- placeholder (prepared statement), e.g.  WHERE o.order_id = ?
-- =========================================================
USE cms;

SET @order_id   = 7;          -- the 70 kg washing machine (sample order)
SET @depot_lat  = 41.178000;  -- FEUP depot: location of couriers without any delivery yet
SET @depot_lon  = -8.598000;


-- ---------------------------------------------------------
-- 1. Expire old offers (run first on every dispatch request – there is no cron on XAMPP/MAMP)
-- ---------------------------------------------------------
UPDATE dispatch_offer
SET status = 'Expired', responded_at = expires_at
WHERE status = 'Offered' AND expires_at < NOW();


-- ---------------------------------------------------------
-- 2. Where is every courier? (= last drop-off, view from schema.sql)
-- ---------------------------------------------------------
SELECT u.name, d.lat, d.lon, d.completed_at
FROM courier_last_dropoff d
JOIN user u ON u.user_id = d.courier_id;


-- ---------------------------------------------------------
-- 3. Free capacity per courier: active vehicle minus what they already carry
--    (orders that are Initiated or In Progress)
-- ---------------------------------------------------------
SELECT u.name, v.license_plate, v.max_weight_kg, v.max_vol_m3,
       COALESCE(SUM(p.weight_kg), 0) AS load_kg,
       COALESCE(SUM(p.volume_m3), 0) AS load_m3,
       v.max_weight_kg - COALESCE(SUM(p.weight_kg), 0) AS free_kg,
       v.max_vol_m3    - COALESCE(SUM(p.volume_m3), 0) AS free_m3
FROM courier c
JOIN user u    ON u.user_id = c.user_id
JOIN vehicle v ON v.vehicle_id = c.active_vehicle_id
LEFT JOIN orders o  ON o.courier_id = c.user_id AND o.status IN ('Initiated', 'In Progress')
LEFT JOIN product p ON p.product_id = o.product_id
GROUP BY c.user_id, u.name, v.license_plate, v.max_weight_kg, v.max_vol_m3;


-- ---------------------------------------------------------
-- 4. THE dispatch query: couriers who may get this order, nearest first
--    - account active, active vehicle approved and documents not expired
--    - enough free weight AND volume for this order on top of their current load
--    - no open offer right now, and not already asked for this order
--    - distance = Haversine formula (km) from last drop-off to the order's pickup
--    LIMIT 1 -> the courier who gets the offer
-- ---------------------------------------------------------
SELECT c.user_id AS courier_id, u.name,
       ROUND(6371 * 2 * ASIN(SQRT(
           POWER(SIN(RADIANS(o.origin_lat - COALESCE(d.lat, @depot_lat)) / 2), 2) +
           COS(RADIANS(COALESCE(d.lat, @depot_lat))) * COS(RADIANS(o.origin_lat)) *
           POWER(SIN(RADIANS(o.origin_lon - COALESCE(d.lon, @depot_lon)) / 2), 2)
       )), 2) AS distance_km
FROM orders o
JOIN product p  ON p.product_id = o.product_id
JOIN courier c
JOIN user u     ON u.user_id = c.user_id AND u.account_status = 'active'
JOIN vehicle v  ON v.vehicle_id = c.active_vehicle_id
               AND v.approval_status = 'Approved'
               AND v.insurance_expiry_date  >= CURDATE()
               AND v.inspection_expiry_date >= CURDATE()
LEFT JOIN courier_last_dropoff d ON d.courier_id = c.user_id
WHERE o.order_id = @order_id
  AND o.status = 'Pending'
  AND o.courier_id IS NULL
  -- capacity: current load + this order must fit (weight AND volume)
  AND (SELECT COALESCE(SUM(p2.weight_kg), 0) FROM orders o2 JOIN product p2 ON p2.product_id = o2.product_id
       WHERE o2.courier_id = c.user_id AND o2.status IN ('Initiated', 'In Progress')) + p.weight_kg <= v.max_weight_kg
  AND (SELECT COALESCE(SUM(p2.volume_m3), 0) FROM orders o2 JOIN product p2 ON p2.product_id = o2.product_id
       WHERE o2.courier_id = c.user_id AND o2.status IN ('Initiated', 'In Progress')) + p.volume_m3 <= v.max_vol_m3
  -- one proposal at a time per courier
  AND NOT EXISTS (SELECT 1 FROM dispatch_offer x WHERE x.courier_id = c.user_id AND x.status = 'Offered')
  -- do not ask the same courier twice for this order
  AND NOT EXISTS (SELECT 1 FROM dispatch_offer x WHERE x.courier_id = c.user_id AND x.order_id = o.order_id)
ORDER BY distance_km
LIMIT 1;


-- ---------------------------------------------------------
-- 5. Send the offer (60-second window starts now, for this courier)
--    In PHP: courier_id and distance come from query 4.
-- ---------------------------------------------------------
-- INSERT INTO dispatch_offer (order_id, courier_id, distance_km, offered_at, expires_at)
-- VALUES (@order_id, <courier_id>, <distance_km>, NOW(), NOW() + INTERVAL 60 SECOND);


-- ---------------------------------------------------------
-- 6. The courier's current proposal (what the courier page shows, with seconds left)
-- ---------------------------------------------------------
-- SELECT f.offer_id, f.order_id, f.distance_km, TIMESTAMPDIFF(SECOND, NOW(), f.expires_at) AS seconds_left
-- FROM dispatch_offer f
-- WHERE f.courier_id = <logged-in courier> AND f.status = 'Offered' AND f.expires_at >= NOW();


-- ---------------------------------------------------------
-- 7. Accept – in ONE transaction (PDO: beginTransaction / commit / rollBack).
--    The order only goes to this courier if it is still free.
-- ---------------------------------------------------------
-- START TRANSACTION;
-- UPDATE dispatch_offer SET status = 'Accepted', responded_at = NOW()
--   WHERE offer_id = <offer_id> AND courier_id = <courier> AND status = 'Offered' AND expires_at >= NOW();
-- UPDATE orders SET courier_id = <courier>, status = 'Initiated', accepted_at = NOW()
--   WHERE order_id = <order_id> AND status = 'Pending' AND courier_id IS NULL;
-- COMMIT;          -- if either UPDATE changed 0 rows: ROLLBACK instead (offer expired / order taken)

-- 8. Decline -> then run query 4 again for the next-nearest courier
-- UPDATE dispatch_offer SET status = 'Declined', responded_at = NOW()
--   WHERE offer_id = <offer_id> AND courier_id = <courier> AND status = 'Offered';


-- ---------------------------------------------------------
-- 9. Shared list for all couriers: who has what
-- ---------------------------------------------------------
SELECT o.order_id, p.description, p.weight_kg, o.status,
       CASE
           WHEN o.courier_id IS NOT NULL THEN CONCAT('Taken by ', cu.name)
           WHEN f.offer_id   IS NOT NULL THEN CONCAT('Offered to ', fu.name, ' (',
                                               TIMESTAMPDIFF(SECOND, NOW(), f.expires_at), ' s left)')
           ELSE 'Waiting'
       END AS dispatch_state
FROM orders o
JOIN product p       ON p.product_id = o.product_id
LEFT JOIN user cu    ON cu.user_id = o.courier_id
LEFT JOIN dispatch_offer f ON f.order_id = o.order_id AND f.status = 'Offered' AND f.expires_at >= NOW()
LEFT JOIN user fu    ON fu.user_id = f.courier_id
WHERE o.status IN ('Pending', 'Initiated', 'In Progress')
ORDER BY o.created_at;
