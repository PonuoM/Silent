-- Silent Brainstorm Database Schema for MySQL
-- รันผ่าน PHPMyAdmin หลังจากสร้าง Database แล้ว

-- ตาราง Sessions (รองรับหลาย session)
CREATE TABLE IF NOT EXISTS sessions (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at BIGINT,
    is_active TINYINT DEFAULT 1,
    created_by VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ตาราง Notes (ปัญหาและทางออก)
CREATE TABLE IF NOT EXISTS notes (
    id VARCHAR(255) PRIMARY KEY,
    content TEXT NOT NULL,
    author VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    category ENUM('Process', 'Customer', 'Tools', 'People'),
    type ENUM('PROBLEM', 'SOLUTION'),
    quadrant ENUM('UNSORTED', 'Q1', 'Q2', 'Q3', 'Q4'),
    status ENUM('ACTIVE', 'RESOLVED', 'MERGED') DEFAULT 'ACTIVE',
    timestamp BIGINT,
    likes INT DEFAULT 0,
    linked_note_ids JSON DEFAULT ('[]'),
    merged_from_ids JSON DEFAULT ('[]'),
    user_id VARCHAR(255),
    session_id VARCHAR(255) DEFAULT 'default',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ตาราง Users (ระบบอนุมัติผู้ใช้)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
    role ENUM('USER', 'ADMIN') DEFAULT 'USER',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert Default Session
INSERT IGNORE INTO sessions (id, name, description, created_at, is_active, created_by)
VALUES ('default', 'Default Session', 'เซสชั่นเริ่มต้น', UNIX_TIMESTAMP() * 1000, 1, 'system');
