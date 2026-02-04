
import React, { useState, useEffect } from 'react';
import { Settings, Save, School, Award, CalendarDays, CheckCircle2, Info, GraduationCap, Building2, ShieldAlert } from 'lucide-react';
import { AppSettings } from '../types';

interface SettingsViewProps {
  settings: AppSettings;
  isSuperAdmin?: boolean;
  onUpdate: (settings: AppSettings) => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ settings, onUpdate, isSuperAdmin = false }) => {
  const [formData, setFormData] = useState(settings);
  const [isSaved, setIsSaved] = useState(false);

  // Sync state if props change (e.g. after initial load from firebase)
  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(formData);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  // Helper untuk menghasilkan daftar tahun pelajaran (current +- 2 tahun)
  const generateAcademicYears = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = -2; i <= 2; i++) {
      const year = currentYear + i;
      years.push(`${year}/${year + 1}`);
    }
    return years;
  };

  const academicYears = generateAcademicYears();

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Info */}
      <div className={`${isSuperAdmin ? 'bg-amber-600 shadow-amber-200' : 'bg-indigo-600 shadow-indigo-200'} rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl transition-colors duration-500`}>
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md border border-white/30">
              <Settings size={32} />
            </div>
            <div>
              <h2 className="text-3xl font-black tracking-tight uppercase">
                {isSuperAdmin ? 'Konfigurasi Pusat' : 'Identitas Lembaga'}
              </h2>
              <p className="text-white opacity-80 font-medium">
                {isSuperAdmin 
                  ? 'Atur parameter sistem nasional, tahun pelajaran default, dan penamaan pusat.' 
                  : 'Atur informasi yang akan muncul pada KOP Dokumen dan Laporan sekolah Anda.'}
              </p>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 p-10 opacity-10 -rotate-12 translate-x-1/4 -translate-y-1/4">
          <Building2 size={240} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Form Column */}
        <div className="md:col-span-2">
          <form onSubmit={handleSubmit} className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-200 space-y-8">
            <div className="space-y-6">
              {/* Nama Sekolah / Pusat */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1 flex items-center gap-2">
                  <School size={14} className={isSuperAdmin ? 'text-amber-500' : 'text-indigo-500'} /> 
                  {isSuperAdmin ? 'Nama Otoritas Pusat' : 'Nama Sekolah / Instansi'}
                </label>
                <input
                  required
                  placeholder={isSuperAdmin ? "MISAL: PUSAT ASESMEN NASIONAL" : "MISAL: SDN MERDEKA 01"}
                  className={`w-full px-6 py-4 border-2 border-slate-100 rounded-2xl outline-none focus:ring-4 ${isSuperAdmin ? 'focus:ring-amber-500/10 focus:border-amber-500' : 'focus:ring-indigo-500/10 focus:border-indigo-500'} bg-slate-50 font-bold text-lg transition-all`}
                  value={formData.schoolName}
                  onChange={(e) => setFormData({...formData, schoolName: e.target.value.toUpperCase()})}
                />
              </div>

              {/* Judul Ujian */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1 flex items-center gap-2">
                  <Award size={14} className={isSuperAdmin ? 'text-amber-500' : 'text-indigo-500'} /> Judul Asesmen Utama
                </label>
                <input
                  required
                  placeholder="MISAL: TRYOUT TES KEMAMPUAN AKADEMIK"
                  className={`w-full px-6 py-4 border-2 border-slate-100 rounded-2xl outline-none focus:ring-4 ${isSuperAdmin ? 'focus:ring-amber-500/10 focus:border-amber-500' : 'focus:ring-indigo-500/10 focus:border-indigo-500'} bg-slate-50 font-bold text-lg transition-all`}
                  value={formData.examTitle}
                  onChange={(e) => setFormData({...formData, examTitle: e.target.value.toUpperCase()})}
                />
              </div>

              {/* Tahun Pelajaran */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1 flex items-center gap-2">
                  <CalendarDays size={14} className={isSuperAdmin ? 'text-amber-500' : 'text-indigo-500'} /> Tahun Pelajaran
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <select
                    className={`px-6 py-4 border-2 border-slate-100 rounded-2xl outline-none focus:ring-4 ${isSuperAdmin ? 'focus:ring-amber-500/10 focus:border-amber-500 text-amber-600' : 'focus:ring-indigo-500/10 focus:border-indigo-500 text-indigo-600'} bg-white font-black transition-all cursor-pointer`}
                    value={formData.academicYear}
                    onChange={(e) => setFormData({...formData, academicYear: e.target.value})}
                  >
                    <option value="" disabled>-- Pilih Tahun --</option>
                    {academicYears.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                  <input
                    placeholder="Atau ketik manual..."
                    className={`px-6 py-4 border-2 border-slate-100 rounded-2xl outline-none focus:ring-4 ${isSuperAdmin ? 'focus:ring-amber-500/10 focus:border-amber-500' : 'focus:ring-indigo-500/10 focus:border-indigo-500'} bg-slate-50 font-bold transition-all`}
                    value={formData.academicYear}
                    onChange={(e) => setFormData({...formData, academicYear: e.target.value})}
                  />
                </div>
                <p className="text-[10px] text-slate-400 font-medium italic px-2">Format standar: YYYY/YYYY (Contoh: 2024/2025)</p>
              </div>
            </div>

            <div className="pt-8 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs opacity-0 transition-opacity" style={{ opacity: isSaved ? 1 : 0 }}>
                <CheckCircle2 size={16} /> Tersimpan otomatis ke Cloud
              </div>
              <button
                type="submit"
                className={`w-full sm:w-auto flex items-center justify-center gap-3 px-12 py-5 ${isSuperAdmin ? 'bg-amber-600 hover:bg-amber-700' : 'bg-slate-900 hover:bg-indigo-600'} text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-indigo-100 transition-all active:scale-95 group`}
              >
                <Save size={20} className="group-hover:rotate-12 transition-transform" />
                {isSuperAdmin ? 'Update Konfigurasi Pusat' : 'Simpan Identitas Lembaga'}
              </button>
            </div>
          </form>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="bg-slate-900 rounded-[2rem] p-8 text-white space-y-6 shadow-xl">
            <h4 className={`text-xs font-black uppercase tracking-[0.2em] ${isSuperAdmin ? 'text-amber-400' : 'text-indigo-400'}`}>Status Sistem</h4>
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Database</p>
                <p className="text-sm font-bold flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div> 
                  {isSuperAdmin ? 'Central Registry Online' : 'School Instance Connected'}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Sinkronisasi</p>
                <p className="text-sm font-bold">Real-time Persistence</p>
              </div>
              <div className="pt-4 border-t border-slate-800">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Cakupan Data</p>
                <p className="text-xs font-black text-indigo-400 uppercase">
                  {isSuperAdmin ? 'Kecamatan Bilato' : 'Data Lokal Sekolah'}
                </p>
              </div>
            </div>
          </div>

          <div className={`${isSuperAdmin ? 'bg-amber-50 border-amber-200' : 'bg-indigo-50 border-indigo-200'} border-2 border-dashed rounded-[2rem] p-8 space-y-4`}>
            <div className={`w-10 h-10 ${isSuperAdmin ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'} rounded-xl flex items-center justify-center`}>
              {isSuperAdmin ? <ShieldAlert size={20} /> : <Info size={20} />}
            </div>
            <h4 className={`font-black ${isSuperAdmin ? 'text-amber-900' : 'text-indigo-900'} text-xs uppercase tracking-tight`}>Perhatian</h4>
            <p className={`text-xs ${isSuperAdmin ? 'text-amber-800' : 'text-indigo-800'} font-medium leading-relaxed`}>
              {isSuperAdmin 
                ? 'Perubahan Tahun Pelajaran di sini akan menjadi acuan default bagi seluruh paket soal baru di repositori pusat.' 
                : 'Perubahan Tahun Pelajaran akan langsung berdampak pada header cetakan Kisi-Kisi dan Kartu Peserta.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
