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
    user_id         INT PRIMARY KEY,
    approved_by     INT NULL,
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

CREATE TABLE route (
    route_id        INT AUTO_INCREMENT PRIMARY KEY,
    courier_id      INT NOT NULL,
    vehicle_id      INT NOT NULL,
    status          VARCHAR(30) NOT NULL DEFAULT 'Planned',
    FOREIGN KEY (courier_id) REFERENCES courier(user_id),
    FOREIGN KEY (vehicle_id) REFERENCES vehicle(vehicle_id)
) ;

CREATE TABLE orders (
    order_id        INT AUTO_INCREMENT PRIMARY KEY,
    client_id       INT NOT NULL,
    product_id      INT NOT NULL,
    route_id        INT NULL,
    origin_lat      DECIMAL(9,6) NOT NULL,
    origin_lon      DECIMAL(9,6) NOT NULL,
    dest_lat        DECIMAL(9,6) NOT NULL,
    dest_lon        DECIMAL(9,6) NOT NULL,
    status          VARCHAR(30) NOT NULL DEFAULT 'Pending',
    attempt         INT NOT NULL DEFAULT 1,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id)  REFERENCES client(user_id),
    FOREIGN KEY (product_id) REFERENCES product(product_id),
    FOREIGN KEY (route_id)   REFERENCES route(route_id) ON DELETE SET NULL
) ;

CREATE TABLE proof_of_delivery (
    pod_id          INT AUTO_INCREMENT PRIMARY KEY,
    order_id        INT NOT NULL UNIQUE,
    pod_type        ENUM('Signature','Photo') NOT NULL,
    file            VARCHAR(255) NULL,
    submitted_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(order_id)
) ;