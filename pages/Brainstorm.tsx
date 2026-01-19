import React, { useEffect, useState } from 'react';
import { useSession } from '../context/SessionContext';
import StickyNote from '../components/StickyNote';
import { NoteType, Quadrant, Note, NoteStatus } from '../types';
import { useNavigate } from 'react-router-dom';

const Brainstorm: React.FC = () => {
  const {
    notes,
    addNote,
    isConnected,
    currentUser,
    brainstormSession,
    startBrainstormSession,
    extendBrainstormSession,
    endBrainstormSession,
    canAddNotes,
  } = useSession();

  const [inputText, setInputText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'Customer' | 'Process' | 'Tools' | 'People'>('Customer');
  const [selectedMinutes, setSelectedMinutes] = useState(5);
  const [timeLeft, setTimeLeft] = useState(0);
  const [showEndModal, setShowEndModal] = useState(false);
  const navigate = useNavigate();

  const isAdmin = currentUser?.role === 'ADMIN';

  // Timer countdown
  useEffect(() => {
    const timer = setInterval(() => {
      if (brainstormSession.isActive && brainstormSession.endTime) {
        const remaining = Math.max(0, Math.floor((brainstormSession.endTime - Date.now()) / 1000));
        setTimeLeft(remaining);

        // Time's up
        if (remaining === 0 && brainstormSession.isActive && isAdmin) {
          setShowEndModal(true);
        }
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [brainstormSession, isAdmin]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !canAddNotes) return;

    const newNote: Note = {
      id: Date.now().toString(),
      content: inputText.trim(),
      author: 'ไม่ระบุตัวตน',
      avatarUrl: `https://i.pravatar.cc/150?u=${Date.now()}`,
      category: selectedCategory,
      type: NoteType.Problem,
      quadrant: Quadrant.Unsorted,
      timestamp: Date.now(),
      likes: 0,
      status: NoteStatus.Active,
      linkedNoteIds: [],
      mergedFromIds: [],
      // Store creator info (hidden from UI)
      createdByUserId: currentUser?.id,
      createdByName: currentUser?.name,
      createdByPhone: currentUser?.phone,
    };

    addNote(newNote);
    setInputText('');
  };

  const handleStartSession = () => {
    startBrainstormSession(selectedMinutes);
  };

  const handleExtendSession = () => {
    extendBrainstormSession(1);
    setShowEndModal(false);
  };

  const handleEndSession = () => {
    endBrainstormSession();
    setShowEndModal(false);
  };

  const unsortedNotes = notes.filter(n =>
    n.type === NoteType.Problem &&
    n.status !== NoteStatus.Merged &&
    n.status !== 'MERGED' as any
  );

  const categoryOptions = [
    { value: 'Customer', label: 'ลูกค้า', color: 'bg-green-500' },
    { value: 'Process', label: 'กระบวนการ', color: 'bg-blue-500' },
    { value: 'Tools', label: 'เครื่องมือ', color: 'bg-amber-500' },
    { value: 'People', label: 'ทีมงาน', color: 'bg-pink-500' },
  ];

  const minuteOptions = [3, 5, 10, 15, 20];

  return (
    <div className="flex-1 flex flex-col h-full relative overflow-hidden bg-white/50">
      {/* Top Bar - Mobile Responsive */}
      <div className="bg-white border-b border-slate-200 px-4 lg:px-8 py-3 lg:py-4 shrink-0 z-20">
        {/* Mobile: Stack vertically */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          {/* Title & Status */}
          <div className="flex items-center justify-between lg:justify-start gap-4 pl-14 lg:pl-0">
            <div>
              <h2 className="text-lg lg:text-xl font-bold text-slate-900">ช่วงระดมสมองเงียบ (Silent Phase)</h2>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs lg:text-sm text-slate-500">{unsortedNotes.length} ไอเดีย</p>
                <span className="text-slate-300">•</span>
                <div className={`flex items-center gap-1 text-xs font-bold ${isConnected ? 'text-green-600' : 'text-red-500'}`}>
                  <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                  {isConnected ? 'เชื่อมต่อแล้ว' : 'ไม่ได้เชื่อมต่อ'}
                </div>
              </div>
            </div>
          </div>

          {/* Timer & Controls */}
          <div className="flex items-center justify-center lg:justify-end gap-2 flex-wrap">
            {/* Timer */}
            {brainstormSession.isActive ? (
              <div className={`px-4 py-2 rounded-xl shadow-lg flex items-center gap-2 ${timeLeft <= 60 ? 'bg-red-500 animate-pulse' : 'bg-slate-900'
                } text-white`}>
                <span className="material-symbols-outlined text-primary text-sm">timer</span>
                <span className="text-lg lg:text-2xl font-mono font-bold tracking-widest">{formatTime(timeLeft)}</span>
              </div>
            ) : (
              <div className="bg-slate-200 text-slate-500 px-4 py-2 rounded-xl flex items-center gap-2 text-sm">
                <span className="material-symbols-outlined text-sm">timer_off</span>
                <span className="font-bold">รอเริ่มเซสชัน</span>
              </div>
            )}

            {/* Admin Controls */}
            {isAdmin && !brainstormSession.isActive && (
              <div className="flex items-center gap-2">
                <select
                  value={selectedMinutes}
                  onChange={(e) => setSelectedMinutes(Number(e.target.value))}
                  className="px-2 py-2 border border-slate-200 rounded-xl text-sm font-medium"
                >
                  {minuteOptions.map(m => (
                    <option key={m} value={m}>{m} นาที</option>
                  ))}
                </select>
                <button
                  onClick={handleStartSession}
                  className="bg-green-500 hover:bg-green-600 text-white px-3 lg:px-6 py-2 rounded-xl font-bold shadow-lg transition-all flex items-center gap-1 text-sm"
                >
                  <span className="material-symbols-outlined text-sm">play_circle</span>
                  <span className="hidden sm:inline">เริ่มระดมสมอง</span>
                </button>
              </div>
            )}

            {isAdmin && brainstormSession.isActive && (
              <button
                onClick={() => extendBrainstormSession(1)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                +1 นาที
              </button>
            )}

            {isAdmin && brainstormSession.isActive && (
              <button
                onClick={handleEndSession}
                className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">stop_circle</span>
                <span className="hidden sm:inline">หยุด</span>
              </button>
            )}

            <button
              onClick={() => navigate('/problem-matrix')}
              className="bg-primary hover:bg-primary-dark text-white px-3 lg:px-4 py-2 rounded-xl font-bold shadow-lg shadow-primary/20 transition-all flex items-center gap-1 text-sm"
            >
              <span className="material-symbols-outlined text-sm">grid_view</span>
              <span className="hidden sm:inline">จัดกลุ่ม</span>
            </button>
          </div>
        </div>
      </div>

      {/* Canvas - Free form */}
      <div className="flex-1 relative overflow-auto bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px] p-4">
        {unsortedNotes.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center px-4">
              <span className="material-symbols-outlined text-6xl text-slate-300">lightbulb</span>
              <p className="text-lg lg:text-xl font-medium text-slate-500 mt-4">
                {brainstormSession.isActive
                  ? 'เริ่มพิมพ์ไอเดียของคุณด้านล่าง!'
                  : 'รอผู้ดูแลเริ่มเซสชันระดมสมอง'}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {unsortedNotes.map((note) => (
              <div key={note.id} className="animate-[pop-in_0.4s_ease-out]">
                <StickyNote note={note} isDraggable />
              </div>
            ))}
          </div>
        )}

        {/* Spacer for fixed input form on mobile */}
        <div className="h-32 lg:h-0 shrink-0"></div>
      </div>

      {/* Input Form - Fixed at bottom on mobile */}
      {brainstormSession.isActive ? (
        <div className="fixed bottom-0 left-0 right-0 lg:relative bg-white border-t border-slate-200 p-3 lg:p-4 z-40 shadow-[0_-4px_12px_rgba(0,0,0,0.1)] lg:shadow-none">
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-2 lg:space-y-0 lg:flex lg:gap-3">
            {/* Category Pills */}
            <div className="flex gap-1 overflow-x-auto pb-1">
              {categoryOptions.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setSelectedCategory(cat.value as any)}
                  className={`px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${selectedCategory === cat.value
                    ? `${cat.color} text-white shadow-md`
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Input Row */}
            <div className="flex gap-2 flex-1">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="พิมพ์ปัญหาที่พบ แล้วกด Enter..."
                className="flex-1 px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm"
                disabled={!canAddNotes}
              />
              <button
                type="submit"
                disabled={!inputText.trim() || !canAddNotes}
                className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white px-4 lg:px-6 py-3 rounded-xl font-bold shadow-lg transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined">send</span>
                <span className="hidden sm:inline">ส่ง</span>
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="fixed bottom-0 left-0 right-0 lg:relative bg-slate-100 border-t border-slate-200 p-4 z-40">
          <div className="max-w-3xl mx-auto text-center text-slate-500">
            <span className="material-symbols-outlined text-2xl">lock</span>
            <p className="text-sm font-medium">เซสชันยังไม่เริ่ม - รอผู้ดูแลกดเริ่มระดมสมอง</p>
          </div>
        </div>
      )}

      {/* Time's Up Modal */}
      {showEndModal && isAdmin && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 lg:p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 lg:w-20 lg:h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-3xl lg:text-4xl text-amber-600">alarm</span>
            </div>
            <h2 className="text-xl lg:text-2xl font-bold text-slate-800 mb-2">หมดเวลาระดมสมอง!</h2>
            <p className="text-slate-500 mb-6">ต้องการต่อเวลาเพิ่มหรือไม่?</p>

            <div className="flex gap-3">
              <button
                onClick={handleEndSession}
                className="flex-1 px-4 lg:px-6 py-3 bg-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-300 transition-all"
              >
                จบเซสชัน
              </button>
              <button
                onClick={handleExtendSession}
                className="flex-1 px-4 lg:px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined">add</span>
                +1 นาที
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Brainstorm;
