import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { CATEGORY_COLORS } from '../constants';
import { useSession, SessionStats } from '../context/SessionContext';
import { NoteType, NoteStatus } from '../types';

const Dashboard: React.FC = () => {
  const {
    notes,
    getSessionStats,
    currentSessionId,
    sessions
  } = useSession();

  const [stats, setStats] = useState<SessionStats | null>(null);
  const [loading, setLoading] = useState(true);

  const currentSession = sessions.find(s => s.id === currentSessionId);

  // Calculate stats from notes (real data)
  useEffect(() => {
    const loadStats = async () => {
      setLoading(true);
      try {
        const sessionStats = await getSessionStats();
        setStats(sessionStats);
      } catch (error) {
        console.error('Failed to load stats:', error);
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, [currentSessionId, notes]);

  // Calculate from local notes as fallback
  const problems = notes.filter(n => n.type === NoteType.Problem && n.status !== NoteStatus.Merged);
  const solutions = notes.filter(n => n.type === NoteType.Solution && n.status !== NoteStatus.Merged);
  const resolvedProblems = problems.filter(n => n.status === NoteStatus.Resolved);
  const activeProblems = problems.filter(n => n.status === NoteStatus.Active);

  const successRate = problems.length > 0
    ? Math.round((resolvedProblems.length / problems.length) * 100)
    : 0;

  const kpiData = [
    {
      label: 'ปัญหาทั้งหมด',
      value: stats?.totalProblems ?? problems.length,
      change: `${solutions.length} ทางออก`,
      color: 'text-slate-900',
      icon: 'bug_report'
    },
    {
      label: 'แก้ไขแล้ว',
      value: stats?.resolvedProblems ?? resolvedProblems.length,
      change: successRate > 50 ? 'ดีมาก!' : 'ทำต่อไป',
      color: 'text-green-600',
      icon: 'check_circle'
    },
    {
      label: 'รอแก้ไข',
      value: stats?.activeProblems ?? activeProblems.length,
      change: activeProblems.length === 0 ? 'เยี่ยม!' : 'กำลังทำ',
      color: 'text-amber-600',
      icon: 'hourglass_top'
    },
    {
      label: 'อัตราความสำเร็จ',
      value: `${successRate}%`,
      change: successRate >= 70 ? 'ยอดเยี่ยม' : successRate >= 50 ? 'ดี' : 'ต้องปรับปรุง',
      color: 'text-primary',
      icon: 'verified'
    },
  ];

  // Category breakdown for pie chart
  const categoryCount = problems.reduce((acc, note) => {
    acc[note.category] = (acc[note.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieData = [
    { name: 'Process', label: 'กระบวนการ', value: categoryCount['Process'] || 0 },
    { name: 'Customer', label: 'ลูกค้า', value: categoryCount['Customer'] || 0 },
    { name: 'Tools', label: 'เครื่องมือ', value: categoryCount['Tools'] || 0 },
    { name: 'People', label: 'บุคลากร', value: categoryCount['People'] || 0 },
  ].filter(d => d.value > 0);

  // Quadrant breakdown for bar chart
  const quadrantLabels: Record<string, string> = {
    'Q1': 'ทำทันที',
    'Q2': 'วางแผน',
    'Q3': 'มอบหมาย',
    'Q4': 'เลี่ยงได้',
    'UNSORTED': 'รอจัด',
  };

  const quadrantCount = problems.reduce((acc, note) => {
    const q = note.quadrant || 'UNSORTED';
    acc[q] = (acc[q] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const barData = Object.entries(quadrantCount).map(([quadrant, count]) => ({
    name: quadrant,
    label: quadrantLabels[quadrant] || quadrant,
    count,
  }));

  // Top problems with solutions
  const topProblems = problems
    .filter(p => p.linkedNoteIds && p.linkedNoteIds.length > 0)
    .slice(0, 5)
    .map(problem => {
      const linkedSolution = notes.find(n => problem.linkedNoteIds.includes(n.id));
      return {
        id: problem.id,
        problem: problem.content.substring(0, 50) + (problem.content.length > 50 ? '...' : ''),
        solution: linkedSolution?.content.substring(0, 50) + (linkedSolution && linkedSolution.content.length > 50 ? '...' : '') || '-',
        status: problem.status,
      };
    });

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-slate-500">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto h-full p-4 lg:p-10">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 lg:mb-8 gap-3 pl-12 lg:pl-0">
        <div>
          <h2 className="text-xl lg:text-3xl font-extrabold text-slate-900">ภาพรวมผู้บริหาร</h2>
          <p className="text-slate-500 mt-1 font-light text-sm lg:text-base">
            ข้อมูลจาก Session: <span className="font-bold text-primary">{currentSession?.name || 'Default'}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white p-1 rounded-xl shadow-sm border border-slate-200">
          <span className="text-xs lg:text-sm font-semibold text-slate-700 pl-2 lg:pl-3">
            {new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
          <button className="bg-primary text-white px-3 lg:px-4 py-2 rounded-lg text-xs lg:text-sm font-bold shadow-lg shadow-primary/20 hover:bg-primary-dark transition-colors">
            ส่งออก
          </button>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        {kpiData.map((kpi, idx) => (
          <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden">
            <div className="absolute right-[-20px] top-[-20px] w-24 h-24 bg-slate-50 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative z-10 flex justify-between items-start mb-4">
              <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">{kpi.label}</span>
              <span className={`material-symbols-outlined ${kpi.color} opacity-80`}>{kpi.icon}</span>
            </div>
            <div className="relative z-10 flex items-end gap-2">
              <h3 className={`text-4xl font-black ${kpi.color}`}>{kpi.value}</h3>
              <span className="text-xs font-bold bg-slate-100 px-2 py-1 rounded-full text-slate-600 mb-1">{kpi.change}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Pie Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center">
          <h3 className="text-lg font-bold text-slate-900 w-full mb-4">ที่มาของปัญหา</h3>
          {pieData.length > 0 ? (
            <>
              <div className="w-full h-64 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.name as keyof typeof CATEGORY_COLORS] || '#94a3b8'} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <span className="block text-3xl font-bold text-slate-900">{problems.length}</span>
                    <span className="text-xs text-slate-400 uppercase font-bold">เรื่อง</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-4 mt-4 justify-center flex-wrap">
                {pieData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[entry.name as keyof typeof CATEGORY_COLORS] || '#94a3b8' }}></div>
                    <span className="text-xs font-bold text-slate-600">{entry.label} ({entry.value})</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400">
              ยังไม่มีข้อมูล
            </div>
          )}
        </div>

        {/* Bar Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6">การจัดลำดับความสำคัญ</h3>
          {barData.length > 0 ? (
            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} barSize={40}>
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 14, fontFamily: 'Kanit' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontFamily: 'Kanit' }} />
                  <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', fontFamily: 'Kanit' }} />
                  <Bar dataKey="count" fill="#0e7c6a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400">
              ยังไม่มีข้อมูล
            </div>
          )}
        </div>
      </div>

      {/* Linked Problems Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-900">ปัญหาที่มีทางออกแล้ว</h3>
          <span className="text-sm text-slate-500">{topProblems.length} รายการ</span>
        </div>
        {topProblems.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-sm text-slate-500 font-bold">
                  <th className="px-6 py-4">ปัญหา</th>
                  <th className="px-6 py-4">วิธีแก้ไข</th>
                  <th className="px-6 py-4">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topProblems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-800">{item.problem}</td>
                    <td className="px-6 py-4 text-slate-600 text-sm">{item.solution}</td>
                    <td className="px-6 py-4">
                      <span className={`
                        text-xs font-bold px-3 py-1 rounded-full
                        ${item.status === NoteStatus.Resolved ? 'bg-green-100 text-green-700' :
                          item.status === NoteStatus.Active ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}
                      `}>
                        {item.status === NoteStatus.Resolved ? 'แก้ไขแล้ว' : 'รอดำเนินการ'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-400">
            <span className="material-symbols-outlined text-5xl mb-4 block opacity-50">link_off</span>
            <p>ยังไม่มีปัญหาที่เชื่อมกับทางออก</p>
            <p className="text-sm mt-2">ไปที่ "หาทางออก" เพื่อเชื่อมปัญหากับทางแก้</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
