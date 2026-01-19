import React, { DragEvent, useState } from 'react';
import { useSession } from '../context/SessionContext';
import { Quadrant, NoteType, Note, NoteStatus } from '../types';
import StickyNote from '../components/StickyNote';
import MergeConfirmPopup from '../components/MergeConfirmPopup';
import { useNavigate } from 'react-router-dom';

const ProblemMatrix: React.FC = () => {
  const { notes, updateNoteQuadrant, mergeNotes } = useSession();
  const navigate = useNavigate();

  const [mergePopup, setMergePopup] = useState<{
    sourceId: string;
    targetNote: Note;
    position: { x: number; y: number };
  } | null>(null);

  // Mobile: Selected note for tap-to-move
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  const handleDragStart = (e: DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDrop = (e: DragEvent, quadrant: Quadrant) => {
    e.preventDefault();
    if (mergePopup) return;
    const id = e.dataTransfer.getData('text/plain');
    if (id) {
      updateNoteQuadrant(id, quadrant);
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
  };

  // Mobile: Tap on note to select
  const handleNoteClick = (noteId: string) => {
    if (selectedNoteId === noteId) {
      setSelectedNoteId(null); // Deselect
    } else {
      setSelectedNoteId(noteId);
    }
  };

  // Mobile: Tap on quadrant to move selected note
  const handleQuadrantClick = (quadrant: Quadrant) => {
    if (selectedNoteId) {
      updateNoteQuadrant(selectedNoteId, quadrant);
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

  const handleMergeCancel = () => {
    setMergePopup(null);
  };

  const getNotes = (q: Quadrant) => notes.filter(n =>
    n.type === NoteType.Problem &&
    n.quadrant === q &&
    n.status !== NoteStatus.Merged &&
    n.status !== 'MERGED' as any
  );

  const quadrantConfig = [
    { q: Quadrant.Q1, title: 'ทำทันที', desc: 'รุนแรงมาก / เร่งด่วนมาก', borderColor: 'border-red-400', bgColor: 'bg-red-50' },
    { q: Quadrant.Q2, title: 'วางแผน', desc: 'รุนแรงมาก / ไม่เร่งด่วน', borderColor: 'border-yellow-400', bgColor: 'bg-yellow-50' },
    { q: Quadrant.Q3, title: 'ฝากคนอื่น', desc: 'ไม่รุนแรง / เร่งด่วนมาก', borderColor: 'border-blue-400', bgColor: 'bg-blue-50' },
    { q: Quadrant.Q4, title: 'เลี่ยงได้', desc: 'ไม่รุนแรง / ไม่เร่งด่วน', borderColor: 'border-slate-300', bgColor: 'bg-slate-100' },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-white relative overflow-hidden">
      {/* Merge Popup */}
      {mergePopup && (
        <MergeConfirmPopup
          targetNote={mergePopup.targetNote}
          position={mergePopup.position}
          onConfirm={handleMergeConfirm}
          onCancel={() => setMergePopup(null)}
        />
      )}

      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 lg:px-6 py-3 flex justify-between items-center z-20 shrink-0">
        <div className="pl-10 lg:pl-0">
          <h2 className="text-base lg:text-lg font-bold text-slate-900">ระยะที่ 2: จัดกลุ่ม</h2>
          <p className="text-[10px] lg:text-xs text-slate-500">
            <span className="hidden lg:inline">ลากการ์ดไปวางในกรอบที่ต้องการ</span>
            <span className="lg:hidden">แตะเลือกการ์ด → แตะช่องปลายทาง</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Selected indicator */}
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
            onClick={() => navigate('/solution-matrix')}
            className="bg-primary hover:bg-primary-dark text-white px-3 lg:px-4 py-2 rounded-xl font-bold shadow-lg shadow-primary/20 transition-all flex items-center gap-1 text-xs lg:text-sm"
          >
            <span className="hidden sm:inline">ขั้นตอนถัดไป</span>
            <span className="material-symbols-outlined text-base lg:text-lg">arrow_forward</span>
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
            onDragOver={handleDragOver}
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
              {getNotes(q).map(note => (
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
                    showCategory={false}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Unsorted Notes Section */}
      <div className="bg-slate-100 border-t border-slate-200 p-2 lg:p-4 shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <span className="material-symbols-outlined text-slate-400 text-sm lg:text-base">inbox</span>
          <h3 className="text-xs lg:text-sm font-bold text-slate-600">รอจัดหมวด ({getNotes(Quadrant.Unsorted).length})</h3>
        </div>
        <div className="flex gap-1 lg:gap-3 overflow-x-auto pb-2">
          {getNotes(Quadrant.Unsorted).map(note => (
            <div
              key={note.id}
              onClick={() => handleNoteClick(note.id)}
              className={`shrink-0 ${selectedNoteId === note.id ? 'ring-2 ring-primary ring-offset-2 scale-105' : ''} transition-all`}
            >
              <StickyNote
                note={note}
                isDraggable
                onDragStart={handleDragStart}
                onMergeHold={handleMergeHold}
              />
            </div>
          ))}
          {getNotes(Quadrant.Unsorted).length === 0 && (
            <div className="text-xs text-slate-400 py-4 w-full text-center">
              ไม่มีโน้ตรอจัด
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProblemMatrix;
