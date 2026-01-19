import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Note, NoteType, Quadrant, NoteStatus } from '../types';
import { INITIAL_NOTES } from '../constants';

// Production: use same origin, Dev: use localhost:3001
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || (import.meta.env.DEV ? 'http://localhost:3001' : window.location.origin);

// User type with status and role
export interface User {
  id: string;
  name: string;
  phone: string;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  role?: 'USER' | 'ADMIN';
}

// Brainstorm session state
export interface BrainstormSession {
  isActive: boolean;
  endTime: number | null; // Unix timestamp
  startedBy: string | null; // Admin user ID
}

// Session (for multi-session support)
export interface Session {
  id: string;
  name: string;
  description?: string;
  created_at: number;
  is_active: number;
  created_by: string;
}

// Session stats
export interface SessionStats {
  totalProblems: number;
  resolvedProblems: number;
  activeProblems: number;
  totalSolutions: number;
  categoryBreakdown: { category: string; count: number }[];
  quadrantBreakdown: { quadrant: string; count: number }[];
}

interface SessionContextType {
  notes: Note[];
  addNote: (note: Note) => void;
  updateNoteQuadrant: (id: string, quadrant: Quadrant) => void;
  getNotesByType: (type: NoteType) => Note[];
  isConnected: boolean;
  // Functions for merge and link
  mergeNotes: (sourceId: string, targetId: string) => void;
  linkNotes: (noteId1: string, noteId2: string) => void;
  unlinkNotes: (noteId1: string, noteId2: string) => void;
  markSolutionComplete: (solutionId: string) => void;
  getActiveNotes: () => Note[];
  getLinkedNotes: (noteId: string) => Note[];
  // User functions
  currentUser: User | null;
  registerUser: (user: User) => Promise<User | null>;
  loginByPhone: (phone: string) => Promise<User | null>;
  logout: () => void;
  // Sidebar
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  // Admin functions
  pendingUsers: User[];
  approveUser: (userId: string, role?: 'USER' | 'ADMIN') => void;
  deletePendingUser: (userId: string) => void;
  refreshPendingUsers: () => void;
  // Brainstorm session (admin-controlled)
  brainstormSession: BrainstormSession;
  startBrainstormSession: (minutes: number) => void;
  extendBrainstormSession: (minutes: number) => void;
  endBrainstormSession: () => void;
  canAddNotes: boolean;
  // Multi-session support
  currentSessionId: string;
  sessions: Session[];
  createSession: (name: string, description?: string) => Promise<boolean>;
  switchSession: (sessionId: string) => void;
  refreshSessions: () => void;
  getSessionStats: () => Promise<SessionStats>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notes, setNotes] = useState<Note[]>([]); // Start empty, load from database
  const [isConnected, setIsConnected] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('silent-brainstorm-user');
    return saved ? JSON.parse(saved) : null;
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [brainstormSession, setBrainstormSession] = useState<BrainstormSession>({
    isActive: false,
    endTime: null,
    startedBy: null,
  });
  const [currentSessionId, setCurrentSessionId] = useState<string>('default');
  const [sessions, setSessions] = useState<Session[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Computed: can add notes only when session is active
  const canAddNotes = brainstormSession.isActive &&
    brainstormSession.endTime !== null &&
    Date.now() < brainstormSession.endTime;

  useEffect(() => {
    // Prevent multiple connections
    if (socketRef.current) return;

    // Use specific URL for production or localhost for dev
    // Important: For sub-folder deployment, we need to specify the path
    // NOTE: Using polling only because Phusion Passenger doesn't support WebSocket
    const socket = io(SOCKET_URL, {
      path: import.meta.env.DEV ? '/socket.io' : '/silent-api/socket.io',
      transports: ['polling'],  // Polling only - no WebSocket on shared hosting
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ Connected to WebSocket server');
      setIsConnected(true);

      // Re-login if we have a user
      const savedUser = localStorage.getItem('silent-brainstorm-user');
      if (savedUser) {
        const user = JSON.parse(savedUser);
        // We just re-emit the register event to sync state
        socket.emit('register-user', user, (response: any) => {
          if (response && response.success) {
            console.log('🔄 Re-synced user session');
            // After re-registering, also fetch the latest user status from DB
            socket.emit('get-user', user.id, (dbUser: any) => {
              if (dbUser && (dbUser.status !== user.status || dbUser.role !== user.role)) {
                const updatedUser = { ...user, status: dbUser.status, role: dbUser.role };
                setCurrentUser(updatedUser);
                localStorage.setItem('silent-brainstorm-user', JSON.stringify(updatedUser));
                console.log('🔄 User status synced from DB:', dbUser.status, dbUser.role);
              }
            });
          }
        });
      }
    });

    socketRef.current.on('disconnect', () => {
      console.log('❌ Disconnected from Socket.IO server');
      setIsConnected(false);
    });

    // Receive initial notes sync from server
    socketRef.current.on('sync-notes', (serverNotes: Note[]) => {
      if (serverNotes.length > 0) {
        setNotes(serverNotes);
      }
    });

    // Receive new note from other clients
    socketRef.current.on('note-added', (note: Note) => {
      console.log('📩 Received note from another client:', note.content);
      setNotes((prev) => [...prev, note]);
    });

    // Receive quadrant update from other clients
    socketRef.current.on('quadrant-updated', ({ id, quadrant }: { id: string; quadrant: Quadrant }) => {
      console.log('🔄 Quadrant updated from another client:', id, '->', quadrant);
      setNotes((prev) =>
        prev.map((note) => (note.id === id ? { ...note, quadrant } : note))
      );
    });

    // Receive merge from other clients
    socketRef.current.on('notes-merged', ({ sourceId, targetId }: { sourceId: string; targetId: string }) => {
      console.log('🔗 Notes merged from another client:', sourceId, 'into', targetId);
      performMerge(sourceId, targetId, false);
    });

    // Receive link from other clients
    socketRef.current.on('notes-linked', ({ noteId1, noteId2 }: { noteId1: string; noteId2: string }) => {
      console.log('🔗 Notes linked from another client:', noteId1, '↔', noteId2);
      performLink(noteId1, noteId2, false);
    });

    // Receive unlink from other clients
    socketRef.current.on('notes-unlinked', ({ noteId1, noteId2 }: { noteId1: string; noteId2: string }) => {
      console.log('🔓 Notes unlinked from another client:', noteId1, '↔', noteId2);
      performUnlink(noteId1, noteId2, false);
    });

    // Receive solution complete from other clients
    socketRef.current.on('solution-completed', (solutionId: string) => {
      console.log('✅ Solution completed from another client:', solutionId);
      performSolutionComplete(solutionId, false);
    });

    // Receive like update
    socketRef.current.on('note-liked', (id: string) => {
      setNotes((prev) =>
        prev.map((note) => (note.id === id ? { ...note, likes: note.likes + 1 } : note))
      );
    });

    // Admin: receive new pending user
    socketRef.current.on('new-pending-user', (user: User) => {
      console.log('👤 New pending user:', user.name);
      setPendingUsers((prev) => [user, ...prev]);
    });

    // User approved - update current user if it's us
    socketRef.current.on('user-approved', ({ userId, role }: { userId: string; role: string }) => {
      console.log('✅ User approved:', userId, 'as', role);
      setPendingUsers((prev) => prev.filter(u => u.id !== userId));
      // If this is the current user, update their status and role
      setCurrentUser((prev) => {
        if (prev && prev.id === userId) {
          const updated = { ...prev, status: 'APPROVED' as const, role: role as User['role'] };
          localStorage.setItem('silent-brainstorm-user', JSON.stringify(updated));
          return updated;
        }
        return prev;
      });
    });

    // User deleted (removed from pending list)
    socketRef.current.on('user-deleted', (userId: string) => {
      console.log('🗑️ User deleted:', userId);
      setPendingUsers((prev) => prev.filter(u => u.id !== userId));
      // If this is the current user, log them out
      setCurrentUser((prev) => {
        if (prev && prev.id === userId) {
          localStorage.removeItem('silent-brainstorm-user');
          return null;
        }
        return prev;
      });
    });

    // Brainstorm session events
    socketRef.current.on('session-started', ({ endTime, startedBy }: { endTime: number; startedBy: string }) => {
      console.log('⏱️ Brainstorm session started, ends at:', new Date(endTime));
      setBrainstormSession({
        isActive: true,
        endTime,
        startedBy,
      });
    });

    socketRef.current.on('session-extended', ({ endTime }: { endTime: number }) => {
      console.log('⏱️ Session extended to:', new Date(endTime));
      setBrainstormSession((prev) => ({
        ...prev,
        endTime,
      }));
    });

    socketRef.current.on('session-ended', () => {
      console.log('⏱️ Brainstorm session ended');
      setBrainstormSession({
        isActive: false,
        endTime: null,
        startedBy: null,
      });
    });

    // Sync session state on connect
    socketRef.current.on('session-sync', (session: BrainstormSession) => {
      console.log('🔄 Session state synced:', session);
      setBrainstormSession(session);
    });

    // Multi-session events
    socketRef.current.on('current-session', (sessionId: string) => {
      console.log('📦 Current session:', sessionId);
      setCurrentSessionId(sessionId);
    });

    socketRef.current.on('session-created', (session: Session) => {
      console.log('📦 Session created:', session.name);
      setSessions((prev) => [session, ...prev]);
    });

    // Load sessions on connect
    socketRef.current.emit('get-sessions', (sessionsList: Session[]) => {
      console.log('📦 Sessions loaded:', sessionsList.length);
      setSessions(sessionsList);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  const performMerge = (sourceId: string, targetId: string, emit: boolean = true) => {
    setNotes((prev) => {
      const sourceNote = prev.find(n => n.id === sourceId);
      const targetNote = prev.find(n => n.id === targetId);

      if (!sourceNote || !targetNote) return prev;

      return prev.map(note => {
        if (note.id === sourceId) {
          // Mark source as merged
          return { ...note, status: NoteStatus.Merged };
        }
        if (note.id === targetId) {
          // Add merged content and IDs to target
          return {
            ...note,
            content: `${note.content}\n\n[รวมจาก: ${sourceNote.content}]`,
            mergedFromIds: [...note.mergedFromIds, sourceId],
            likes: note.likes + sourceNote.likes,
          };
        }
        return note;
      });
    });

    if (emit) {
      socketRef.current?.emit('merge-notes', { sourceId, targetId });
    }
  };

  const mergeNotes = (sourceId: string, targetId: string) => {
    performMerge(sourceId, targetId, true);
  };

  const performLink = (noteId1: string, noteId2: string, emit: boolean = true) => {
    setNotes((prev) => {
      return prev.map(note => {
        if (note.id === noteId1 && !note.linkedNoteIds.includes(noteId2)) {
          return { ...note, linkedNoteIds: [...note.linkedNoteIds, noteId2] };
        }
        if (note.id === noteId2 && !note.linkedNoteIds.includes(noteId1)) {
          return { ...note, linkedNoteIds: [...note.linkedNoteIds, noteId1] };
        }
        return note;
      });
    });

    if (emit) {
      socketRef.current?.emit('link-notes', { noteId1, noteId2 });
    }
  };

  const linkNotes = (noteId1: string, noteId2: string) => {
    performLink(noteId1, noteId2, true);
  };

  const performUnlink = (noteId1: string, noteId2: string, emit: boolean = true) => {
    setNotes((prev) => {
      return prev.map(note => {
        if (note.id === noteId1) {
          return { ...note, linkedNoteIds: note.linkedNoteIds.filter(id => id !== noteId2) };
        }
        if (note.id === noteId2) {
          return { ...note, linkedNoteIds: note.linkedNoteIds.filter(id => id !== noteId1) };
        }
        return note;
      });
    });

    if (emit) {
      socketRef.current?.emit('unlink-notes', { noteId1, noteId2 });
    }
  };

  const unlinkNotes = (noteId1: string, noteId2: string) => {
    performUnlink(noteId1, noteId2, true);
  };

  const performSolutionComplete = (solutionId: string, emit: boolean = true) => {
    setNotes((prev) => {
      const solution = prev.find(n => n.id === solutionId);
      if (!solution) return prev;

      // Get all linked problem IDs
      const linkedProblemIds = solution.linkedNoteIds;

      return prev.map(note => {
        // Mark solution as resolved
        if (note.id === solutionId) {
          return { ...note, status: NoteStatus.Resolved };
        }
        // Mark linked problems as resolved
        if (linkedProblemIds.includes(note.id) && note.type === NoteType.Problem) {
          return { ...note, status: NoteStatus.Resolved };
        }
        return note;
      });
    });

    if (emit) {
      socketRef.current?.emit('solution-complete', solutionId);
    }
  };

  const markSolutionComplete = (solutionId: string) => {
    performSolutionComplete(solutionId, true);
  };

  const addNote = (note: Note) => {
    // Ensure new notes have the new fields
    const fullNote: Note = {
      ...note,
      status: note.status || NoteStatus.Active,
      linkedNoteIds: note.linkedNoteIds || [],
      mergedFromIds: note.mergedFromIds || [],
    };
    setNotes((prev) => [...prev, fullNote]);
    socketRef.current?.emit('add-note', fullNote);
  };

  const updateNoteQuadrant = (id: string, quadrant: Quadrant) => {
    setNotes((prev) =>
      prev.map((note) => (note.id === id ? { ...note, quadrant } : note))
    );
    socketRef.current?.emit('update-quadrant', { id, quadrant });
  };

  const getNotesByType = (type: NoteType) => {
    return notes.filter((n) => n.type === type && n.status !== NoteStatus.Merged);
  };

  const getActiveNotes = () => {
    return notes.filter(n => n.status === NoteStatus.Active);
  };

  const getLinkedNotes = (noteId: string) => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return [];
    return notes.filter(n => note.linkedNoteIds.includes(n.id));
  };

  const registerUser = (user: User): Promise<User | null> => {
    return new Promise((resolve) => {
      socketRef.current?.emit('register-user', user, (result: { success: boolean; status: string; role: string }) => {
        if (result.success) {
          const fullUser = { ...user, status: result.status as User['status'], role: result.role as User['role'] };
          setCurrentUser(fullUser);
          localStorage.setItem('silent-brainstorm-user', JSON.stringify(fullUser));
          resolve(fullUser);
        } else {
          resolve(null);
        }
      });
    });
  };

  const loginByPhone = (phone: string): Promise<User | null> => {
    return new Promise((resolve) => {
      socketRef.current?.emit('login-by-phone', phone, (dbUser: any) => {
        if (dbUser) {
          const user: User = {
            id: dbUser.id,
            name: dbUser.name,
            phone: dbUser.phone,
            status: dbUser.status,
            role: dbUser.role,
          };
          setCurrentUser(user);
          localStorage.setItem('silent-brainstorm-user', JSON.stringify(user));
          resolve(user);
        } else {
          resolve(null);
        }
      });
    });
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('silent-brainstorm-user');
  };

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => !prev);
  };

  const refreshPendingUsers = () => {
    socketRef.current?.emit('get-pending-users', (users: User[]) => {
      setPendingUsers(users);
    });
  };

  const handleApproveUser = (userId: string, role: 'USER' | 'ADMIN' = 'USER') => {
    socketRef.current?.emit('approve-user', { userId, role });
  };

  const handleDeletePendingUser = (userId: string) => {
    socketRef.current?.emit('delete-pending-user', userId);
  };

  // Brainstorm session controls (admin only)
  const startBrainstormSession = (minutes: number) => {
    if (currentUser?.role === 'ADMIN') {
      const endTime = Date.now() + minutes * 60 * 1000;
      socketRef.current?.emit('start-session', {
        endTime,
        startedBy: currentUser.id,
        minutes
      });
    }
  };

  const extendBrainstormSession = (minutes: number) => {
    if (currentUser?.role === 'ADMIN' && brainstormSession.isActive) {
      const newEndTime = (brainstormSession.endTime || Date.now()) + minutes * 60 * 1000;
      socketRef.current?.emit('extend-session', { endTime: newEndTime });
    }
  };

  const endBrainstormSession = () => {
    if (currentUser?.role === 'ADMIN') {
      socketRef.current?.emit('end-session');
    }
  };

  // === Multi-session functions ===
  const handleCreateSession = (name: string, description?: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const sessionId = `session-${Date.now()}`;
      socketRef.current?.emit('create-session', {
        id: sessionId,
        name,
        description: description || '',
        createdBy: currentUser?.id || 'anonymous',
      }, (result: { success: boolean }) => {
        resolve(result.success);
      });
    });
  };

  const handleSwitchSession = (sessionId: string) => {
    socketRef.current?.emit('switch-session', sessionId);
  };

  const handleRefreshSessions = () => {
    socketRef.current?.emit('get-sessions', (sessionsList: Session[]) => {
      setSessions(sessionsList);
    });
  };

  const handleGetSessionStats = (): Promise<SessionStats> => {
    return new Promise((resolve) => {
      socketRef.current?.emit('get-session-stats', currentSessionId, (stats: SessionStats) => {
        resolve(stats);
      });
    });
  };

  return (
    <SessionContext.Provider value={{
      notes,
      addNote,
      updateNoteQuadrant,
      getNotesByType,
      isConnected,
      mergeNotes,
      linkNotes,
      unlinkNotes,
      markSolutionComplete,
      getActiveNotes,
      getLinkedNotes,
      currentUser,
      registerUser,
      loginByPhone,
      logout,
      sidebarCollapsed,
      toggleSidebar,
      pendingUsers,
      approveUser: handleApproveUser,
      deletePendingUser: handleDeletePendingUser,
      refreshPendingUsers,
      brainstormSession,
      startBrainstormSession,
      extendBrainstormSession,
      endBrainstormSession,
      canAddNotes,
      // Multi-session
      currentSessionId,
      sessions,
      createSession: handleCreateSession,
      switchSession: handleSwitchSession,
      refreshSessions: handleRefreshSessions,
      getSessionStats: handleGetSessionStats,
    }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};
