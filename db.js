import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config();

// Create Turso client
const db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
});

// Initialize database (create tables if not exist)
export async function initDatabase() {
    try {
        // Create sessions table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                created_at INTEGER,
                is_active INTEGER DEFAULT 1,
                created_by TEXT
            )
        `);

        // Create notes table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS notes (
                id TEXT PRIMARY KEY,
                content TEXT NOT NULL,
                author TEXT NOT NULL,
                avatar_url TEXT,
                category TEXT CHECK(category IN ('Process', 'Customer', 'Tools', 'People')),
                type TEXT CHECK(type IN ('PROBLEM', 'SOLUTION')),
                quadrant TEXT CHECK(quadrant IN ('UNSORTED', 'Q1', 'Q2', 'Q3', 'Q4')),
                status TEXT DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'RESOLVED', 'MERGED')),
                timestamp INTEGER,
                likes INTEGER DEFAULT 0,
                linked_note_ids TEXT DEFAULT '[]',
                merged_from_ids TEXT DEFAULT '[]',
                user_id TEXT,
                user_name TEXT,
                user_phone TEXT,
                session_id TEXT DEFAULT 'default',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create users table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                phone TEXT,
                status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED')),
                role TEXT DEFAULT 'USER' CHECK(role IN ('USER', 'ADMIN')),
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Insert default session if not exists
        await db.execute({
            sql: `INSERT OR IGNORE INTO sessions (id, name, description, created_at, is_active, created_by)
                  VALUES (?, ?, ?, ?, ?, ?)`,
            args: ['default', 'Default Session', 'เซสชั่นเริ่มต้น', Date.now(), 1, 'system']
        });

        // Migrate existing tables: add user columns if they don't exist
        try {
            await db.execute(`ALTER TABLE notes ADD COLUMN user_id TEXT`);
            console.log('📦 Added user_id column to notes table');
        } catch (e) {
            // Column already exists, ignore
        }
        try {
            await db.execute(`ALTER TABLE notes ADD COLUMN user_name TEXT`);
            console.log('📦 Added user_name column to notes table');
        } catch (e) {
            // Column already exists, ignore
        }
        try {
            await db.execute(`ALTER TABLE notes ADD COLUMN user_phone TEXT`);
            console.log('📦 Added user_phone column to notes table');
        } catch (e) {
            // Column already exists, ignore
        }

        console.log('✅ Turso Database connected and initialized');
    } catch (error) {
        console.error('❌ Database connection error:', error);
        throw error;
    }
}

// Count total users (to make first user admin)
export async function getUserCount() {
    try {
        const result = await db.execute('SELECT COUNT(*) as count FROM users');
        return result.rows[0].count;
    } catch (error) {
        return 0;
    }
}

// Add a new user
export async function addUser(user) {
    try {
        const count = await getUserCount();
        const isFirstUser = count === 0;

        await db.execute({
            sql: `INSERT OR IGNORE INTO users (id, name, phone, status, role) VALUES (?, ?, ?, ?, ?)`,
            args: [
                user.id,
                user.name,
                user.phone || '',
                isFirstUser ? 'APPROVED' : 'PENDING',
                isFirstUser ? 'ADMIN' : 'USER'
            ]
        });
        console.log(`👤 User registered: ${user.name} (${isFirstUser ? 'ADMIN' : 'PENDING'})`);
        return { success: true, isFirstUser, status: isFirstUser ? 'APPROVED' : 'PENDING', role: isFirstUser ? 'ADMIN' : 'USER' };
    } catch (error) {
        console.error('❌ Add user error:', error);
        return { success: false };
    }
}

// Get user by ID
export async function getUserById(id) {
    try {
        const result = await db.execute({ sql: 'SELECT * FROM users WHERE id = ?', args: [id] });
        return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
        console.error('❌ Get user error:', error);
        return null;
    }
}

// Get user by phone (for login)
export async function getUserByPhone(phone) {
    try {
        const result = await db.execute({ sql: 'SELECT * FROM users WHERE phone = ?', args: [phone] });
        return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
        console.error('❌ Get user by phone error:', error);
        return null;
    }
}

// Get pending users (for admin)
export async function getPendingUsers() {
    try {
        const result = await db.execute("SELECT * FROM users WHERE status = 'PENDING' ORDER BY created_at DESC");
        return result.rows;
    } catch (error) {
        console.error('❌ Get pending users error:', error);
        return [];
    }
}

// Approve user
export async function approveUser(userId, role = 'USER') {
    try {
        await db.execute({ sql: "UPDATE users SET status = 'APPROVED', role = ? WHERE id = ?", args: [role, userId] });
        console.log(`✅ User approved: ${userId} as ${role}`);
        return true;
    } catch (error) {
        console.error('❌ Approve user error:', error);
        return false;
    }
}

// Delete user
export async function deleteUser(userId) {
    try {
        await db.execute({ sql: "DELETE FROM users WHERE id = ?", args: [userId] });
        console.log(`🗑️ User deleted: ${userId}`);
        return true;
    } catch (error) {
        console.error('❌ Delete user error:', error);
        return false;
    }
}

// Helper to convert DB row to Note object
function rowToNote(row) {
    return {
        id: row.id,
        content: row.content,
        author: row.author,
        avatarUrl: row.avatar_url,
        category: row.category,
        type: row.type,
        quadrant: row.quadrant,
        status: row.status,
        timestamp: row.timestamp,
        likes: row.likes,
        linkedNoteIds: typeof row.linked_note_ids === 'string' ? JSON.parse(row.linked_note_ids || '[]') : (row.linked_note_ids || []),
        mergedFromIds: typeof row.merged_from_ids === 'string' ? JSON.parse(row.merged_from_ids || '[]') : (row.merged_from_ids || []),
    };
}

// Get all notes
export async function getAllNotes() {
    try {
        const result = await db.execute('SELECT * FROM notes ORDER BY timestamp DESC');
        return result.rows.map(rowToNote);
    } catch (error) {
        console.error('❌ Get all notes error:', error);
        return [];
    }
}

// Add a new note
export async function addNote(note) {
    try {
        await db.execute({
            sql: `INSERT INTO notes (id, content, author, avatar_url, category, type, quadrant, status, timestamp, likes, linked_note_ids, merged_from_ids)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
                note.id, note.content, note.author, note.avatarUrl || null,
                note.category, note.type, note.quadrant, note.status || 'ACTIVE',
                note.timestamp, note.likes || 0,
                JSON.stringify(note.linkedNoteIds || []),
                JSON.stringify(note.mergedFromIds || [])
            ]
        });
        console.log(`📝 Note added: ${note.id}`);
        return true;
    } catch (error) {
        console.error('❌ Add note error:', error);
        return false;
    }
}

// Update a note
export async function updateNote(id, updates) {
    try {
        const setClauses = [];
        const args = [];

        if (updates.quadrant !== undefined) {
            setClauses.push('quadrant = ?');
            args.push(updates.quadrant);
        }
        if (updates.status !== undefined) {
            setClauses.push('status = ?');
            args.push(updates.status);
        }
        if (updates.content !== undefined) {
            setClauses.push('content = ?');
            args.push(updates.content);
        }
        if (updates.likes !== undefined) {
            setClauses.push('likes = ?');
            args.push(updates.likes);
        }
        if (updates.linkedNoteIds !== undefined) {
            setClauses.push('linked_note_ids = ?');
            args.push(JSON.stringify(updates.linkedNoteIds));
        }
        if (updates.mergedFromIds !== undefined) {
            setClauses.push('merged_from_ids = ?');
            args.push(JSON.stringify(updates.mergedFromIds));
        }

        if (setClauses.length === 0) return false;

        args.push(id);
        await db.execute({ sql: `UPDATE notes SET ${setClauses.join(', ')} WHERE id = ?`, args });
        console.log(`🔄 Note updated: ${id}`);
        return true;
    } catch (error) {
        console.error('❌ Update note error:', error);
        return false;
    }
}

// Get note by ID
export async function getNoteById(id) {
    try {
        const result = await db.execute({ sql: 'SELECT * FROM notes WHERE id = ?', args: [id] });
        return result.rows.length > 0 ? rowToNote(result.rows[0]) : null;
    } catch (error) {
        console.error('❌ Get note by ID error:', error);
        return null;
    }
}

// === SESSION MANAGEMENT ===

// Get all sessions
export async function getAllSessions() {
    try {
        const result = await db.execute('SELECT * FROM sessions ORDER BY created_at DESC');
        return result.rows;
    } catch (error) {
        console.error('❌ Get all sessions error:', error);
        return [];
    }
}

// Create a new session
export async function createSession(session) {
    try {
        await db.execute({
            sql: `INSERT INTO sessions (id, name, description, created_at, is_active, created_by) VALUES (?, ?, ?, ?, ?, ?)`,
            args: [session.id, session.name, session.description || '', Date.now(), 1, session.createdBy || 'system']
        });
        console.log(`📦 Session created: ${session.name}`);
        return true;
    } catch (error) {
        console.error('❌ Create session error:', error);
        return false;
    }
}

// Get notes by session ID
export async function getNotesBySession(sessionId) {
    try {
        const result = await db.execute({
            sql: 'SELECT * FROM notes WHERE session_id = ? ORDER BY timestamp DESC',
            args: [sessionId || 'default']
        });
        return result.rows.map(rowToNote);
    } catch (error) {
        console.error('❌ Get notes by session error:', error);
        return [];
    }
}

// Get session statistics
export async function getSessionStats(sessionId) {
    try {
        const sid = sessionId || 'default';

        const totalProblemsResult = await db.execute({
            sql: "SELECT COUNT(*) as count FROM notes WHERE session_id = ? AND type = 'PROBLEM' AND status != 'MERGED'",
            args: [sid]
        });

        const resolvedProblemsResult = await db.execute({
            sql: "SELECT COUNT(*) as count FROM notes WHERE session_id = ? AND type = 'PROBLEM' AND status = 'RESOLVED'",
            args: [sid]
        });

        const activeProblemsResult = await db.execute({
            sql: "SELECT COUNT(*) as count FROM notes WHERE session_id = ? AND type = 'PROBLEM' AND status = 'ACTIVE'",
            args: [sid]
        });

        const totalSolutionsResult = await db.execute({
            sql: "SELECT COUNT(*) as count FROM notes WHERE session_id = ? AND type = 'SOLUTION' AND status != 'MERGED'",
            args: [sid]
        });

        const categoryBreakdownResult = await db.execute({
            sql: "SELECT category, COUNT(*) as count FROM notes WHERE session_id = ? AND type = 'PROBLEM' AND status != 'MERGED' GROUP BY category",
            args: [sid]
        });

        const quadrantBreakdownResult = await db.execute({
            sql: "SELECT quadrant, COUNT(*) as count FROM notes WHERE session_id = ? AND type = 'PROBLEM' AND status != 'MERGED' GROUP BY quadrant",
            args: [sid]
        });

        return {
            totalProblems: totalProblemsResult.rows[0]?.count || 0,
            resolvedProblems: resolvedProblemsResult.rows[0]?.count || 0,
            activeProblems: activeProblemsResult.rows[0]?.count || 0,
            totalSolutions: totalSolutionsResult.rows[0]?.count || 0,
            categoryBreakdown: categoryBreakdownResult.rows,
            quadrantBreakdown: quadrantBreakdownResult.rows,
        };
    } catch (error) {
        console.error('❌ Get session stats error:', error);
        return {
            totalProblems: 0,
            resolvedProblems: 0,
            activeProblems: 0,
            totalSolutions: 0,
            categoryBreakdown: [],
            quadrantBreakdown: [],
        };
    }
}

// Add note with session ID
export async function addNoteWithSession(note, sessionId) {
    try {
        await db.execute({
            sql: `INSERT INTO notes (id, content, author, avatar_url, category, type, quadrant, status, timestamp, likes, linked_note_ids, merged_from_ids, user_id, user_name, user_phone, session_id)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
                note.id, note.content, note.author, note.avatarUrl || null,
                note.category, note.type, note.quadrant, note.status || 'ACTIVE',
                note.timestamp, note.likes || 0,
                JSON.stringify(note.linkedNoteIds || []),
                JSON.stringify(note.mergedFromIds || []),
                note.createdByUserId || null,
                note.createdByName || null,
                note.createdByPhone || null,
                sessionId || 'default'
            ]
        });
        console.log(`📝 Note added to session ${sessionId}: ${note.id} (by ${note.createdByName || 'anonymous'})`);
        return true;
    } catch (error) {
        console.error('❌ Add note with session error:', error);
        return false;
    }
}

export { db };
