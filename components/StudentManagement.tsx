
import React, { useState } from 'react';
import { Plus, Search, Trash2, Printer, Eye, EyeOff, X, User as UserIcon, Lock, AlertCircle, ArrowLeft, AlertTriangle, Edit3, School as SchoolIcon } from 'lucide-react';
import { Student, AppSettings } from '../types';
import { generateStudentCredentials } from '../utils/auth';

interface StudentManagementProps {
  students: Student[];
  settings: AppSettings;
  schoolCode: string;
  onAdd: (student: Student) => void;
  onUpdate: (student: Student) => void;
  onDelete: (id: string) => void;
}

const StudentManagement: React.FC<StudentManagementProps> = ({ students, settings, schoolCode, onAdd, onUpdate, onDelete }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [isPrintPreview, setIsPrintPreview] = useState(false);
  const [selectedStudentForCard, setSelectedStudentForCard] = useState<Student | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<string | null>(null);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  
  const initialFormData = {
    name: '',
    nisn: '',
    gender: 'L' as 'L' | 'P',
    birthPlace: '',
    birthDate: ''
  };

  const [formData, setFormData] = useState(initialFormData);

  const handleActualPrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Gagal membuka jendela cetak. Pastikan browser tidak memblokir pop-up.");
      return;
    }

    const studentsToPrint = selectedStudentForCard ? [selectedStudentForCard] : students;
    
    const cardHtml = studentsToPrint.map(student => `
      <div class="participant-card">
        <div class="card-header">
          <div class="school-name">${settings.schoolName}</div>
          <div class="exam-title">${settings.examTitle}</div>
          <div class="academic-year">TAHUN PELAJARAN ${settings.academicYear}</div>
        </div>
        <div class="card-label">KARTU PESERTA TKA</div>
        <div class="card-body">
          <div class="row"><strong>Nama</strong>: <span>${student.name}</span></div>
          <div class="row"><strong>NISN</strong>: <span class="mono">${student.nisn}</span></div>
          <div class="row"><strong>JK</strong>: <span>${student.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</span></div>
          <div class="row"><strong>TTL</strong>: <span>${student.birthPlace}, ${student.birthDate}</span></div>
        </div>
        <div class="login-box">
          <div class="login-label">KREDENSIAL LOGIN</div>
          <div class="school-code-row">KODE SEKOLAH: <span class="mono">${schoolCode}</span></div>
          <div class="login-creds">
            <div>User: <span class="mono">${student.username}</span></div>
            <div>Pass: <span class="mono">${student.password}</span></div>
          </div>
        </div>
        <div class="card-footer">
          <div class="photo-box">Pas Foto<br/>3x4</div>
          <div class="sign-box">
            <div>Panitia,</div>
            <div class="sign-line"></div>
            <div>NIP. ..........................</div>
          </div>
        </div>
      </div>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Cetak Kartu - ${settings.schoolName}</title>
          <style>
            @page { 
              size: A4 portrait; 
              margin: 10mm 5mm; 
            }
            body { 
              font-family: 'Inter', -apple-system, sans-serif; 
              margin: 0; 
              padding: 0; 
              background: white; 
            }
            .print-container { 
              display: grid; 
              grid-template-columns: repeat(2, 1fr); 
              gap: 4mm;
              width: 100%;
              box-sizing: border-box;
              justify-items: center;
            }
            .participant-card { 
              border: 1.2pt solid #000; 
              padding: 6mm 5mm 5mm 5mm; 
              width: 92mm; 
              height: 132mm; 
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              page-break-inside: avoid;
              background: white;
              position: relative;
            }
            .card-header { text-align: center; border-bottom: 1.5pt solid #000; padding-bottom: 2mm; margin-bottom: 3mm; }
            .school-name { font-size: 8pt; font-weight: bold; text-transform: uppercase; line-height: 1.2; }
            .exam-title { font-size: 9.5pt; font-weight: 900; text-transform: uppercase; margin: 1mm 0; line-height: 1.1; }
            .academic-year { font-size: 7.5pt; font-weight: bold; }
            
            .card-label { 
              text-align: center; 
              background: #f8fafc; 
              border: 0.8pt solid #000; 
              padding: 1.5mm; 
              font-weight: 900; 
              font-size: 8.5pt; 
              margin-bottom: 3mm;
              letter-spacing: 0.5pt;
            }
            
            .card-body { flex: 1; font-size: 9pt; line-height: 1.6; }
            .row { display: flex; align-items: flex-start; margin-bottom: 1mm; }
            .row strong { width: 15mm; flex-shrink: 0; font-weight: 800; }
            .row span { flex: 1; font-weight: bold; }
            .mono { font-family: 'Courier New', monospace; font-weight: bold; }
            
            .login-box { 
              border: 1pt solid #475569; 
              border-radius: 4pt; 
              background: #f1f5f9; 
              padding: 2.5mm; 
              margin-top: 1mm; 
            }
            .login-label { font-size: 7pt; font-weight: 900; color: #1e293b; border-bottom: 0.5pt solid #94a3b8; margin-bottom: 1.5mm; padding-bottom: 0.5mm; text-transform: uppercase; }
            .school-code-row { font-size: 8.5pt; font-weight: 900; margin-bottom: 1.5mm; color: #1d4ed8; }
            .login-creds { display: flex; justify-content: space-between; font-size: 9pt; font-weight: 800; color: #000; }
            
            .card-footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 4mm; }
            .photo-box { 
              width: 25mm; 
              height: 35mm; 
              border: 0.5pt solid #64748b; 
              background: #fff; 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              font-size: 7pt; 
              color: #64748b; 
              text-align: center; 
              font-weight: bold;
            }
            .sign-box { text-align: center; width: 45mm; font-size: 9pt; font-weight: bold; }
            .sign-line { border-bottom: 1pt solid #000; margin: 20mm 0 1.5mm 0; }
          </style>
        </head>
        <body>
          <div class="print-container">
            ${cardHtml}
          </div>
          <script>
            window.onload = () => {
              setTimeout(() => {
                window.print();
                window.close();
              }, 1000);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleOpenAdd = () => {
    setFormData(initialFormData);
    setEditingStudentId(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (student: Student) => {
    setFormData({
      name: student.name,
      nisn: student.nisn,
      gender: student.gender,
      birthPlace: student.birthPlace,
      birthDate: student.birthDate
    });
    setEditingStudentId(student.id);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingStudentId) {
      const studentToUpdate = students.find(s => s.id === editingStudentId);
      if (studentToUpdate) {
        onUpdate({ ...studentToUpdate, ...formData });
      }
    } else {
      const creds = generateStudentCredentials();
      const newStudent: Student = {
        id: Date.now().toString(),
        ...formData,
        ...creds,
        schoolId: '' 
      };
      onAdd(newStudent);
    }
    setFormData(initialFormData);
    setEditingStudentId(null);
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

  const ParticipantCard: React.FC<{ student: Student }> = ({ student }) => (
    <div className="participant-card border-2 border-slate-800 p-5 w-[9.2cm] h-[13.2cm] bg-white text-black flex flex-col shadow-none box-border overflow-hidden">
      <div className="text-center border-b-2 border-slate-800 pb-2 mb-3">
        <h4 className="text-[10px] font-bold uppercase leading-tight">{settings.schoolName}</h4>
        <h3 className="text-[12px] font-black uppercase leading-tight mt-1">{settings.examTitle}</h3>
        <p className="text-[9px] font-medium uppercase mt-0.5">TAHUN PELAJARAN {settings.academicYear}</p>
      </div>
      <div className="text-center mb-3">
        <div className="inline-block px-4 py-1 bg-slate-100 border border-slate-800 rounded font-black text-[10px] uppercase tracking-wide">KARTU PESERTA TKA</div>
      </div>
      <div className="flex-1 space-y-2 text-[11px]">
        <div className="grid grid-cols-3"><span className="font-bold">Nama</span><span className="col-span-2 font-bold">: {student.name}</span></div>
        <div className="grid grid-cols-3"><span className="font-bold">NISN</span><span className="col-span-2 font-mono">: {student.nisn}</span></div>
        <div className="grid grid-cols-3"><span className="font-bold">JK</span><span className="col-span-2">: {student.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</span></div>
        <div className="grid grid-cols-3"><span className="font-bold">TTL</span><span className="col-span-2">: {student.birthPlace}, {student.birthDate}</span></div>
      </div>
      <div className="mt-2 p-3 border-2 border-slate-400 rounded-xl bg-slate-50 space-y-2">
        <p className="text-[10px] font-black uppercase text-slate-500 mb-1 border-b border-slate-200 pb-1">Kredensial Login</p>
        <div className="flex items-center gap-2 text-[11px] font-mono font-black text-indigo-700 border-b border-slate-100 pb-1">
          <SchoolIcon size={14} className="text-slate-400" /> KODE: {schoolCode}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><UserIcon size={14} className="text-slate-400" /><span className="text-[12px] font-mono font-black tracking-wider text-indigo-700">{student.username}</span></div>
          <div className="flex items-center gap-2"><Lock size={14} className="text-slate-400" /><span className="text-[12px] font-mono font-black tracking-wider text-indigo-700">{student.password}</span></div>
        </div>
      </div>
      <div className="mt-4 flex justify-between items-end">
        <div className="w-20 h-24 border-2 border-slate-300 bg-slate-50 flex items-center justify-center text-[9px] text-slate-400 font-bold">Pas Foto<br/>3x4</div>
        <div className="text-center w-32"><p className="text-[10px] mb-12 font-bold">Panitia,</p><div className="w-full border-b border-slate-800 mx-auto"></div><p className="text-[10px] font-bold mt-1">NIP. ..........................</p></div>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <style>{`
        @media screen {
          .is-preview-mode { position: fixed; inset: 0; background: #f1f5f9; z-index: 9999; overflow-y: auto; padding: 2rem; }
          .preview-toolbar { position: sticky; top: 0; margin-bottom: 2rem; background: white; padding: 1.25rem; border-radius: 1.5rem; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); display: flex; justify-content: space-between; align-items: center; border: 1px border-slate-200; z-index: 10000; }
        }
      `}</style>

      <div className={isPrintPreview ? 'hidden' : ''}>
        <div className="p-6 border-b border-slate-200 flex flex-col lg:flex-row justify-between items-center gap-4">
          <div className="relative w-full lg:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="Cari nama atau NISN..." className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <div className="flex w-full lg:w-auto gap-2">
            <button onClick={handlePrintAll} className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-5 py-2 rounded-xl font-medium transition-colors"><Printer size={18} />Cetak Semua Kartu</button>
            <button onClick={handleOpenAdd} className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl font-medium transition-colors"><Plus size={18} />Tambah Siswa</button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold">
              <tr>
                <th className="px-6 py-4">Siswa</th>
                <th className="px-6 py-4">NISN</th>
                <th className="px-6 py-4">JK</th>
                <th className="px-6 py-4">TTL</th>
                <th className="px-6 py-4">Akses Sistem</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4"><p className="font-bold text-slate-800">{student.name}</p></td>
                  <td className="px-6 py-4 text-slate-600 font-medium">{student.nisn}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black ${student.gender === 'L' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                      {student.gender}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-sm">{student.birthPlace}, {student.birthDate}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-tighter">User: {student.username}</span>
                      <div className="flex items-center gap-2 text-xs font-mono font-bold text-indigo-600">
                        <span>Pass: {showPasswords[student.id] ? student.password : '••••••••'}</span>
                        <button onClick={() => togglePassword(student.id)} className="text-slate-300 hover:text-indigo-600 transition-colors">{showPasswords[student.id] ? <EyeOff size={12} /> : <Eye size={12} />}</button>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleOpenEdit(student)} title="Edit Data" className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"><Edit3 size={18} /></button>
                      <button onClick={() => handlePrintSingle(student)} title="Cetak Kartu" className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"><Printer size={18} /></button>
                      <button onClick={() => setStudentToDelete(student.id)} title="Hapus" className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={18} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {studentToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl w-full max-sm shadow-2xl overflow-hidden p-8 text-center space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-2">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase">Hapus Data Siswa?</h3>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">
              Anda akan menghapus data siswa ini secara permanen. Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-3 pt-4">
              <button onClick={() => setStudentToDelete(null)} className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all">Batal</button>
              <button onClick={() => { if(studentToDelete) onDelete(studentToDelete); setStudentToDelete(null); }} className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-200">Ya, Hapus</button>
            </div>
          </div>
        </div>
      )}

      {isPrintPreview && (
        <div className="is-preview-mode">
          <div className="max-w-[21cm] mx-auto">
            <div className="preview-toolbar no-print">
              <div className="flex items-center gap-4">
                <button onClick={closePrintPreview} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><ArrowLeft size={24} className="text-slate-600" /></button>
                <div><h3 className="font-bold text-slate-800">Pratinjau Kartu Peserta</h3><p className="text-xs text-slate-500">Format A4 (2x2) • Kode Sekolah: {schoolCode}</p></div>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden lg:flex items-center gap-2 text-amber-600 bg-amber-50 px-4 py-2 rounded-xl text-xs font-bold border border-amber-100"><AlertCircle size={16} /><span>Format 2x2. Pastikan Margin Printer "None" atau "Minim".</span></div>
                <button onClick={handleActualPrint} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-black shadow-lg transition-all active:scale-95 text-xs uppercase tracking-widest"><Printer size={16} />Cetak Sekarang</button>
              </div>
            </div>
            <div className="print-area flex flex-wrap justify-center gap-6 pb-20">
              {selectedStudentForCard ? (
                <ParticipantCard student={selectedStudentForCard} />
              ) : (
                students.map(s => <ParticipantCard key={s.id} student={s} />)
              )}
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-8 border-b border-slate-100 bg-slate-50"><h3 className="text-2xl font-black text-slate-800 tracking-tight">{editingStudentId ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}</h3></div>
            <form onSubmit={handleSave} className="p-8 space-y-5">
              <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nama Lengkap</label><input required className="w-full px-5 py-3 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">NISN</label><input required className="w-full px-5 py-3 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-mono font-bold" value={formData.nisn} onChange={(e) => setFormData({...formData, nisn: e.target.value})} /></div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Jenis Kelamin</label>
                  <select required className="w-full px-5 py-3 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold bg-white" value={formData.gender} onChange={(e) => setFormData({...formData, gender: e.target.value as 'L' | 'P'})}>
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Tempat Lahir</label><input required className="w-full px-5 py-3 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold" value={formData.birthPlace} onChange={(e) => setFormData({...formData, birthPlace: e.target.value})} /></div>
                <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Tanggal Lahir</label><input required type="date" className="w-full px-5 py-3 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold" value={formData.birthDate} onChange={(e) => setFormData({...formData, birthDate: e.target.value})} /></div>
              </div>
              <div className="flex gap-4 pt-4"><button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-6 py-4 border-2 border-slate-200 text-slate-600 rounded-2xl font-black text-sm hover:bg-slate-50 transition-all">BATAL</button><button type="submit" className="flex-1 px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all active:scale-95">{editingStudentId ? 'SIMPAN PERUBAHAN' : 'SIMPAN DATA'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentManagement;
