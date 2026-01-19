import React from 'react';

interface PendingApprovalScreenProps {
    userName: string;
}

const PendingApprovalScreen: React.FC<PendingApprovalScreenProps> = ({ userName }) => {
    return (
        <div className="fixed inset-0 bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center z-50">
            <div className="bg-white rounded-3xl shadow-2xl p-12 max-w-md w-full mx-4 text-center">
                {/* Animated waiting icon */}
                <div className="w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                    <span className="material-symbols-outlined text-5xl text-amber-600">hourglass_top</span>
                </div>

                <h2 className="text-2xl font-bold text-slate-800 mb-2">รอการอนุมัติ</h2>
                <p className="text-slate-500 mb-6">
                    สวัสดี <span className="font-bold text-slate-700">{userName}</span>!<br />
                    บัญชีของคุณกำลังรอการอนุมัติจากผู้ดูแลระบบ
                </p>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                    <div className="flex items-center gap-3 justify-center">
                        <span className="material-symbols-outlined text-amber-600">info</span>
                        <p className="text-amber-800 text-sm">
                            หน้านี้จะอัพเดทอัตโนมัติเมื่อได้รับการอนุมัติ
                        </p>
                    </div>
                </div>

                {/* Loading animation */}
                <div className="flex items-center justify-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
            </div>
        </div>
    );
};

export default PendingApprovalScreen;
