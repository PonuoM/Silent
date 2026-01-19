import React, { useEffect, useState } from 'react';
import { useSession, User } from '../context/SessionContext';

const AdminApproval: React.FC = () => {
    const { pendingUsers, approveUser, deletePendingUser, refreshPendingUsers, currentUser } = useSession();
    const [selectedRoles, setSelectedRoles] = useState<Record<string, 'USER' | 'ADMIN'>>({});

    useEffect(() => {
        refreshPendingUsers();
    }, []);

    // Only admin can access this page
    if (currentUser?.role !== 'ADMIN') {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <span className="material-symbols-outlined text-6xl text-red-400">block</span>
                    <p className="text-xl font-bold text-slate-700 mt-4">ไม่มีสิทธิ์เข้าถึง</p>
                    <p className="text-slate-500">หน้านี้สำหรับผู้ดูแลระบบเท่านั้น</p>
                </div>
            </div>
        );
    }

    const handleApprove = (userId: string) => {
        const role = selectedRoles[userId] || 'USER';
        approveUser(userId, role);
    };

    const toggleRole = (userId: string) => {
        setSelectedRoles(prev => ({
            ...prev,
            [userId]: prev[userId] === 'ADMIN' ? 'USER' : 'ADMIN'
        }));
    };

    return (
        <div className="p-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <span className="material-symbols-outlined text-3xl text-primary">admin_panel_settings</span>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">อนุมัติผู้ใช้งาน</h1>
                        <p className="text-slate-500">
                            {pendingUsers.length > 0
                                ? `มี ${pendingUsers.length} คนรอการอนุมัติ`
                                : 'ไม่มีผู้ใช้รอการอนุมัติ'}
                        </p>
                    </div>
                </div>

                {/* Pending Users List */}
                {pendingUsers.length > 0 ? (
                    <div className="space-y-4">
                        {pendingUsers.map((user) => (
                            <div
                                key={user.id}
                                className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                                            <span className="material-symbols-outlined text-amber-600">person</span>
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800">{user.name}</p>
                                            <p className="text-sm text-slate-500">
                                                📱 {user.phone || 'ไม่ระบุเบอร์โทร'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        {/* Role selector */}
                                        <div className="flex items-center gap-2 bg-slate-100 rounded-xl p-1">
                                            <button
                                                onClick={() => setSelectedRoles(prev => ({ ...prev, [user.id]: 'USER' }))}
                                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${selectedRoles[user.id] !== 'ADMIN'
                                                    ? 'bg-white shadow text-slate-800'
                                                    : 'text-slate-500 hover:text-slate-700'
                                                    }`}
                                            >
                                                👤 ผู้ใช้
                                            </button>
                                            <button
                                                onClick={() => setSelectedRoles(prev => ({ ...prev, [user.id]: 'ADMIN' }))}
                                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${selectedRoles[user.id] === 'ADMIN'
                                                    ? 'bg-amber-500 text-white shadow'
                                                    : 'text-slate-500 hover:text-slate-700'
                                                    }`}
                                            >
                                                👑 ผู้ดูแล
                                            </button>
                                        </div>

                                        {/* Action buttons */}
                                        <button
                                            onClick={() => handleApprove(user.id)}
                                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500 text-white font-medium hover:bg-green-600 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">check</span>
                                            อนุมัติ
                                        </button>
                                        <button
                                            onClick={() => deletePendingUser(user.id)}
                                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-500 text-white font-medium hover:bg-slate-600 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">delete</span>
                                            ลบ
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center">
                        <span className="material-symbols-outlined text-6xl text-slate-300">check_circle</span>
                        <p className="text-xl font-medium text-slate-600 mt-4">ไม่มีผู้ใช้รอการอนุมัติ</p>
                        <p className="text-slate-400 mt-2">เมื่อมีผู้ใช้ลงทะเบียนใหม่ จะแสดงที่นี่</p>
                    </div>
                )}

                {/* Info box */}
                <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                        <span className="material-symbols-outlined text-blue-600">info</span>
                        <div className="text-sm text-blue-800">
                            <p className="font-medium">เกี่ยวกับบทบาท:</p>
                            <ul className="mt-1 space-y-1 list-disc list-inside">
                                <li><strong>👤 ผู้ใช้</strong> - สามารถเพิ่มโน้ต จัดกลุ่ม และระดมสมองได้</li>
                                <li><strong>👑 ผู้ดูแล</strong> - สามารถทำทุกอย่าง + อนุมัติผู้ใช้ใหม่</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminApproval;
