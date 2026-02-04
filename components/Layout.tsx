
import React from 'react';
import { LogOut, User, LayoutDashboard, GraduationCap, Calendar, BookOpen, Settings, Activity, BarChart3, FileSpreadsheet, Users2, School } from 'lucide-react';
import { UserRole } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  role: UserRole | null;
  onLogout: () => void;
  activeMenu: string;
  setActiveMenu: (menu: string) => void;
  userName?: string;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ElementType;
  group?: string;
}

const Layout: React.FC<LayoutProps> = ({ children, role, onLogout, activeMenu, setActiveMenu, userName }) => {
  const superAdminItems: MenuItem[] = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard, group: 'SISTEM' },
    { id: 'schools', label: 'Daftar Sekolah', icon: School, group: 'SISTEM' },
    { id: 'bank', label: 'Bank Soal Pusat', icon: BookOpen, group: 'KONTEN' },
    { id: 'settings', label: 'Pengaturan Pusat', icon: Settings, group: 'SISTEM' },
  ];

  const adminMenuItems: MenuItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'UTAMA' },
    { id: 'activity', label: 'Monitoring', icon: Activity, group: 'UTAMA' },
    { id: 'students', label: 'Data Siswa', icon: GraduationCap, group: 'DATA MASTER' },
    { id: 'bank', label: 'Bank Soal', icon: BookOpen, group: 'DATA MASTER' },
    { id: 'schedule', label: 'Jadwal Try Out', icon: Calendar, group: 'PELAKSANAAN' },
    { id: 'results_tka', label: 'Hasil TKA', icon: FileSpreadsheet, group: 'LAPORAN' },
    { id: 'item_analysis', label: 'Analisis Soal', icon: BarChart3, group: 'LAPORAN' },
    { id: 'admin_users', label: 'Manajemen User', icon: Users2, group: 'SISTEM' },
    { id: 'settings', label: 'Pengaturan', icon: Settings, group: 'SISTEM' },
  ];

  const studentMenuItems: MenuItem[] = [
    { id: 'tests', label: 'Ujian Saya', icon: BookOpen },
    { id: 'results', label: 'Hasil Ujian', icon: GraduationCap },
  ];

  let menuItems: MenuItem[] = [];
  let groups: (string | null)[] = [];

  if (role === 'SUPER_ADMIN') {
    menuItems = superAdminItems;
    groups = ['SISTEM', 'KONTEN'];
  } else if (role === 'ADMIN') {
    menuItems = adminMenuItems;
    groups = ['UTAMA', 'DATA MASTER', 'PELAKSANAAN', 'LAPORAN', 'SISTEM'];
  } else {
    menuItems = studentMenuItems;
    groups = [null];
  }

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <div className="w-64 bg-slate-900 text-white flex flex-col shadow-2xl z-20">
        <div className="p-6 border-b border-slate-800/50">
          <h1 className="text-xl font-black tracking-tighter flex items-center gap-2 text-indigo-400">
            <GraduationCap size={28} />
            TRYOUT-TKA
          </h1>
          <p className="text-[10px] font-black text-slate-500 mt-1 uppercase tracking-widest">
            {role === 'SUPER_ADMIN' ? 'Central Management' : 'Assessment System'}
          </p>
        </div>

        <nav className="flex-1 mt-4 overflow-y-auto custom-scrollbar px-3 space-y-6">
          {groups.map((group) => (
            <div key={group || 'default'} className="space-y-1">
              {group && (
                <p className="px-4 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">{group}</p>
              )}
              {menuItems
                .filter((item) => !group || item.group === group)
                .map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveMenu(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-xl transition-all duration-200 ${
                    activeMenu === item.id
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 translate-x-1'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <item.icon size={18} className={activeMenu === item.id ? 'text-white' : 'text-slate-500'} />
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="p-4 mt-auto border-t border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${
              role === 'SUPER_ADMIN' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
            }`}>
              <User size={20} />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold truncate text-slate-200">{userName || (role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin')}</p>
              <p className={`text-[9px] font-black uppercase tracking-widest ${role === 'SUPER_ADMIN' ? 'text-amber-500' : 'text-slate-500'}`}>{role}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto bg-[#f8fafc]">
        <header className="sticky top-0 z-10 bg-[#f8fafc]/80 backdrop-blur-md px-10 py-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">
              {menuItems.find(i => i.id === activeMenu)?.label || 'Dashboard'}
            </h2>
            <p className="text-xs font-medium text-slate-400 mt-0.5">
              Panel Kendali • {role === 'SUPER_ADMIN' ? 'Authority Pusat' : 'Lembaga'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:block text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hari Ini</p>
              <p className="text-sm font-bold text-slate-700">
                {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-400">
              <Calendar size={18} />
            </div>
          </div>
        </header>
        <div className="px-10 pb-10">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Layout;
