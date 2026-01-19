import React, { useState } from 'react';
import { User } from '../context/SessionContext';

interface UserRegistrationModalProps {
    onRegister: (user: { id: string; name: string; phone: string }) => Promise<User | null>;
    onLogin: (phone: string) => Promise<User | null>;
}

const UserRegistrationModal: React.FC<UserRegistrationModalProps> = ({ onRegister, onLogin }) => {
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!phone.trim() || isLoading) return;

        setIsLoading(true);
        setError('');

        const user = await onLogin(phone.trim());

        if (!user) {
            // User not found - switch to register mode
            setError('ไม่พบเบอร์นี้ในระบบ กรุณาลงทะเบียน');
            setMode('register');
            setIsLoading(false);
        }
        // If user found, modal will unmount automatically
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !phone.trim() || isLoading) return;

        setIsLoading(true);
        setError('');

        const user = {
            id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: name.trim(),
            phone: phone.trim(),
        };

        await onRegister(user);
        // Modal will unmount after registration
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="material-symbols-outlined text-4xl text-primary">
                            {mode === 'login' ? 'login' : 'person_add'}
                        </span>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800">
                        {mode === 'login' ? 'เข้าสู่ระบบ' : 'ลงทะเบียน'}
                    </h2>
                    <p className="text-slate-500 mt-2">
                        {mode === 'login'
                            ? 'กรอกเบอร์โทรศัพท์เพื่อเข้าสู่ระบบ'
                            : 'กรอกข้อมูลเพื่อลงทะเบียนใหม่'}
                    </p>
                </div>

                {error && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-amber-600">info</span>
                        <p className="text-amber-800 text-sm">{error}</p>
                    </div>
                )}

                {mode === 'login' ? (
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                เบอร์โทรศัพท์ <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="เช่น 0812345678"
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                required
                                autoFocus
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={!phone.trim() || isLoading}
                            className="w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <span className="animate-spin">⏳</span>
                                    กำลังตรวจสอบ...
                                </>
                            ) : (
                                'เข้าสู่ระบบ'
                            )}
                        </button>

                        <div className="text-center">
                            <button
                                type="button"
                                onClick={() => { setMode('register'); setError(''); }}
                                className="text-primary hover:underline text-sm"
                            >
                                ยังไม่มีบัญชี? ลงทะเบียนใหม่
                            </button>
                        </div>
                    </form>
                ) : (
                    <form onSubmit={handleRegister} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                ชื่อ-นามสกุล <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="เช่น สมชาย ใจดี"
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                required
                                autoFocus
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                เบอร์โทรศัพท์ <span className="text-red-500">*</span>
                                <span className="text-slate-400 text-xs ml-1">(ใช้สำหรับเข้าสู่ระบบครั้งถัดไป)</span>
                            </label>
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="เช่น 0812345678"
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={!name.trim() || !phone.trim() || isLoading}
                            className="w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <span className="animate-spin">⏳</span>
                                    กำลังลงทะเบียน...
                                </>
                            ) : (
                                'ลงทะเบียน'
                            )}
                        </button>

                        <div className="text-center">
                            <button
                                type="button"
                                onClick={() => { setMode('login'); setError(''); }}
                                className="text-primary hover:underline text-sm"
                            >
                                มีบัญชีอยู่แล้ว? เข้าสู่ระบบ
                            </button>
                        </div>
                    </form>
                )}

                <p className="text-center text-xs text-slate-400 mt-4">
                    🔒 ข้อมูลของคุณจะไม่ถูกแสดงต่อผู้อื่นระหว่างกิจกรรม
                </p>
            </div>
        </div>
    );
};

export default UserRegistrationModal;
