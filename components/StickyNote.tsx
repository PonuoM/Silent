import React, { useState, useRef, useEffect } from 'react';
import { Note, NoteStatus } from '../types';

// Global variable to track currently dragged note ID
let currentDraggedNoteId: string | null = null;

interface StickyNoteProps {
  note: Note;
  isDraggable?: boolean;
  onDragStart?: (e: React.DragEvent, id: string) => void;
  className?: string;
  showCategory?: boolean;
  onMergeHold?: (sourceId: string, targetNote: Note, position: { x: number; y: number }) => void;
  onLinkClick?: (note: Note) => void;
  onCompleteClick?: (note: Note) => void;
  showLinkButton?: boolean;
  showCompleteButton?: boolean;
}

const HOLD_DURATION = 2000;

const StickyNote: React.FC<StickyNoteProps> = ({
  note,
  isDraggable = false,
  onDragStart,
  className = "",
  showCategory = true,
  onMergeHold,
  onLinkClick,
  onCompleteClick,
  showLinkButton = false,
  showCompleteButton = false,
}) => {
  const [isHoveringWithDrag, setIsHoveringWithDrag] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [mergeTriggered, setMergeTriggered] = useState(false); // Prevent double trigger
  const holdTimerRef = useRef<number | null>(null);
  const progressIntervalRef = useRef<number | null>(null);
  const noteRef = useRef<HTMLDivElement>(null);

  // Post-it colors by category (CSS-based, no images)
  const categoryStyles: Record<string, { bg: string; border: string; text: string }> = {
    'Customer': { bg: 'bg-yellow-200', border: 'border-yellow-300', text: 'text-yellow-900' },
    'Process': { bg: 'bg-sky-200', border: 'border-sky-300', text: 'text-sky-900' },
    'Tools': { bg: 'bg-pink-200', border: 'border-pink-300', text: 'text-pink-900' },
    'People': { bg: 'bg-lime-200', border: 'border-lime-300', text: 'text-lime-900' },
  };

  const categoryLabels: Record<string, string> = {
    'Customer': 'ลูกค้า',
    'Process': 'กระบวนการ',
    'Tools': 'เครื่องมือ',
    'People': 'ทีมงาน',
  };

  const style = categoryStyles[note.category] || categoryStyles['Customer'];

  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, []);

  const handleDragStart = (e: React.DragEvent) => {
    currentDraggedNoteId = note.id;
    e.dataTransfer.setData('text/plain', note.id);
    e.dataTransfer.effectAllowed = 'move';
    onDragStart && onDragStart(e, note.id);
  };

  const handleDragEnd = () => {
    currentDraggedNoteId = null;
    cancelHold();
    setMergeTriggered(false); // Reset for next drag
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (currentDraggedNoteId === note.id || !currentDraggedNoteId) return;
    // Don't start timer if merge already triggered for this hover
    if (mergeTriggered) return;
    if (!isHoveringWithDrag) {
      setIsHoveringWithDrag(true);
      startHoldTimer();
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    const rect = noteRef.current?.getBoundingClientRect();
    if (rect) {
      const { clientX, clientY } = e;
      if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
        cancelHold();
        setMergeTriggered(false); // Reset when leaving
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    // Prevent default drop behavior - note should NOT move on drop
    // Only merge confirmation should trigger the actual merge
    cancelHold();
  };

  const startHoldTimer = () => {
    const rect = noteRef.current?.getBoundingClientRect();
    if (!rect || !currentDraggedNoteId) return;

    const startTime = Date.now();
    progressIntervalRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / HOLD_DURATION) * 100, 100);
      setHoldProgress(progress);
    }, 50);

    holdTimerRef.current = window.setTimeout(() => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      setHoldProgress(100); // Keep at 100%
      setMergeTriggered(true); // Mark as triggered - won't restart

      const position = { x: rect.left + rect.width / 2, y: rect.top };
      if (onMergeHold && currentDraggedNoteId && currentDraggedNoteId !== note.id) {
        onMergeHold(currentDraggedNoteId, note, position);
      }
      // Don't call cancelHold() here - keep the visual state
      setIsHoveringWithDrag(false);
    }, HOLD_DURATION);
  };

  const cancelHold = () => {
    setIsHoveringWithDrag(false);
    setHoldProgress(0);
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  if (note.status === NoteStatus.Merged || note.status === 'MERGED' as any) {
    return null;
  }

  return (
    <div
      ref={noteRef}
      draggable={isDraggable}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative w-16 h-16 lg:w-32 lg:h-32 p-1.5 lg:p-3 ${style.bg} ${style.text} border-b-2 ${style.border}
        flex flex-col overflow-visible
        transition-all duration-200 ease-in-out
        ${isDraggable ? 'cursor-grab active:cursor-grabbing hover:-translate-y-1 hover:rotate-1' : ''}
        ${isHoveringWithDrag ? 'ring-2 ring-primary scale-105' : ''}
        ${note.status === NoteStatus.Resolved ? 'opacity-50' : ''}
        ${className}
      `}
      style={{
        boxShadow: '2px 4px 8px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.1)',
        transform: `rotate(${(Math.random() - 0.5) * 4}deg)`,
      }}
    >
      {/* Category */}
      {showCategory && (
        <span className="text-[8px] lg:text-[9px] uppercase font-bold tracking-wide opacity-60 mb-1">
          {categoryLabels[note.category] || note.category}
        </span>
      )}

      {/* Content */}
      <p className={`text-[7px] lg:text-[11px] font-medium leading-tight flex-1 overflow-hidden ${note.status === NoteStatus.Resolved ? 'line-through' : ''}`}>
        {note.content.length > 20 ? note.content.substring(0, 20) + '...' : note.content}
      </p>

      {/* Linked notes badge - hidden on mobile */}
      {note.linkedNoteIds && note.linkedNoteIds.length > 0 && (
        <span className="hidden lg:inline-block text-[9px] bg-primary/20 text-primary font-bold px-1.5 py-0.5 rounded mt-1">
          🔗 {note.linkedNoteIds.length}
        </span>
      )}

      {/* Merged badge - hidden on mobile */}
      {note.mergedFromIds && note.mergedFromIds.length > 0 && (
        <span className="hidden lg:inline-block text-[8px] opacity-60 mt-1">
          📎 +{note.mergedFromIds.length}
        </span>
      )}

      {/* Hold Progress */}
      {isHoveringWithDrag && holdProgress > 0 && (
        <div className="absolute inset-x-0 bottom-0 h-1 bg-primary/30">
          <div className="h-full bg-primary transition-all" style={{ width: `${holdProgress}%` }} />
        </div>
      )}

      {/* Action buttons */}
      {(showLinkButton || showCompleteButton) && (
        <div className="absolute bottom-1 right-1 flex gap-1 z-50">
          {showLinkButton && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); onLinkClick?.(note); }}
              onMouseDown={(e) => e.stopPropagation()}
              className="w-6 h-6 rounded-full bg-white shadow-md text-slate-600 hover:bg-primary hover:text-white flex items-center justify-center text-xs cursor-pointer pointer-events-auto"
            >
              🔗
            </button>
          )}
          {showCompleteButton && note.status !== NoteStatus.Resolved && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); onCompleteClick?.(note); }}
              onMouseDown={(e) => e.stopPropagation()}
              className="w-6 h-6 rounded-full bg-white shadow-md text-slate-600 hover:bg-green-500 hover:text-white flex items-center justify-center text-xs cursor-pointer pointer-events-auto"
            >
              ✓
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default StickyNote;
