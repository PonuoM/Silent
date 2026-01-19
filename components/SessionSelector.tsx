import React, { useState } from 'react';
import { useSession } from '../context/SessionContext';

const SessionSelector: React.FC = () => {
    const {
        currentSessionId,
        sessions,
        createSession,
        switchSession,
        currentUser
    } = useSession();

    const [showCreate, setShowCreate] = useState(false);
    const [showList, setShowList] = useState(false);
    const [newName, setNewName] = useState('');
    const [newDesc, setNewDesc] = useState('');

    const currentSession = sessions.find(s => s.id === currentSessionId);

    const handleCreate = async () => {
        if (!newName.trim()) return;
        const success = await createSession(newName, newDesc);
        if (success) {
            setNewName('');
            setNewDesc('');
            setShowCreate(false);
        }
    };

    const handleSwitch = (sessionId: string) => {
        switchSession(sessionId);
        setShowList(false);
    };

    return (
        <div className="relative">
            {/* Current Session Display */}
            <div
                onClick={() => setShowList(!showList)}
                className="bg-primary/10 rounded-xl p-3 mb-2 border border-primary/20 cursor-pointer hover:bg-primary/20 transition-colors"
            >
                <span className="text-[10px] uppercase tracking-wider text-primary font-bold block">📦 Session ปัจจุบัน</span>
                <div className="flex items-center justify-between mt-1">
                    <span className="text-sm font-bold text-slate-800">
                        {currentSession?.name || 'Default'}
                    </span>
                    <span className="material-symbols-outlined text-primary text-sm">
                        {showList ? 'expand_less' : 'expand_more'}
                    </span>
                </div>
            </div>

            {/* Session List */}
            {showList && sessions.length > 1 && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-lg mb-2 max-h-32 overflow-y-auto">
                    {sessions.map(session => (
                        <button
                            key={session.id}
                            onClick={() => handleSwitch(session.id)}
                            className={`w-full text-left px-3 py-2 text-xs font-medium hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0
                ${session.id === currentSessionId ? 'bg-primary/10 text-primary' : 'text-slate-700'}
              `}
                        >
                            {session.name}
                        </button>
                    ))}
                </div>
            )}

            {/* Create New Session Button (Admin only) */}
            {currentUser?.role === 'ADMIN' && (
                <>
                    <button
                        onClick={() => { setShowCreate(!showCreate); setShowList(false); }}
                        className="w-full bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-2 border border-primary/20"
                    >
                        <span className="material-symbols-outlined text-sm">add</span>
                        สร้าง Session ใหม่
                    </button>

                    {/* Create Form */}
                    {showCreate && (
                        <div className="mt-2 bg-slate-50 rounded-xl p-3 space-y-2 border border-slate-200">
                            <input
                                type="text"
                                placeholder="ชื่อ Session"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                className="w-full bg-white text-slate-700 text-sm rounded-lg px-3 py-2 placeholder-slate-400 border border-slate-200 focus:ring-2 focus:ring-primary/30 focus:outline-none"
                            />
                            <input
                                type="text"
                                placeholder="รายละเอียด (ไม่บังคับ)"
                                value={newDesc}
                                onChange={(e) => setNewDesc(e.target.value)}
                                className="w-full bg-white text-slate-700 text-sm rounded-lg px-3 py-2 placeholder-slate-400 border border-slate-200 focus:ring-2 focus:ring-primary/30 focus:outline-none"
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={handleCreate}
                                    disabled={!newName.trim()}
                                    className="flex-1 bg-primary hover:bg-primary-dark text-white text-xs font-bold py-2 rounded-lg disabled:opacity-50 transition-all"
                                >
                                    สร้าง
                                </button>
                                <button
                                    onClick={() => setShowCreate(false)}
                                    className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold py-2 rounded-lg transition-all"
                                >
                                    ยกเลิก
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default SessionSelector;
