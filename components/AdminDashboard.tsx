
import React from 'react';
import { Users, BookText, CalendarCheck, BarChart3, School, Clock } from 'lucide-react';
import { Student, TestSession, QuestionPackage } from '../types';

interface DashboardProps {
  students?: Student[];
  sessions?: TestSession[];
  packages?: QuestionPackage[];
}

const AdminDashboard: React.FC<DashboardProps> = ({ 
  students = [], 
  sessions = [], 
  packages = []
}) => {
  
  const stats = [
    { label: 'Total Siswa', value: students.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'Sesi Ujian', value: sessions.length, icon: CalendarCheck, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { label: 'Paket Soal', value: packages.length, icon: BookText, color: 'text-amber-600', bg: 'bg-amber-100' },
    { label: 'Rata-rata Skor', value: '-', icon: BarChart3, color: 'text-purple-600', bg: 'bg-purple-100' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Welcome Banner */}
      <div className="p-8 rounded-[2.5rem] text-white relative overflow-hidden shadow-2xl bg-gradient-to-r from-indigo-600 to-indigo-500">
        <div className="relative z-10">
          <h2 className="text-3xl font-black tracking-tight mb-2">
            Halo, Administrator Sekolah
          </h2>
          <p className="text-white/80 font-medium max-w-lg">
            Pantau aktivitas ujian, kelola data siswa, dan evaluasi hasil try out lembaga Anda di sini.
          </p>
        </div>
        <div className="absolute top-0 right-0 p-10 opacity-10 -rotate-12 translate-x-1/4 -translate-y-1/4">
          <School size={240} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex items-center gap-4 hover:border-indigo-200 transition-colors">
            <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color}`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{stat.label}</p>
              <h4 className="text-2xl font-black text-slate-800 leading-none">{stat.value}</h4>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
              <Clock size={20} className="text-indigo-500" />
              Jadwal Mendatang
            </h3>
          </div>
          
          <div className="space-y-4">
            {sessions.length > 0 ? (
              sessions.slice(0, 5).map((session) => (
                <div key={session.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div>
                    <p className="font-bold text-slate-800">{session.subject}</p>
                    <p className="text-xs text-slate-500">{session.date} | Sesi {session.sessionNumber}</p>
                  </div>
                  <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-[10px] font-black rounded-lg">
                    {session.studentIds.length} PESERTA
                  </span>
                </div>
              ))
            ) : (
              <p className="text-slate-400 italic text-center py-8 font-medium">Belum ada jadwal pengerjaan.</p>
            )}
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
              <Users size={20} className="text-emerald-500" />
              Siswa Terbaru
            </h3>
          </div>

          <div className="space-y-4">
            {students.length > 0 ? (
              students.slice(-5).reverse().map((student) => (
                <div key={student.id} className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-600">
                    {student.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">{student.name}</p>
                    <p className="text-[10px] font-mono font-black text-slate-400 uppercase">NISN: {student.nisn}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-400 italic text-center py-8 font-medium">Belum ada data siswa.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
