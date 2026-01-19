import React, { useState } from 'react';
import { useSession } from '../context/SessionContext';
import StickyNote from '../components/StickyNote';
import { Note, NoteType, NoteStatus, Quadrant } from '../types';

// Quadrant configurations
const SOLUTION_QUADRANTS = [
    { id: Quadrant.Q1, label: 'ผลลัพธ์สูง / ทำง่าย', icon: 'star', color: 'bg-emerald-500', bgColor: 'bg-emerald-50' },
    { id: Quadrant.Q2, label: 'ผลลัพธ์สูง / ทำยาก', icon: 'trending_up', color: 'bg-blue-500', bgColor: 'bg-blue-50' },
    { id: Quadrant.Q3, label: 'ผลลัพธ์ต่ำ / ทำง่าย', icon: 'check_circle', color: 'bg-teal-500', bgColor: 'bg-teal-50' },
    { id: Quadrant.Q4, label: 'ผลลัพธ์ต่ำ / ทำยาก', icon: 'cancel', color: 'bg-slate-400', bgColor: 'bg-slate-50' },
];

const PROBLEM_QUADRANTS = [
    { id: Quadrant.Q1, label: 'รุนแรง / เร่งด่วน', icon: 'error', color: 'bg-red-500', bgColor: 'bg-red-50' },
    { id: Quadrant.Q2, label: 'รุนแรง / ไม่เร่งด่วน', icon: 'warning', color: 'bg-orange-500', bgColor: 'bg-orange-50' },
    { id: Quadrant.Q3, label: 'ไม่รุนแรง / เร่งด่วน', icon: 'schedule', color: 'bg-amber-500', bgColor: 'bg-amber-50' },
    { id: Quadrant.Q4, label: 'ไม่รุนแรง / ไม่เร่งด่วน', icon: 'inventory', color: 'bg-yellow-400', bgColor: 'bg-yellow-50' },
];

const CombinedMatrix: React.FC = () => {
    const { notes, updateNoteQuadrant, currentUser } = useSession();
    const [draggedNote, setDraggedNote] = useState<Note | null>(null);

    // Filter notes by type and status
    const problemNotes = notes.filter(n =>
        n.type === NoteType.Problem &&
        n.status !== NoteStatus.Merged &&
        n.status !== 'MERGED' as any
    );

    const solutionNotes = notes.filter(n =>
        n.type === NoteType.Solution &&
        n.status !== NoteStatus.Merged &&
        n.status !== 'MERGED' as any
    );

    // Get notes for a specific quadrant
    const getNotesForQuadrant = (noteList: Note[], quadrant: Quadrant) => {
        return noteList.filter(n => n.quadrant === quadrant);
    };

    const handleDragStart = (note: Note) => {
        setDraggedNote(note);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (quadrant: Quadrant, noteType: NoteType) => {
        if (draggedNote && draggedNote.type === noteType) {
            updateNoteQuadrant(draggedNote.id, quadrant);
        }
        setDraggedNote(null);
    };

    const renderQuadrant = (
        config: typeof SOLUTION_QUADRANTS[0],
        noteList: Note[],
        noteType: NoteType,
        cardColor: string
    ) => {
        const quadrantNotes = getNotesForQuadrant(noteList, config.id);

        return (
            <div
                key={config.id}
                className={`${config.bgColor} rounded-xl p-3 min-h-[150px] transition-all ${draggedNote?.type === noteType ? 'ring-2 ring-primary ring-opacity-50' : ''
                    }`}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(config.id, noteType)}
            >
                {/* Quadrant Header */}
                <div className="flex items-center gap-2 mb-2">
                    <div className={`w-6 h-6 ${config.color} rounded-lg flex items-center justify-center`}>
                        <span className="material-symbols-outlined text-white text-sm">{config.icon}</span>
                    </div>
                    <span className="text-xs font-bold text-slate-700">{config.label}</span>
                    <span className="ml-auto text-xs text-slate-400 bg-white px-2 py-0.5 rounded-full">
                        {quadrantNotes.length}
                    </span>
                </div>

                {/* Notes Grid */}
                <div className="space-y-2">
                    {quadrantNotes.map(note => (
                        <div
                            key={note.id}
                            draggable
                            onDragStart={() => handleDragStart(note)}
                            className="cursor-grab active:cursor-grabbing"
                        >
                            <div className={`${cardColor} rounded-lg p-2 shadow-sm hover:shadow-md transition-shadow border-l-4 ${noteType === NoteType.Problem ? 'border-orange-400' : 'border-blue-400'
                                }`}>
                                <p className="text-xs text-slate-700 line-clamp-2">{note.content}</p>
                            </div>
                        </div>
                    ))}

                    {quadrantNotes.length === 0 && (
                        <div className="text-center py-4 text-slate-400 text-xs">
                            ลากโน้ตมาวางที่นี่
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // Unsorted notes (haven't been categorized yet)
    const unsortedProblems = problemNotes.filter(n => n.quadrant === Quadrant.Unsorted);
    const unsortedSolutions = solutionNotes.filter(n => n.quadrant === Quadrant.Unsorted);

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50">
            {/* Header */}
            <div className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0">
                <div>
                    <h2 className="text-lg font-bold text-slate-900">Matrix รวม: ปัญหา + ทางแก้</h2>
                    <p className="text-xs text-slate-500">
                        ปัญหา {problemNotes.length} รายการ • ทางแก้ {solutionNotes.length} รายการ
                    </p>
                </div>
            </div>

            {/* Main Content - Two Rows */}
            <div className="flex-1 overflow-auto p-4 space-y-4">

                {/* Row 1: Solutions (Blue theme) */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 bg-blue-500 rounded-xl flex items-center justify-center">
                            <span className="material-symbols-outlined text-white">lightbulb</span>
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800">💡 ทางแก้ไข</h3>
                            <p className="text-xs text-slate-500">จัดกลุ่มตามผลลัพธ์และความยากง่าย</p>
                        </div>
                        {/* Unsorted badge */}
                        {unsortedSolutions.length > 0 && (
                            <span className="ml-auto bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full">
                                รอจัดกลุ่ม: {unsortedSolutions.length}
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-4 gap-3">
                        {SOLUTION_QUADRANTS.map(q => renderQuadrant(q, solutionNotes, NoteType.Solution, 'bg-blue-50'))}
                    </div>

                    {/* Unsorted Solutions */}
                    {unsortedSolutions.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-slate-100">
                            <p className="text-xs font-medium text-slate-500 mb-2">📥 ยังไม่จัดกลุ่ม:</p>
                            <div className="flex flex-wrap gap-2">
                                {unsortedSolutions.map(note => (
                                    <div
                                        key={note.id}
                                        draggable
                                        onDragStart={() => handleDragStart(note)}
                                        className="bg-blue-100 text-blue-800 text-xs px-3 py-1.5 rounded-lg cursor-grab hover:shadow-md transition-shadow"
                                    >
                                        {note.content.length > 30 ? note.content.substring(0, 30) + '...' : note.content}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Row 2: Problems (Orange theme) */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 bg-orange-500 rounded-xl flex items-center justify-center">
                            <span className="material-symbols-outlined text-white">warning</span>
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800">🔴 ปัญหา</h3>
                            <p className="text-xs text-slate-500">จัดกลุ่มตามความรุนแรงและความเร่งด่วน</p>
                        </div>
                        {/* Unsorted badge */}
                        {unsortedProblems.length > 0 && (
                            <span className="ml-auto bg-orange-100 text-orange-700 text-xs font-bold px-2 py-1 rounded-full">
                                รอจัดกลุ่ม: {unsortedProblems.length}
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-4 gap-3">
                        {PROBLEM_QUADRANTS.map(q => renderQuadrant(q, problemNotes, NoteType.Problem, 'bg-orange-50'))}
                    </div>

                    {/* Unsorted Problems */}
                    {unsortedProblems.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-slate-100">
                            <p className="text-xs font-medium text-slate-500 mb-2">📥 ยังไม่จัดกลุ่ม:</p>
                            <div className="flex flex-wrap gap-2">
                                {unsortedProblems.map(note => (
                                    <div
                                        key={note.id}
                                        draggable
                                        onDragStart={() => handleDragStart(note)}
                                        className="bg-orange-100 text-orange-800 text-xs px-3 py-1.5 rounded-lg cursor-grab hover:shadow-md transition-shadow"
                                    >
                                        {note.content.length > 30 ? note.content.substring(0, 30) + '...' : note.content}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CombinedMatrix;
