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
INSERT INTO hotels (id, name, address, city, country, phone, email, description) VALUES
(1, 'Grand Palace Resort', '1 Beach Road, Colaba', 'Mumbai', 'India', '+91 22 2200 1122', 'grandpalace@hotelms.com', 'A luxurious 5-star ocean-facing heritage hotel in South Mumbai.');

-- Seed Hotel Staff assignments
INSERT INTO hotel_staff (user_id, hotel_id, is_primary) VALUES
(2, 1, TRUE),  -- Jane Manager at Grand Palace Resort
(3, 1, TRUE),  -- Robert Receptionist at Grand Palace Resort
(5, 1, TRUE);  -- Mary Housekeeper at Grand Palace Resort

-- Seed Room Categories
INSERT INTO room_categories (id, hotel_id, name, description, max_occupancy, base_price) VALUES
(1, 1, 'Standard Room', 'Cozy rooms with modern amenities, king-size bed, and city view.', 2, 2500.00),
(2, 1, 'Deluxe Room', 'Spacious rooms with private balcony, ocean view, and luxury bathtub.', 2, 4500.00),
(3, 1, 'Executive Suite', 'Premium suite with separate living room, workspace, and complimentary lounge access.', 4, 9500.00);

-- Seed Rooms
INSERT INTO rooms (id, hotel_id, category_id, room_number, status) VALUES
(1, 1, 1, '101', 'available'),
(2, 1, 1, '102', 'available'),
(3, 1, 2, '201', 'available'),
(4, 1, 2, '202', 'available'),
(5, 1, 3, '301', 'available');

-- Seed Bookings
INSERT INTO bookings (id, customer_id, hotel_id, room_id, booking_ref, check_in_date, check_out_date, status, total_amount) VALUES
(1, 1, 1, 3, 'BK-100203-GP', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 2 DAY), 'confirmed', 9000.00);

-- Seed Payments
INSERT INTO payments (id, booking_id, amount, payment_method, status, transaction_ref) VALUES
(1, 1, 9000.00, 'UPI', 'completed', 'txn_gp_9204859012');

-- Seed Complaints
INSERT INTO complaints (id, customer_id, hotel_id, complaint_ref, subject, description, status, assigned_to) VALUES
(1, 1, 1, 'CMP-9201-GP', 'AC Remote not working', 'The AC remote in room 201 has dead batteries and does not turn the unit on.', 'open', 5);
