-- ============================================================
-- HOTEL MANAGEMENT SYSTEM – DATABASE SCHEMA & SEED DATA
-- ============================================================

CREATE DATABASE IF NOT EXISTS hotel_management_db;
USE hotel_management_db;

-- ── 1. Roles ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE COMMENT 'admin, manager, receptionist, customer, housekeeping',
  description VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 2. Users ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role_id INT NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(20) DEFAULT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  avatar_url VARCHAR(255) DEFAULT NULL,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  last_login DATETIME DEFAULT NULL,
  password_reset_token VARCHAR(255) DEFAULT NULL COMMENT 'SHA-256 hash',
  password_reset_expires DATETIME DEFAULT NULL,
  email_verify_token VARCHAR(255) DEFAULT NULL COMMENT 'SHA-256 hash',
  email_verify_expires DATETIME DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create indexes for auth lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_reset_token ON users(password_reset_token);
CREATE INDEX idx_users_verify_token ON users(email_verify_token);

-- ── 3. Customers ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  date_of_birth DATE DEFAULT NULL,
  nationality VARCHAR(100) DEFAULT NULL,
  id_type VARCHAR(50) DEFAULT NULL COMMENT 'Passport, Aadhar, Driving License, National ID',
  id_number VARCHAR(100) DEFAULT NULL,
  address VARCHAR(255) DEFAULT NULL,
  city VARCHAR(100) DEFAULT NULL,
  country VARCHAR(100) DEFAULT NULL,
  preferred_room_type VARCHAR(100) DEFAULT NULL,
  special_requests TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 4. Hotels ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hotels (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  address VARCHAR(255) NOT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  country VARCHAR(100) NOT NULL,
  phone VARCHAR(20) DEFAULT NULL,
  email VARCHAR(150) DEFAULT NULL,
  description TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 5. Hotel Staff ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hotel_staff (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  hotel_id INT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE,
  UNIQUE KEY uq_staff_hotel (user_id, hotel_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 6. Room Categories ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS room_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  hotel_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT DEFAULT NULL,
  max_occupancy INT NOT NULL DEFAULT 2,
  base_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 7. Rooms ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rooms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  hotel_id INT NOT NULL,
  category_id INT NOT NULL,
  room_number VARCHAR(20) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'available' COMMENT 'available, occupied, maintenance, dirty',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES room_categories(id) ON DELETE RESTRICT,
  UNIQUE KEY uq_hotel_room (hotel_id, room_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 8. Bookings ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  hotel_id INT NOT NULL,
  room_id INT DEFAULT NULL,
  booking_ref VARCHAR(20) NOT NULL UNIQUE,
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' COMMENT 'pending, confirmed, checked_in, checked_out, cancelled',
  total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  guest_count INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
  FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE RESTRICT,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 9. Payments ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL DEFAULT 'Cash' COMMENT 'Cash, Card, UPI, NetBanking',
  status VARCHAR(50) NOT NULL DEFAULT 'pending' COMMENT 'pending, completed, failed, refunded',
  transaction_ref VARCHAR(100) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 10. Complaints ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS complaints (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  hotel_id INT NOT NULL,
  complaint_ref VARCHAR(20) NOT NULL UNIQUE,
  subject VARCHAR(150) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'open' COMMENT 'open, assigned, in_progress, resolved, closed',
  assigned_to INT DEFAULT NULL COMMENT 'user_id of staff',
  resolution TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
  FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 11. Reviews ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  hotel_id INT NOT NULL,
  booking_id INT NOT NULL UNIQUE,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 12. Notifications ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(150) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 13. Activity Logs ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT DEFAULT NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id INT DEFAULT NULL,
  ip_address VARCHAR(45) DEFAULT NULL,
  user_agent VARCHAR(500) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- SEED DATA
-- ============================================================

-- Seed Roles
INSERT INTO roles (id, name, description) VALUES
(1, 'admin', 'System Administrator with full system control'),
(2, 'manager', 'Hotel Manager overseeing operations, analytics, complaints'),
(3, 'receptionist', 'Front Desk staff handling check-ins, payments, room reservations'),
(4, 'customer', 'Registered hotel guest'),
(5, 'housekeeping', 'Cleaning staff assigned room maintenance');

-- Seed Users (Passwords are bcrypted hashes of 'password123')
-- Hash: $2a$12$CYzizWHmk6KHJ6BwEB.46eL5z1KzYfIS9luuyw2ffL.FO8p/aIXFG (Dev password123 hash)
INSERT INTO users (id, role_id, first_name, last_name, email, password_hash, phone, is_active, email_verified) VALUES
(1, 1, 'System', 'Admin', 'admin@hotelms.com', '$2a$12$CYzizWHmk6KHJ6BwEB.46eL5z1KzYfIS9luuyw2ffL.FO8p/aIXFG', '9876543210', TRUE, TRUE),
(2, 2, 'Jane', 'Manager', 'manager@hotelms.com', '$2a$12$CYzizWHmk6KHJ6BwEB.46eL5z1KzYfIS9luuyw2ffL.FO8p/aIXFG', '9876543211', TRUE, TRUE),
(3, 3, 'Robert', 'Receptionist', 'reception@hotelms.com', '$2a$12$CYzizWHmk6KHJ6BwEB.46eL5z1KzYfIS9luuyw2ffL.FO8p/aIXFG', '9876543212', TRUE, TRUE),
(4, 4, 'John', 'Customer', 'guest@example.com', '$2a$12$CYzizWHmk6KHJ6BwEB.46eL5z1KzYfIS9luuyw2ffL.FO8p/aIXFG', '9876543213', TRUE, TRUE),
(5, 5, 'Mary', 'Housekeeper', 'housekeeping@hotelms.com', '$2a$12$CYzizWHmk6KHJ6BwEB.46eL5z1KzYfIS9luuyw2ffL.FO8p/aIXFG', '9876543214', TRUE, TRUE);

-- Seed Customers
INSERT INTO customers (id, user_id, date_of_birth, nationality, id_type, id_number, address, city, country, preferred_room_type, special_requests) VALUES
(1, 4, '1990-05-15', 'Indian', 'Aadhar', '1234-5678-9012', '123 Park Avenue', 'Mumbai', 'India', 'Deluxe', 'Non-smoking, high floor');

-- Seed Hotels
INSERT INTO hotels (id, name, address, city, state, country, phone, email, description) VALUES
(1, 'Grand Palace Resort', '1 Beach Road, Colaba', 'Mumbai', 'Maharashtra', 'India', '+91 22 2200 1122', 'grandpalace@hotelms.com', 'A luxurious 5-star ocean-facing heritage hotel in South Mumbai.'),
(2, 'Leela Palace Chennai', 'Adyar Sea Face', 'Chennai', 'Tamil Nadu', 'India', '+91 44 3366 1234', 'leelapalace@hotelms.com', 'A sea-facing luxury palace hotel in Chennai.'),
(3, 'Beverly Hills Suites', '90210 Wilshire Blvd', 'Los Angeles', 'California', 'USA', '+1 310 555 0100', 'beverlyhills@hotelms.com', 'Ultra-luxury suite hotel in Beverly Hills.'),
(4, 'Manhattan Grand Hotel', '100 Broadway Ave', 'New York City', 'New York', 'USA', '+1 212 555 0199', 'manhattan@hotelms.com', 'Premier business and luxury hotel in Manhattan.'),
(5, 'Silicon Valley Inn', '100 Outer Ring Road', 'Bangalore', 'Karnataka', 'India', '+91 80 4400 9988', 'siliconvalley@hotelms.com', 'Modern business hotel in Bangalore tech hub.'),
(6, 'Sunset Boulevard Lodge', '8200 Sunset Blvd', 'Los Angeles', 'California', 'USA', '+1 323 555 0244', 'sunsetlodge@hotelms.com', 'Classic Hollywood lodge on Sunset Boulevard.'),
(7, 'Golden Gate Inn', '200 Lombard St', 'San Francisco', 'California', 'USA', '+1 415 555 0188', 'goldengate@hotelms.com', 'Cozy boutique hotel near the Lombard crooked street.'),
(8, 'Times Square Plaza', '1500 Broadway', 'New York City', 'New York', 'USA', '+1 212 555 0288', 'timessquare@hotelms.com', 'Vibrant hotel in the heart of Times Square.'),
(9, 'Ocean Drive Resort', '720 Ocean Drive', 'Miami', 'Florida', 'USA', '+1 305 555 0133', 'oceandrive@hotelms.com', 'Trendy art deco resort on South Beach.'),
(10, 'Westminster Grand', '10 Parliament St', 'London', 'England', 'UK', '+44 20 7946 0192', 'westminster@hotelms.com', 'Stately historic hotel near Westminster Abbey.'),
(11, 'CN Tower View Hotel', '300 Front St W', 'Toronto', 'Ontario', 'Canada', '+1 416 555 0147', 'cntowerview@hotelms.com', 'Sleek modern high-rise with CN Tower views.'),
(12, 'Sydney Opera View', '2 Macquarie St', 'Sydney', 'New South Wales', 'Australia', '+61 2 9251 1111', 'operaview@hotelms.com', 'Breathtaking hotel overlooking Sydney Harbour and Opera House.'),
(13, 'Shibuya Sky Hotel', '2-24 Shibuya', 'Tokyo', 'Tokyo', 'Japan', '+81 3 5555 0166', 'shibuyasky@hotelms.com', 'High-tech hotel right next to Shibuya Crossing.'),
(14, 'Shinjuku Central Suite', '1-3 Nishishinjuku', 'Tokyo', 'Tokyo', 'Japan', '+81 3 5555 0199', 'shinjukucentral@hotelms.com', 'Luxury skyscraper suites in the business district.'),
(15, 'Edinburgh Castle Lodge', '352 Castlehill', 'Edinburgh', 'Scotland', 'UK', '+44 131 496 0122', 'castlelodge@hotelms.com', 'Heritage hotel situated on the Royal Mile.');

-- Seed Hotel Staff assignments
INSERT INTO hotel_staff (user_id, hotel_id, is_primary) VALUES
(2, 1, TRUE),  -- Jane Manager at Grand Palace Resort
(3, 1, TRUE),  -- Robert Receptionist at Grand Palace Resort
(5, 1, TRUE);  -- Mary Housekeeper at Grand Palace Resort

-- Seed Room Categories
INSERT INTO room_categories (id, hotel_id, name, description, max_occupancy, base_price) VALUES
(1, 1, 'Standard Room', 'Cozy rooms with modern amenities, king-size bed, and city view.', 2, 2500.00),
(2, 1, 'Deluxe Room', 'Spacious rooms with private balcony, ocean view, and luxury bathtub.', 2, 4500.00),
(3, 1, 'Executive Suite', 'Premium suite with separate living room, workspace, and complimentary lounge access.', 4, 9500.00),
(4, 2, 'Standard Room', 'Comfortable rooms with city views.', 2, 2200.00),
(5, 2, 'Deluxe Room', 'Spacious rooms with ocean view.', 2, 4200.00),
(6, 2, 'Executive Suite', 'Premium suite with ocean views.', 4, 8500.00),
(7, 3, 'Standard Room', 'Modern standard rooms.', 2, 150.00),
(8, 3, 'Deluxe Room', 'Luxury rooms with Beverly Hills views.', 2, 250.00),
(9, 3, 'Executive Suite', 'Grand suite with private spa access.', 4, 550.00),
(10, 4, 'Standard Room', 'Comfortable business rooms.', 2, 180.00),
(11, 4, 'Deluxe Room', 'Luxury rooms with skyline view.', 2, 280.00),
(12, 4, 'Executive Suite', 'Spacious luxury penthouse suite.', 4, 600.00),
-- Hotel 5: Bangalore
(13, 5, 'Standard Room', 'Cozy business standard room.', 2, 2000.00),
(14, 5, 'Deluxe Room', 'Spacious deluxe room with high-speed wifi.', 2, 3500.00),
-- Hotel 6: LA Sunset
(15, 6, 'Standard Room', 'Comfortable standard room near sunset strip.', 2, 130.00),
(16, 6, 'Deluxe Room', 'Chic deluxe room with balcony views.', 2, 210.00),
-- Hotel 7: SF Golden Gate
(17, 7, 'Standard Room', 'Warm classic room with bay window.', 2, 140.00),
(18, 7, 'Deluxe Room', 'Deluxe room with historic details.', 2, 230.00),
-- Hotel 8: NYC Times Square
(19, 8, 'Standard Room', 'Compact city standard room.', 2, 170.00),
(20, 8, 'Deluxe Room', 'Spacious deluxe room overlooking Broadway.', 2, 270.00),
-- Hotel 9: Miami Ocean
(21, 9, 'Standard Room', 'Bright standard room close to beach.', 2, 160.00),
(22, 9, 'Deluxe Room', 'Spectacular oceanfront deluxe room.', 2, 260.00),
-- Hotel 10: London Westminster
(23, 10, 'Standard Room', 'Sophisticated heritage room.', 2, 120.00),
(24, 10, 'Deluxe Room', 'Elegant deluxe room with courtyard view.', 2, 220.00),
-- Hotel 11: Toronto CN Tower
(25, 11, 'Standard Room', 'Modern urban standard room.', 2, 130.00),
(26, 11, 'Deluxe Room', 'Deluxe room with spectacular skyline views.', 2, 220.00),
-- Hotel 12: Sydney Opera View
(27, 12, 'Standard Room', 'Chic room with partial harbour view.', 2, 180.00),
(28, 12, 'Deluxe Room', 'Premium room with full Opera House panorama.', 2, 320.00),
-- Hotel 13: Tokyo Shibuya
(29, 13, 'Standard Room', 'Compact high-tech micro room.', 2, 110.00),
(30, 13, 'Deluxe Room', 'Spacious deluxe room with Tokyo view.', 2, 190.00),
-- Hotel 14: Tokyo Shinjuku
(31, 14, 'Standard Room', 'Modern executive room.', 2, 140.00),
(32, 14, 'Deluxe Room', 'Luxury suite with floor-to-ceiling windows.', 4, 300.00),
-- Hotel 15: Edinburgh Castle
(33, 15, 'Standard Room', 'Quaint classic heritage room.', 2, 110.00),
(34, 15, 'Deluxe Room', 'Deluxe room looking onto Edinburgh Castle.', 2, 190.00);

-- Seed Rooms
INSERT INTO rooms (id, hotel_id, category_id, room_number, status) VALUES
(1, 1, 1, '101', 'available'),
(2, 1, 1, '102', 'available'),
(3, 1, 2, '201', 'available'),
(4, 1, 2, '202', 'available'),
(5, 1, 3, '301', 'available'),
(6, 2, 4, '101', 'available'),
(7, 2, 4, '102', 'available'),
(8, 2, 5, '201', 'available'),
(9, 2, 5, '202', 'available'),
(10, 2, 6, '301', 'available'),
(11, 3, 7, '101', 'available'),
(12, 3, 7, '102', 'available'),
(13, 3, 8, '201', 'available'),
(14, 3, 8, '202', 'available'),
(15, 3, 9, '301', 'available'),
(16, 4, 10, '101', 'available'),
(17, 4, 10, '102', 'available'),
(18, 4, 11, '201', 'available'),
(19, 4, 11, '202', 'available'),
(20, 4, 12, '301', 'available'),
-- Hotel 5
(21, 5, 13, '101', 'available'),
(22, 5, 13, '102', 'available'),
(23, 5, 14, '201', 'available'),
(24, 5, 14, '202', 'available'),
-- Hotel 6
(25, 6, 15, '101', 'available'),
(26, 6, 15, '102', 'available'),
(27, 6, 16, '201', 'available'),
(28, 6, 16, '202', 'available'),
-- Hotel 7
(29, 7, 17, '101', 'available'),
(30, 7, 17, '102', 'available'),
(31, 7, 18, '201', 'available'),
(32, 7, 18, '202', 'available'),
-- Hotel 8
(33, 8, 19, '101', 'available'),
(34, 8, 19, '102', 'available'),
(35, 8, 20, '201', 'available'),
(36, 8, 20, '202', 'available'),
-- Hotel 9
(37, 9, 21, '101', 'available'),
(38, 9, 21, '102', 'available'),
(39, 9, 22, '201', 'available'),
(40, 9, 22, '202', 'available'),
-- Hotel 10
(41, 10, 23, '101', 'available'),
(42, 10, 23, '102', 'available'),
(43, 10, 24, '201', 'available'),
(44, 10, 24, '202', 'available'),
-- Hotel 11
(45, 11, 25, '101', 'available'),
(46, 11, 25, '102', 'available'),
(47, 11, 26, '201', 'available'),
(48, 11, 26, '202', 'available'),
-- Hotel 12
(49, 12, 27, '101', 'available'),
(50, 12, 27, '102', 'available'),
(51, 12, 28, '201', 'available'),
(52, 12, 28, '202', 'available'),
-- Hotel 13
(53, 13, 29, '101', 'available'),
(54, 13, 29, '102', 'available'),
(55, 13, 30, '201', 'available'),
(56, 13, 30, '202', 'available'),
-- Hotel 14
(57, 14, 31, '101', 'available'),
(58, 14, 31, '102', 'available'),
(59, 14, 32, '201', 'available'),
(60, 14, 32, '202', 'available'),
-- Hotel 15
(61, 15, 33, '101', 'available'),
(62, 15, 33, '102', 'available'),
(63, 15, 34, '201', 'available'),
(64, 15, 34, '202', 'available');

-- Seed Bookings
INSERT INTO bookings (id, customer_id, hotel_id, room_id, booking_ref, check_in_date, check_out_date, status, total_amount, guest_count) VALUES
(1, 1, 1, 3, 'BK-100203-GP', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 2 DAY), 'confirmed', 9000.00, 2);

-- Seed Payments
INSERT INTO payments (id, booking_id, amount, payment_method, status, transaction_ref) VALUES
(1, 1, 9000.00, 'UPI', 'completed', 'txn_gp_9204859012');

-- Seed Complaints
INSERT INTO complaints (id, customer_id, hotel_id, complaint_ref, subject, description, status, assigned_to) VALUES
(1, 1, 1, 'CMP-9201-GP', 'AC Remote not working', 'The AC remote in room 201 has dead batteries and does not turn the unit on.', 'open', 5);
