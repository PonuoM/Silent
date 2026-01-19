import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Create MySQL connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'silent_brainstorm',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Initialize database (check connection)
export async function initDatabase() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ MySQL Database connected');
        connection.release();
    } catch (error) {
        console.error('❌ Database connection error:', error);
        throw error;
    }
}

// Count total users (to make first user admin)
export async function getUserCount() {
    try {
        const [rows] = await pool.execute('SELECT COUNT(*) as count FROM users');
        return rows[0].count;
    } catch (error) {
        return 0;
    }
}

// Add a new user
export async function addUser(user) {
    try {
        const count = await getUserCount();
        const isFirstUser = count === 0;

        await pool.execute(
            `INSERT IGNORE INTO users (id, name, phone, status, role) VALUES (?, ?, ?, ?, ?)`,
            [
                user.id,
                user.name,
                user.phone || '',
                isFirstUser ? 'APPROVED' : 'PENDING',
                isFirstUser ? 'ADMIN' : 'USER'
            ]
        );
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
        const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [id]);
        return rows.length > 0 ? rows[0] : null;
    } catch (error) {
        console.error('❌ Get user error:', error);
        return null;
    }
}

// Get user by phone (for login)
export async function getUserByPhone(phone) {
    try {
        const [rows] = await pool.execute('SELECT * FROM users WHERE phone = ?', [phone]);
        return rows.length > 0 ? rows[0] : null;
    } catch (error) {
        console.error('❌ Get user by phone error:', error);
        return null;
    }
}

// Get pending users (for admin)
export async function getPendingUsers() {
    try {
        const [rows] = await pool.execute("SELECT * FROM users WHERE status = 'PENDING' ORDER BY created_at DESC");
        return rows;
    } catch (error) {
        console.error('❌ Get pending users error:', error);
        return [];
    }
}

// Approve user
export async function approveUser(userId, role = 'USER') {
    try {
        await pool.execute("UPDATE users SET status = 'APPROVED', role = ? WHERE id = ?", [role, userId]);
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
        await pool.execute("DELETE FROM users WHERE id = ?", [userId]);
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
        const [rows] = await pool.execute('SELECT * FROM notes ORDER BY timestamp DESC');
        return rows.map(rowToNote);
    } catch (error) {
        console.error('❌ Get all notes error:', error);
        return [];
    }
}

// Add a new note
export async function addNote(note) {
    try {
        await pool.execute(
            `INSERT INTO notes (id, content, author, avatar_url, category, type, quadrant, status, timestamp, likes, linked_note_ids, merged_from_ids)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                note.id, note.content, note.author, note.avatarUrl || null,
                note.category, note.type, note.quadrant, note.status || 'ACTIVE',
                note.timestamp, note.likes || 0,
                JSON.stringify(note.linkedNoteIds || []),
                JSON.stringify(note.mergedFromIds || [])
            ]
        );
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
        await pool.execute(`UPDATE notes SET ${setClauses.join(', ')} WHERE id = ?`, args);
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
        const [rows] = await pool.execute('SELECT * FROM notes WHERE id = ?', [id]);
        return rows.length > 0 ? rowToNote(rows[0]) : null;
    } catch (error) {
        console.error('❌ Get note by ID error:', error);
        return null;
    }
}

// === SESSION MANAGEMENT ===

// Get all sessions
export async function getAllSessions() {
    try {
        const [rows] = await pool.execute('SELECT * FROM sessions ORDER BY created_at DESC');
        return rows;
    } catch (error) {
        console.error('❌ Get all sessions error:', error);
        return [];
    }
}

// Create a new session
export async function createSession(session) {
    try {
        await pool.execute(
            `INSERT INTO sessions (id, name, description, created_at, is_active, created_by) VALUES (?, ?, ?, ?, ?, ?)`,
            [session.id, session.name, session.description || '', Date.now(), 1, session.createdBy || 'system']
        );
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
        const [rows] = await pool.execute(
            'SELECT * FROM notes WHERE session_id = ? ORDER BY timestamp DESC',
            [sessionId || 'default']
        );
        return rows.map(rowToNote);
    } catch (error) {
        console.error('❌ Get notes by session error:', error);
        return [];
    }
}

// Get session statistics
export async function getSessionStats(sessionId) {
    try {
        const sid = sessionId || 'default';

        const [[totalProblems]] = await pool.execute(
            "SELECT COUNT(*) as count FROM notes WHERE session_id = ? AND type = 'PROBLEM' AND status != 'MERGED'",
            [sid]
        );

        const [[resolvedProblems]] = await pool.execute(
            "SELECT COUNT(*) as count FROM notes WHERE session_id = ? AND type = 'PROBLEM' AND status = 'RESOLVED'",
            [sid]
        );

        const [[activeProblems]] = await pool.execute(
            "SELECT COUNT(*) as count FROM notes WHERE session_id = ? AND type = 'PROBLEM' AND status = 'ACTIVE'",
            [sid]
        );

        const [[totalSolutions]] = await pool.execute(
            "SELECT COUNT(*) as count FROM notes WHERE session_id = ? AND type = 'SOLUTION' AND status != 'MERGED'",
            [sid]
        );

        const [categoryBreakdown] = await pool.execute(
            "SELECT category, COUNT(*) as count FROM notes WHERE session_id = ? AND type = 'PROBLEM' AND status != 'MERGED' GROUP BY category",
            [sid]
        );

        const [quadrantBreakdown] = await pool.execute(
            "SELECT quadrant, COUNT(*) as count FROM notes WHERE session_id = ? AND type = 'PROBLEM' AND status != 'MERGED' GROUP BY quadrant",
            [sid]
        );

        return {
            totalProblems: totalProblems?.count || 0,
            resolvedProblems: resolvedProblems?.count || 0,
            activeProblems: activeProblems?.count || 0,
            totalSolutions: totalSolutions?.count || 0,
            categoryBreakdown,
            quadrantBreakdown,
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
        await pool.execute(
            `INSERT INTO notes (id, content, author, avatar_url, category, type, quadrant, status, timestamp, likes, linked_note_ids, merged_from_ids, session_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                note.id, note.content, note.author, note.avatarUrl || null,
                note.category, note.type, note.quadrant, note.status || 'ACTIVE',
                note.timestamp, note.likes || 0,
                JSON.stringify(note.linkedNoteIds || []),
                JSON.stringify(note.mergedFromIds || []),
                sessionId || 'default'
            ]
        );
        console.log(`📝 Note added to session ${sessionId}: ${note.id}`);
        return true;
    } catch (error) {
        console.error('❌ Add note with session error:', error);
        return false;
    }
}

export { pool as db };
