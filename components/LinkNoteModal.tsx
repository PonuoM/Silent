import React, { useState } from 'react';
import { Note, NoteType, NoteStatus } from '../types';

interface LinkNoteModalProps {
    currentNote: Note;
    allNotes: Note[];
    linkedNoteIds: string[];
    onLink: (noteId: string) => void;
    onUnlink: (noteId: string) => void;
    onClose: () => void;
}

const LinkNoteModal: React.FC<LinkNoteModalProps> = ({
    currentNote,
    allNotes,
    linkedNoteIds,
    onLink,
    onUnlink,
    onClose,
}) => {
    // Show opposite type notes (Problem shows Solutions, Solution shows Problems)
    const oppositeType = currentNote.type === NoteType.Problem ? NoteType.Solution : NoteType.Problem;
    const availableNotes = allNotes.filter(
        n => n.type === oppositeType &&
            n.status !== NoteStatus.Merged &&
            n.id !== currentNote.id
    );

    const typeLabel = oppositeType === NoteType.Problem ? 'ปัญหา' : 'ทางออก';

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-[fade-in_0.2s_ease-out]">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden animate-[pop-in_0.3s_ease-out]">
                {/* Header */}
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-100">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">link</span>
                            <h3 className="font-bold text-slate-800 text-lg">เชื่อมโยงกับ{typeLabel}</h3>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center transition-colors"
                        >
                            <span className="material-symbols-outlined text-slate-500">close</span>
                        </button>
                    </div>

                    {/* Current Note Preview */}
                    <div className="mt-3 p-3 bg-white rounded-lg border border-slate-200">
                        <span className="text-xs font-bold text-slate-400 uppercase">
                            {currentNote.type === NoteType.Problem ? 'ปัญหา' : 'ทางออก'}
                        </span>
                        <p className="text-sm text-slate-700 mt-1 line-clamp-2">{currentNote.content}</p>
                    </div>
                </div>

                {/* Notes List */}
                <div className="max-h-[400px] overflow-y-auto p-4 space-y-2">
                    {availableNotes.length === 0 ? (
                        <p className="text-center text-slate-400 py-8">
                            ยังไม่มี{typeLabel}ให้เชื่อมโยง
                        </p>
                    ) : (
                        availableNotes.map((note) => {
                            const isLinked = linkedNoteIds.includes(note.id);
                            return (
                                <div
                                    key={note.id}
                                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${isLinked
                                            ? 'border-primary bg-primary/5'
                                            : 'border-slate-100 hover:border-slate-300'
                                        }`}
                                    onClick={() => isLinked ? onUnlink(note.id) : onLink(note.id)}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-slate-800">{note.content}</p>
                                            <p className="text-xs text-slate-400 mt-1">โดย {note.author}</p>
                                        </div>
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${isLinked
                                                ? 'bg-primary border-primary'
                                                : 'border-slate-300'
                                            }`}>
                                            {isLinked && (
                                                <span className="material-symbols-outlined text-white text-sm">check</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-between items-center">
                    <span className="text-sm text-slate-500">
                        เชื่อมโยงแล้ว: <strong className="text-primary">{linkedNoteIds.length}</strong> {typeLabel}
                    </span>
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:bg-primary-dark transition-colors"
                    >
                        เสร็จสิ้น
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LinkNoteModal;
