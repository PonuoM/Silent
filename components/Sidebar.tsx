import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useSession } from '../context/SessionContext';
import SessionSelector from './SessionSelector';

const Sidebar: React.FC = () => {
  const {
    currentUser,
    logout,
    pendingUsers,
    refreshPendingUsers,
    sidebarCollapsed,
    toggleSidebar
  } = useSession();

  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  // Close sidebar when route changes (mobile)
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  // Load pending users when admin logs in
  useEffect(() => {
    if (currentUser?.role === 'ADMIN') {
      refreshPendingUsers();
    }
  }, [currentUser?.role]);

  const navItems = [
    { icon: 'dashboard', label: 'ภาพรวม', to: '/' },
    { icon: 'lightbulb', label: 'ระดมสมอง', to: '/brainstorm' },
    { icon: 'grid_view', label: 'จัดกลุ่มปัญหา', to: '/problem-matrix' },
    { icon: 'check_circle', label: 'หาทางออก', to: '/solution-matrix' },
    { icon: 'view_comfy', label: 'Matrix รวม', to: '/combined-matrix' },
  ];

  // Add admin menu item if user is admin
  if (currentUser?.role === 'ADMIN') {
    navItems.push({ icon: 'admin_panel_settings', label: 'อนุมัติผู้ใช้', to: '/admin/approval' });
  }

  return (
    <>
      {/* Hamburger Button - Mobile Only - Top Left Corner */}
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed top-2 left-2 z-50 w-10 h-10 bg-white/80 backdrop-blur-sm rounded-lg flex items-center justify-center border border-slate-200"
      >
        <span className="material-symbols-outlined text-slate-700">menu</span>
      </button>

      {/* Overlay - Mobile Only */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="lg:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:relative inset-y-0 left-0
        ${sidebarCollapsed ? 'lg:w-20' : 'lg:w-64'} w-72
        bg-white border-r border-slate-200 
        flex flex-col justify-between z-50
        transform transition-all duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        h-full
      `}>
        <div className="p-4 lg:p-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-8 justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
                <span className="material-symbols-outlined text-white">bolt</span>
              </div>
              {!sidebarCollapsed && (
                <h1 className="font-bold text-slate-900 leading-tight text-lg hidden lg:block">Silent<br />Brainstorm</h1>
              )}
              <h1 className="font-bold text-slate-900 leading-tight text-lg lg:hidden">Silent<br />Brainstorm</h1>
            </div>
            {/* Close button - Mobile Only */}
            <button
              onClick={() => setIsOpen(false)}
              className="lg:hidden w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-slate-500 text-[18px]">close</span>
            </button>
            {/* Collapse button - Desktop Only */}
            <button
              onClick={toggleSidebar}
              className="hidden lg:flex w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 items-center justify-center"
              title={sidebarCollapsed ? 'ขยาย' : 'ย่อ'}
            >
              <span className="material-symbols-outlined text-slate-500 text-[18px]">
                {sidebarCollapsed ? 'chevron_right' : 'chevron_left'}
              </span>
            </button>
          </div>

          {/* Navigation */}
          <nav className="space-y-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `
                  relative flex items-center gap-3 px-3 py-3 rounded-xl transition-all
                  ${sidebarCollapsed ? 'lg:justify-center' : ''}
                  ${isActive
                    ? 'bg-primary text-white shadow-md shadow-primary/20'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}
                `}
                title={sidebarCollapsed ? item.label : ''}
              >
                <span className="material-symbols-outlined text-[24px]">{item.icon}</span>
                {!sidebarCollapsed && (
                  <span className="font-medium text-base hidden lg:block">{item.label}</span>
                )}
                <span className="font-medium text-base lg:hidden">{item.label}</span>
                {/* Badge for pending users */}
                {item.to === '/admin/approval' && pendingUsers.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {pendingUsers.length}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Session Selector */}
          {!sidebarCollapsed && (
            <div className="mt-6 hidden lg:block">
              <SessionSelector />
            </div>
          )}
          <div className="mt-6 lg:hidden">
            <SessionSelector />
          </div>
        </div>

        {/* User section */}
        <div className={`p-4 lg:p-6 border-t border-slate-100 ${sidebarCollapsed ? 'lg:flex lg:flex-col lg:items-center' : ''}`}>
          {currentUser ? (
            <div className={`space-y-3 ${sidebarCollapsed ? 'lg:flex lg:flex-col lg:items-center' : ''}`}>
              <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'lg:justify-center' : ''}`}>
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-primary">person</span>
                </div>
                {!sidebarCollapsed && (
                  <div className="overflow-hidden flex-1 hidden lg:block">
                    <p className="text-sm font-bold text-slate-900 truncate">{currentUser.name}</p>
                    <p className="text-xs text-slate-500">
                      {currentUser.role === 'ADMIN' ? '👑 ผู้ดูแลระบบ' : '👤 ผู้ใช้งาน'}
                    </p>
                  </div>
                )}
                <div className="overflow-hidden flex-1 lg:hidden">
                  <p className="text-sm font-bold text-slate-900 truncate">{currentUser.name}</p>
                  <p className="text-xs text-slate-500">
                    {currentUser.role === 'ADMIN' ? '👑 ผู้ดูแลระบบ' : '👤 ผู้ใช้งาน'}
                  </p>
                </div>
              </div>
              {/* Logout button */}
              <button
                onClick={logout}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors ${sidebarCollapsed ? 'lg:justify-center' : ''}`}
                title={sidebarCollapsed ? 'ออกจากระบบ' : ''}
              >
                <span className="material-symbols-outlined text-[20px]">logout</span>
                {!sidebarCollapsed && (
                  <span className="text-sm font-medium hidden lg:inline">ออกจากระบบ</span>
                )}
                <span className="text-sm font-medium lg:hidden">ออกจากระบบ</span>
              </button>
            </div>
          ) : (
            <div className="text-center text-sm text-slate-400">
              {!sidebarCollapsed && 'ยังไม่ได้เข้าสู่ระบบ'}
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
