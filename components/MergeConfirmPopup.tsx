import React from 'react';

interface MergeConfirmPopupProps {
    targetNote: {
        id: string;
        content: string;
    };
    position: { x: number; y: number };
    onConfirm: () => void;
    onCancel: () => void;
}

const MergeConfirmPopup: React.FC<MergeConfirmPopupProps> = ({
    targetNote,
    position,
    onConfirm,
    onCancel,
}) => {
    return (
        <div
            className="fixed z-[100] animate-[pop-in_0.2s_ease-out]"
            style={{
                left: position.x,
                top: position.y,
                transform: 'translate(-50%, -100%)'
            }}
        >
            <div className="bg-white rounded-xl shadow-2xl border border-slate-200 p-4 min-w-[280px]">
                {/* Header */}
                <div className="flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-amber-500">merge</span>
                    <span className="font-bold text-slate-800">รวม Note?</span>
                </div>

                {/* Target Note Preview */}
                <div className="bg-slate-50 rounded-lg p-3 mb-4 border border-slate-100">
                    <p className="text-sm text-slate-600 line-clamp-2">
                        ต้องการรวมกับ: <strong>"{targetNote.content}"</strong>
                    </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                    <button
                        onClick={onCancel}
                        className="flex-1 px-4 py-2 rounded-lg bg-slate-100 text-slate-700 font-bold text-sm hover:bg-slate-200 transition-colors"
                    >
                        ยกเลิก
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 px-4 py-2 rounded-lg bg-primary text-white font-bold text-sm hover:bg-primary-dark transition-colors shadow-lg shadow-primary/20"
                    >
                        รวมเลย
                    </button>
                </div>
            </div>

            {/* Arrow pointing down */}
            <div className="absolute left-1/2 -translate-x-1/2 -bottom-2 w-4 h-4 bg-white border-r border-b border-slate-200 transform rotate-45"></div>
        </div>
    );
};

export default MergeConfirmPopup;
