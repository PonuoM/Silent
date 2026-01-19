import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../context/SessionContext';
import { Note, NoteType, NoteStatus, Quadrant } from '../types';
import StickyNote from '../components/StickyNote';
import MergeConfirmPopup from '../components/MergeConfirmPopup';
import LinkNoteModal from '../components/LinkNoteModal';

const SolutionMatrix: React.FC = () => {
  const navigate = useNavigate();
  const { notes, addNote, updateNoteQuadrant, mergeNotes, linkNotes, unlinkNotes, markSolutionComplete, isConnected } = useSession();

  const [mergePopup, setMergePopup] = useState<{
    sourceId: string;
    targetNote: Note;
    position: { x: number; y: number };
  } | null>(null);

  const [linkModal, setLinkModal] = useState<Note | null>(null);
  const [inputText, setInputText] = useState('');

  // Mobile: Selected note for tap-to-move
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  const quadrantMap: Record<string, Quadrant> = {
    'Unsorted': Quadrant.Unsorted,
    'Focus': Quadrant.Q1,
    'Plan': Quadrant.Q2,
    'Delegate': Quadrant.Q3,
    'Discard': Quadrant.Q4,
  };

  const solutions = notes.filter(n =>
    n.type === NoteType.Solution &&
    n.status !== NoteStatus.Merged &&
    n.status !== 'MERGED' as any
  );

  const getSolutionsByQuadrant = (q: keyof typeof quadrantMap) => {
    return solutions.filter(s => s.quadrant === quadrantMap[q]);
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDrop = (e: React.DragEvent, targetQ: keyof typeof quadrantMap) => {
    e.preventDefault();
    // Don't move note if merge popup is open
    if (mergePopup) return;
    const id = e.dataTransfer.getData('text/plain');
    if (id) {
      updateNoteQuadrant(id, quadrantMap[targetQ]);
    }
  };

  // Mobile: Tap on note to select
  const handleNoteClick = (noteId: string) => {
    if (selectedNoteId === noteId) {
      setSelectedNoteId(null);
    } else {
      setSelectedNoteId(noteId);
    }
  };

  // Mobile: Tap on quadrant to move selected note
  const handleQuadrantClick = (targetQ: keyof typeof quadrantMap) => {
    if (selectedNoteId) {
      updateNoteQuadrant(selectedNoteId, quadrantMap[targetQ]);
      setSelectedNoteId(null);
    }
  };

  const handleMergeHold = (sourceId: string, targetNote: Note, position: { x: number; y: number }) => {
    if (sourceId === targetNote.id) return;
    setMergePopup({ sourceId, targetNote, position });
  };

  const handleMergeConfirm = () => {
    if (mergePopup) {
      mergeNotes(mergePopup.sourceId, mergePopup.targetNote.id);
      setMergePopup(null);
    }
  };

  const handleLinkClick = (note: Note) => {
    setLinkModal(note);
  };

  const handleCompleteClick = (note: Note) => {
    const linkedCount = note.linkedNoteIds?.length || 0;
    const message = linkedCount > 0
      ? `ยืนยันว่าทางออก "${note.content.substring(0, 30)}..." เสร็จสิ้นแล้ว?\n\nปัญหาที่เชื่อมโยง ${linkedCount} รายการจะถูกทำเครื่องหมายว่าแก้ไขแล้วด้วย`
      : `ยืนยันว่าทางออก "${note.content.substring(0, 30)}..." เสร็จสิ้นแล้ว?`;

    if (confirm(message)) {
      markSolutionComplete(note.id);
    }
  };

  const handleAddSolution = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newSolution: Note = {
      id: Date.now().toString(),
      content: inputText.trim(),
      author: 'ไม่ระบุตัวตน',
      avatarUrl: `https://i.pravatar.cc/150?u=${Date.now()}`,
      category: 'Process',
      type: NoteType.Solution,
      quadrant: Quadrant.Unsorted,
      timestamp: Date.now(),
      likes: 0,
      status: NoteStatus.Active,
      linkedNoteIds: [],
      mergedFromIds: [],
    };

    addNote(newSolution);
    setInputText('');
  };

  const quadrantConfig = [
    { q: 'Focus' as const, title: 'โฟกัส', desc: 'ผลลัพธ์สูง / ทำง่าย', borderColor: 'border-green-400', bgColor: 'bg-green-50' },
    { q: 'Plan' as const, title: 'วางแผน', desc: 'ผลลัพธ์สูง / ทำยาก', borderColor: 'border-amber-400', bgColor: 'bg-amber-50' },
    { q: 'Delegate' as const, title: 'มอบหมาย', desc: 'ผลลัพธ์ต่ำ / ทำง่าย', borderColor: 'border-blue-400', bgColor: 'bg-blue-50' },
    { q: 'Discard' as const, title: 'พักไว้ก่อน', desc: 'ผลลัพธ์ต่ำ / ทำยาก', borderColor: 'border-slate-300', bgColor: 'bg-slate-100' },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-white overflow-hidden">
      {/* Merge Popup */}
      {mergePopup && (
        <MergeConfirmPopup
          targetNote={mergePopup.targetNote}
          position={mergePopup.position}
          onConfirm={handleMergeConfirm}
          onCancel={() => setMergePopup(null)}
        />
      )}

      {/* Link Modal */}
      {linkModal && (
        <LinkNoteModal
          currentNote={linkModal}
          allNotes={notes}
          linkedNoteIds={linkModal.linkedNoteIds || []}
          onLink={(noteId) => {
            linkNotes(linkModal.id, noteId);
            setLinkModal({
              ...linkModal,
              linkedNoteIds: [...(linkModal.linkedNoteIds || []), noteId]
            });
          }}
          onUnlink={(noteId) => {
            unlinkNotes(linkModal.id, noteId);
            setLinkModal({
              ...linkModal,
              linkedNoteIds: (linkModal.linkedNoteIds || []).filter(id => id !== noteId)
            });
          }}
          onClose={() => setLinkModal(null)}
        />
      )}

      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 lg:px-6 py-3 flex justify-between items-center shrink-0">
        <div className="pl-10 lg:pl-0">
          <h2 className="text-base lg:text-lg font-bold text-slate-900">ระยะที่ 3: หาทางออก</h2>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-[10px] lg:text-xs text-slate-500">
              <span className="hidden lg:inline">กด 🔗 เชื่อมปัญหา • กด ✓ เมื่อเสร็จ</span>
              <span className="lg:hidden">แตะเลือก → แตะช่องปลายทาง</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selectedNoteId && (
            <button
              onClick={() => setSelectedNoteId(null)}
              className="bg-amber-100 text-amber-700 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 lg:hidden"
            >
              <span className="material-symbols-outlined text-sm">close</span>
              ยกเลิก
            </button>
          )}
          <button
            onClick={() => navigate('/')}
            className="bg-slate-900 hover:bg-slate-800 text-white px-3 lg:px-4 py-2 rounded-xl font-bold shadow-lg transition-all flex items-center gap-1 text-xs lg:text-sm"
          >
            <span className="material-symbols-outlined text-base lg:text-lg">check</span>
            <span className="hidden sm:inline">สรุปผล</span>
          </button>
        </div>
      </header>

      {/* Mobile: Selected note indicator */}
      {selectedNoteId && (
        <div className="lg:hidden bg-amber-50 border-b border-amber-200 px-4 py-2 text-center">
          <p className="text-xs text-amber-700 font-bold">
            📌 เลือกแล้ว! แตะช่องที่ต้องการย้ายไป
          </p>
        </div>
      )}

      {/* 4 Quadrants - 2x2 grid on mobile, 1x4 on desktop */}
      <div className="flex-1 grid grid-cols-2 grid-rows-2 lg:grid-cols-4 lg:grid-rows-1 gap-0.5 lg:gap-1 overflow-hidden">
        {quadrantConfig.map(({ q, title, desc, borderColor, bgColor }) => (
          <div
            key={q}
            onDrop={(e) => handleDrop(e, q)}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => handleQuadrantClick(q)}
            className={`
              ${bgColor} ${borderColor} border lg:border-2 p-2 lg:p-4 overflow-auto relative
              ${selectedNoteId ? 'cursor-pointer hover:brightness-95 active:brightness-90' : ''}
            `}
          >
            {/* Quadrant Header - Compact */}
            <div className="sticky top-0 bg-white/90 backdrop-blur-sm rounded px-2 py-1 lg:px-3 lg:py-2 mb-2 lg:mb-3 shadow-sm z-10">
              <h3 className="font-bold text-slate-800 text-[10px] lg:text-sm">{title}</h3>
              <p className="text-[8px] lg:text-[10px] text-slate-500 hidden lg:block">{desc}</p>
            </div>

            {/* Notes Grid - 2 cols always */}
            <div className="grid grid-cols-2 gap-1 lg:gap-3 auto-rows-max">
              {getSolutionsByQuadrant(q).map(note => (
                <div
                  key={note.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNoteClick(note.id);
                  }}
                  className={`${selectedNoteId === note.id ? 'ring-2 ring-primary ring-offset-2 scale-105' : ''} transition-all`}
                >
                  <StickyNote
                    note={note}
                    isDraggable
                    onDragStart={handleDragStart}
                    onMergeHold={handleMergeHold}
                    onLinkClick={handleLinkClick}
                    onCompleteClick={handleCompleteClick}
                    showLinkButton
                    showCompleteButton
                    showCategory={false}
                  />
                </div>
              ))}
            </div>

            {/* Empty State */}
            {getSolutionsByQuadrant(q).length === 0 && (
              <div className="flex items-center justify-center text-slate-300 font-bold text-xs border-2 border-dashed border-slate-200 rounded-xl h-24 mt-4">
                ลากมาวางที่นี่
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Unsorted Notes + Input Bar at Bottom */}
      <div className="bg-slate-100 border-t-2 border-slate-300 p-2 lg:p-3 shrink-0">
        <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-4">
          {/* Add new solution */}
          <form onSubmit={handleAddSolution} className="flex-1 flex gap-2">
            <input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="พิมพ์ทางออกใหม่..."
              className="flex-1 bg-white border border-slate-200 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="bg-primary text-white px-4 py-2 rounded-lg font-bold text-sm disabled:opacity-50"
            >
              <span className="material-symbols-outlined">add</span>
            </button>
          </form>

          {/* Unsorted count - right on mobile */}
          <div className="flex justify-end lg:justify-start">
            <span className="bg-slate-200 text-slate-600 px-2 py-1 rounded-full text-xs font-bold">
              📥 รอจัด: {getSolutionsByQuadrant('Unsorted').length}
            </span>
          </div>
        </div>

        {/* Unsorted notes - Always visible */}
        <div className="flex gap-2 lg:gap-3 overflow-x-auto pb-1 mt-2 lg:mt-3 min-h-[80px] lg:min-h-[140px]">
          {getSolutionsByQuadrant('Unsorted').map(note => (
            <StickyNote
              key={note.id}
              note={note}
              isDraggable
              onDragStart={handleDragStart}
              onMergeHold={handleMergeHold}
              onLinkClick={handleLinkClick}
              showLinkButton
            />
          ))}
          {getSolutionsByQuadrant('Unsorted').length === 0 && (
            <div className="flex items-center justify-center text-slate-400 text-sm w-full">
              🎉 จัดครบแล้ว!
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SolutionMatrix;
