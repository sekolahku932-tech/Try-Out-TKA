
import React, { useState, useEffect } from 'react';
import { Plus, Search, Trash2, Printer, Eye, EyeOff, X, User as UserIcon, Lock, AlertCircle, ArrowLeft } from 'lucide-react';
import { Student, AppSettings } from '../types';
import { generateStudentCredentials } from '../utils/auth';

interface StudentManagementProps {
  students: Student[];
  settings: AppSettings;
  onAdd: (student: Student) => void;
  onDelete: (id: string) => void;
}

const StudentManagement: React.FC<StudentManagementProps> = ({ students, settings, onAdd, onDelete }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [isPrintPreview, setIsPrintPreview] = useState(false);
  const [selectedStudentForCard, setSelectedStudentForCard] = useState<Student | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    nisn: '',
    birthPlace: '',
    birthDate: ''
  });

  // Try to trigger print dialog when preview opens
  useEffect(() => {
    if (isPrintPreview) {
      const timer = setTimeout(() => {
        try {
          window.print();
        } catch (e) {
          console.warn("Auto-print blocked by browser sandbox");
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isPrintPreview]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const creds = generateStudentCredentials();
    const newStudent: Student = {
      id: Date.now().toString(),
      ...formData,
      ...creds
    };
    onAdd(newStudent);
    setFormData({ name: '', nisn: '', birthPlace: '', birthDate: '' });
    setIsModalOpen(false);
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.nisn.includes(searchTerm)
  );

  const togglePassword = (id: string) => {
    setShowPasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handlePrintAll = () => {
    setSelectedStudentForCard(null);
    setIsPrintPreview(true);
  };

  const handlePrintSingle = (student: Student) => {
    setSelectedStudentForCard(student);
    setIsPrintPreview(true);
  };

  const closePrintPreview = () => {
    setIsPrintPreview(false);
    setSelectedStudentForCard(null);
  };

  // Kartu Peserta Component - Fix: Added React.FC type to handle 'key' prop correctly in map()
  const ParticipantCard: React.FC<{ student: Student }> = ({ student }) => (
    <div className="participant-card border-2 border-slate-800 p-4 w-[9cm] h-[13cm] bg-white text-black flex flex-col m-2 shadow-sm shrink-0">
      {/* KOP KARTU */}
      <div className="text-center border-b-2 border-slate-800 pb-2 mb-4">
        <h4 className="text-[10px] font-bold uppercase leading-tight">{settings.schoolName}</h4>
        <h3 className="text-[11px] font-black uppercase leading-tight mt-1">{settings.examTitle}</h3>
        <p className="text-[9px] font-medium uppercase mt-0.5">TAHUN PELAJARAN {settings.academicYear}</p>
      </div>

      <div className="text-center mb-4">
        <div className="inline-block px-3 py-1 bg-slate-100 border border-slate-800 rounded font-bold text-[10px] uppercase">
          KARTU PESERTA UJIAN
        </div>
      </div>

      {/* Identitas */}
      <div className="flex-1 space-y-2 text-[10px]">
        <div className="grid grid-cols-3">
          <span className="font-bold">Nama</span>
          <span className="col-span-2">: {student.name}</span>
        </div>
        <div className="grid grid-cols-3">
          <span className="font-bold">NISN</span>
          <span className="col-span-2">: {student.nisn}</span>
        </div>
        <div className="grid grid-cols-3">
          <span className="font-bold">TTL</span>
          <span className="col-span-2">: {student.birthPlace}, {student.birthDate}</span>
        </div>
      </div>

      {/* Akses Login */}
      <div className="mt-4 p-3 border border-slate-400 rounded-lg bg-slate-50 space-y-2">
        <p className="text-[9px] font-black uppercase text-slate-500 mb-1 border-b border-slate-200">Kredensial Login</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserIcon size={12} className="text-slate-400" />
            <span className="text-[11px] font-mono font-bold tracking-wider">{student.username}</span>
          </div>
          <div className="flex items-center gap-2">
            <Lock size={12} className="text-slate-400" />
            <span className="text-[11px] font-mono font-bold tracking-wider">{student.password}</span>
          </div>
        </div>
      </div>

      {/* Footer Kartu */}
      <div className="mt-6 flex justify-between items-end">
        <div className="w-16 h-20 border border-slate-300 bg-slate-50 flex items-center justify-center text-[8px] text-slate-400">
          Pas Foto<br/>3x4
        </div>
        <div className="text-center">
          <p className="text-[8px] mb-8">Penyusun,</p>
          <div className="w-24 border-b border-slate-800 mx-auto"></div>
          <p className="text-[8px] font-bold mt-1">NIP. ..........................</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <style>{`
        @media screen {
          .is-preview-mode {
            position: fixed;
            inset: 0;
            background: #f8fafc;
            z-index: 9999;
            overflow-y: auto;
            padding: 2rem;
          }
          .preview-toolbar {
            position: sticky;
            top: 0;
            margin-bottom: 2rem;
            background: white;
            padding: 1rem;
            border-radius: 1rem;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            display: flex;
            justify-content: space-between;
            align-items: center;
            border: 1px border-slate-200;
          }
        }
        @media print {
          @page { size: A4; margin: 1cm; }
          body * { visibility: hidden !important; }
          .print-container, .print-container * { visibility: visible !important; }
          .print-container { 
            position: absolute !important; 
            left: 0 !important; 
            top: 0 !important; 
            width: 100% !important; 
            background: white !important;
            display: grid !important;
            grid-template-cols: 1fr 1fr !important;
            gap: 10px !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .participant-card {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            margin: 0 auto 15px auto !important;
            box-shadow: none !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Main View */}
      <div className={isPrintPreview ? 'hidden' : ''}>
        <div className="p-6 border-b border-slate-200 flex flex-col lg:flex-row justify-between items-center gap-4">
          <div className="relative w-full lg:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Cari nama atau NISN..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex w-full lg:w-auto gap-2">
            <button
              onClick={handlePrintAll}
              className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-5 py-2 rounded-xl font-medium transition-colors"
            >
              <Printer size={18} />
              Cetak Semua Kartu
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl font-medium transition-colors"
            >
              <Plus size={18} />
              Tambah Siswa
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold">
              <tr>
                <th className="px-6 py-4">Siswa</th>
                <th className="px-6 py-4">NISN</th>
                <th className="px-6 py-4">TTL</th>
                <th className="px-6 py-4">Akses Sistem</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-800">{student.name}</p>
                  </td>
                  <td className="px-6 py-4 text-slate-600 font-medium">{student.nisn}</td>
                  <td className="px-6 py-4 text-slate-500 text-sm">
                    {student.birthPlace}, {student.birthDate}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-tighter">Username: {student.username}</span>
                      <div className="flex items-center gap-2 text-xs font-mono font-bold text-indigo-600">
                        <span>Pass: {showPasswords[student.id] ? student.password : '••••••••'}</span>
                        <button onClick={() => togglePassword(student.id)} className="text-slate-300 hover:text-indigo-600 transition-colors">
                          {showPasswords[student.id] ? <EyeOff size={12} /> : <Eye size={12} />}
                        </button>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => handlePrintSingle(student)}
                        title="Cetak Kartu"
                        className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                      >
                        <Printer size={18} />
                      </button>
                      <button 
                        onClick={() => onDelete(student.id)} 
                        title="Hapus"
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Print Preview Overlay */}
      {isPrintPreview && (
        <div className="is-preview-mode">
          <div className="max-w-5xl mx-auto">
            {/* Toolbar Pratinjau */}
            <div className="preview-toolbar no-print">
              <div className="flex items-center gap-4">
                <button 
                  onClick={closePrintPreview}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <ArrowLeft size={24} className="text-slate-600" />
                </button>
                <div>
                  <h3 className="font-bold text-slate-800">Pratinjau Kartu Peserta</h3>
                  <p className="text-xs text-slate-500">Total: {selectedStudentForCard ? '1 Kartu' : `${students.length} Kartu`}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden md:flex items-center gap-2 text-amber-600 bg-amber-50 px-4 py-2 rounded-xl text-xs font-medium border border-amber-100">
                  <AlertCircle size={16} />
                  <span>Jika dialog tidak muncul, tekan <b>Ctrl + P</b></span>
                </div>
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-xl font-bold shadow-lg transition-all active:scale-95"
                >
                  <Printer size={18} />
                  Cetak Sekarang
                </button>
              </div>
            </div>

            {/* Area Kartu */}
            <div className="print-container flex flex-wrap justify-center gap-4 pb-20">
              {selectedStudentForCard ? (
                <ParticipantCard student={selectedStudentForCard} />
              ) : (
                students.map(s => <ParticipantCard key={s.id} student={s} />)
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-8 border-b border-slate-100 bg-slate-50">
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">Tambah Siswa Baru</h3>
            </div>
            <form onSubmit={handleAdd} className="p-8 space-y-5">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Nama Lengkap</label>
                <input
                  required
                  className="w-full px-5 py-3 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">NISN</label>
                <input
                  required
                  className="w-full px-5 py-3 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-mono font-bold"
                  value={formData.nisn}
                  onChange={(e) => setFormData({...formData, nisn: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Tempat Lahir</label>
                  <input
                    required
                    className="w-full px-5 py-3 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold"
                    value={formData.birthPlace}
                    onChange={(e) => setFormData({...formData, birthPlace: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Tanggal Lahir</label>
                  <input
                    required
                    type="date"
                    className="w-full px-5 py-3 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold"
                    value={formData.birthDate}
                    onChange={(e) => setFormData({...formData, birthDate: e.target.value})}
                  />
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-6 py-4 border-2 border-slate-200 text-slate-600 rounded-2xl font-black text-sm hover:bg-slate-50 transition-all"
                >
                  BATAL
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all active:scale-95"
                >
                  SIMPAN DATA
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentManagement;
