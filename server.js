import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  initDatabase, getAllNotes, addNote, updateNote, getNoteById,
  addUser, getUserById, getUserByPhone, getPendingUsers, approveUser, deleteUser,
  getAllSessions, createSession, getNotesBySession, getSessionStats, addNoteWithSession
} from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());

// Serve static files from 'assets' directory
app.use('/assets', express.static(path.join(__dirname, 'assets')));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// In-memory cache (synced with database)
let notes = [];
let currentSessionId = 'default'; // Track active session

// Brainstorm session state (in-memory, not persisted)
let brainstormSession = {
  isActive: false,
  endTime: null,
  startedBy: null,
};

// Load notes from database on startup (for current session)
async function loadNotes(sessionId = 'default') {
  try {
    notes = await getNotesBySession(sessionId);
    console.log(`📚 Loaded ${notes.length} notes for session: ${sessionId}`);
  } catch (error) {
    console.error('❌ Failed to load notes:', error);
    notes = [];
  }
}

io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  // Send current notes to newly connected client
  socket.emit('sync-notes', notes);

  // Send current session state
  socket.emit('session-sync', brainstormSession);

  // Send current session ID
  socket.emit('current-session', currentSessionId);

  // === SESSION MANAGEMENT ===

  // Get all sessions
  socket.on('get-sessions', async (callback) => {
    const sessions = await getAllSessions();
    if (callback) callback(sessions);
  });

  // Create new session
  socket.on('create-session', async (sessionData, callback) => {
    console.log(`📦 Creating session: ${sessionData.name}`);
    const success = await createSession(sessionData);
    if (callback) callback({ success });
    if (success) {
      io.emit('session-created', sessionData);
    }
  });

  // Switch session
  socket.on('switch-session', async (sessionId) => {
    console.log(`🔄 Switching to session: ${sessionId}`);
    currentSessionId = sessionId;
    await loadNotes(sessionId);
    io.emit('current-session', sessionId);
    io.emit('sync-notes', notes);
  });

  // Get session stats (for dashboard)
  socket.on('get-session-stats', async (sessionId, callback) => {
    const stats = await getSessionStats(sessionId || currentSessionId);
    if (callback) callback(stats);
  });

  // Handle new note (with session)
  socket.on('add-note', async (note) => {
    console.log(`📝 New note from ${socket.id}:`, note.content);
    const noteWithSession = { ...note, sessionId: currentSessionId };
    notes.push(noteWithSession);
    await addNoteWithSession(note, currentSessionId);
    socket.broadcast.emit('note-added', noteWithSession);
  });

  // Handle user registration
  socket.on('register-user', async (user, callback) => {
    console.log(`👤 User registering: ${user.name}`);
    const result = await addUser(user);
    // Send result back to the registering user
    if (callback) callback(result);
    // Broadcast to all admins that there's a new pending user
    if (result.success && result.status === 'PENDING') {
      io.emit('new-pending-user', { ...user, status: 'PENDING', role: 'USER' });
    }
  });

  // Get user info
  socket.on('get-user', async (userId, callback) => {
    const user = await getUserById(userId);
    if (callback) callback(user);
  });

  // Login by phone
  socket.on('login-by-phone', async (phone, callback) => {
    console.log(`📱 Login attempt with phone: ${phone}`);
    const user = await getUserByPhone(phone);
    if (callback) callback(user);
  });

  // Get pending users (admin only)
  socket.on('get-pending-users', async (callback) => {
    const users = await getPendingUsers();
    if (callback) callback(users);
  });

  // Approve user (admin only) - with role selection
  socket.on('approve-user', async ({ userId, role }) => {
    console.log(`✅ Approving user: ${userId} as ${role || 'USER'}`);
    const success = await approveUser(userId, role || 'USER');
    if (success) {
      io.emit('user-approved', { userId, role: role || 'USER' });
    }
  });

  // Delete user (admin only) - removes from database if not approved
  socket.on('delete-pending-user', async (userId) => {
    console.log(`🗑️ Deleting user: ${userId}`);
    const success = await deleteUser(userId);
    if (success) {
      io.emit('user-deleted', userId);
    }
  });

  // === Brainstorm Session Controls ===

  // Start brainstorm session (admin only)
  socket.on('start-session', ({ endTime, startedBy, minutes }) => {
    console.log(`⏱️ Starting brainstorm session for ${minutes} minutes`);
    brainstormSession = {
      isActive: true,
      endTime,
      startedBy,
    };
    io.emit('session-started', { endTime, startedBy });
  });

  // Extend session time
  socket.on('extend-session', ({ endTime }) => {
    console.log(`⏱️ Extending session to ${new Date(endTime)}`);
    brainstormSession.endTime = endTime;
    io.emit('session-extended', { endTime });
  });

  // End session
  socket.on('end-session', () => {
    console.log(`⏱️ Ending brainstorm session`);
    brainstormSession = {
      isActive: false,
      endTime: null,
      startedBy: null,
    };
    io.emit('session-ended');
  });

  // Handle quadrant update
  socket.on('update-quadrant', async ({ id, quadrant }) => {
    console.log(`🔄 Quadrant update: ${id} -> ${quadrant}`);
    notes = notes.map(n => n.id === id ? { ...n, quadrant } : n);
    await updateNote(id, { quadrant }); // Persist to database
    socket.broadcast.emit('quadrant-updated', { id, quadrant });
  });

  // Handle merge notes
  socket.on('merge-notes', async ({ sourceId, targetId }) => {
    console.log(`🔗 Merge notes: ${sourceId} into ${targetId}`);
    const sourceNote = notes.find(n => n.id === sourceId);
    const targetNote = notes.find(n => n.id === targetId);

    if (sourceNote && targetNote) {
      // Update in-memory
      notes = notes.map(note => {
        if (note.id === sourceId) {
          return { ...note, status: 'MERGED' };
        }
        if (note.id === targetId) {
          return {
            ...note,
            content: `${note.content}\n\n[รวมจาก: ${sourceNote.content}]`,
            mergedFromIds: [...(note.mergedFromIds || []), sourceId],
            likes: note.likes + sourceNote.likes,
          };
        }
        return note;
      });

      // Persist to database
      await updateNote(sourceId, { status: 'MERGED' });
      const updatedTarget = notes.find(n => n.id === targetId);
      await updateNote(targetId, {
        content: updatedTarget.content,
        mergedFromIds: updatedTarget.mergedFromIds,
        likes: updatedTarget.likes,
      });
    }
    socket.broadcast.emit('notes-merged', { sourceId, targetId });
  });

  // Handle link notes
  socket.on('link-notes', async ({ noteId1, noteId2 }) => {
    console.log(`🔗 Link notes: ${noteId1} ↔ ${noteId2}`);
    notes = notes.map(note => {
      if (note.id === noteId1 && !note.linkedNoteIds?.includes(noteId2)) {
        return { ...note, linkedNoteIds: [...(note.linkedNoteIds || []), noteId2] };
      }
      if (note.id === noteId2 && !note.linkedNoteIds?.includes(noteId1)) {
        return { ...note, linkedNoteIds: [...(note.linkedNoteIds || []), noteId1] };
      }
      return note;
    });

    // Persist to database
    const note1 = notes.find(n => n.id === noteId1);
    const note2 = notes.find(n => n.id === noteId2);
    if (note1) await updateNote(noteId1, { linkedNoteIds: note1.linkedNoteIds });
    if (note2) await updateNote(noteId2, { linkedNoteIds: note2.linkedNoteIds });

    socket.broadcast.emit('notes-linked', { noteId1, noteId2 });
  });

  // Handle unlink notes
  socket.on('unlink-notes', async ({ noteId1, noteId2 }) => {
    console.log(`🔓 Unlink notes: ${noteId1} ↔ ${noteId2}`);
    notes = notes.map(note => {
      if (note.id === noteId1) {
        return { ...note, linkedNoteIds: (note.linkedNoteIds || []).filter(id => id !== noteId2) };
      }
      if (note.id === noteId2) {
        return { ...note, linkedNoteIds: (note.linkedNoteIds || []).filter(id => id !== noteId1) };
      }
      return note;
    });

    // Persist to database
    const note1 = notes.find(n => n.id === noteId1);
    const note2 = notes.find(n => n.id === noteId2);
    if (note1) await updateNote(noteId1, { linkedNoteIds: note1.linkedNoteIds });
    if (note2) await updateNote(noteId2, { linkedNoteIds: note2.linkedNoteIds });

    socket.broadcast.emit('notes-unlinked', { noteId1, noteId2 });
  });

  // Handle solution complete
  socket.on('solution-complete', async (solutionId) => {
    console.log(`✅ Solution completed: ${solutionId}`);
    const solution = notes.find(n => n.id === solutionId);
    if (solution) {
      const linkedProblemIds = solution.linkedNoteIds || [];

      notes = notes.map(note => {
        if (note.id === solutionId) {
          return { ...note, status: 'RESOLVED' };
        }
        if (linkedProblemIds.includes(note.id) && note.type === 'PROBLEM') {
          return { ...note, status: 'RESOLVED' };
        }
        return note;
      });

      // Persist to database
      await updateNote(solutionId, { status: 'RESOLVED' });
      for (const problemId of linkedProblemIds) {
        await updateNote(problemId, { status: 'RESOLVED' });
      }
    }
    socket.broadcast.emit('solution-completed', solutionId);
  });

  // Handle like
  socket.on('like-note', async (id) => {
    const note = notes.find(n => n.id === id);
    if (note) {
      note.likes = (note.likes || 0) + 1;
      notes = notes.map(n => n.id === id ? note : n);
      await updateNote(id, { likes: note.likes });
    }
    io.emit('note-liked', id);
  });

  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
});

const PORT = 3001;

// Initialize database and start server
async function start() {
  try {
    await initDatabase();
    await loadNotes();

    httpServer.listen(PORT, () => {
      console.log(`\n🚀 Socket.IO server running on http://localhost:${PORT}`);
      console.log(`📊 Database connected to Turso\n`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// SPA Fallback: Serve index.html for any other requests
// This allows React Router to handle routing on the client side
// Express 5 requires named parameter for wildcard routes
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

start();
