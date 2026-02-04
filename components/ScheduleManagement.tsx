
import React, { useState } from 'react';
import { Calendar, Plus, Users, Clock, Book, Trash2, Edit3, X, Hourglass, AlertTriangle } from 'lucide-react';
import { TestSession, Student, Subject, QuestionPackage } from '../types';

interface ScheduleManagementProps {
  sessions: TestSession[];
  students: Student[];
  packages: QuestionPackage[];
  onAdd: (session: TestSession) => Promise<void>;
  onUpdate: (session: TestSession) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const ScheduleManagement: React.FC<ScheduleManagementProps> = ({ sessions, students, packages, onAdd, onUpdate, onDelete }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const initialFormData = {
    subject: Subject.BAHASA_INDONESIA,
    packageId: '',
    date: '',
    time: '',
    endTime: '',
    duration: 60,
    sessionNumber: 1,
    selectedStudentIds: [] as string[]
  };

  const [formData, setFormData] = useState(initialFormData);

  const handleOpenAdd = () => {
    setFormData(initialFormData);
    setEditingSessionId(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (session: TestSession) => {
    setFormData({
      subject: session.subject,
      packageId: session.packageId,
      date: session.date,
      time: session.time,
      endTime: session.endTime || '',
      duration: session.duration || 60,
      sessionNumber: session.sessionNumber,
      selectedStudentIds: Array.isArray(session.studentIds) ? [...session.studentIds] : []
    });
    setEditingSessionId(session.id);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.packageId) {
      alert('Pilih paket soal terlebih dahulu.');
      return;
    }

    const sessionData: TestSession = {
      id: editingSessionId || Date.now().toString(),
      subject: formData.subject,
      packageId: formData.packageId,
      date: formData.date,
      time: formData.time,
      endTime: formData.endTime,
      duration: formData.duration,
      sessionNumber: formData.sessionNumber,
      studentIds: formData.selectedStudentIds || []
    };

    try {
      if (editingSessionId) {
        await onUpdate(sessionData);
      } else {
        await onAdd(sessionData);
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error("Save Session Error:", error);
      alert("Gagal menyimpan sesi ujian.");
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    setIsDeleting(true);
    try {
      await onDelete(deleteConfirmId);
      setDeleteConfirmId(null);
    } catch (error) {
      console.error("Delete Session Error:", error);
      alert("Gagal menghapus sesi.");
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredPackages = packages.filter(p => p.subject === formData.subject);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-slate-800">Daftar Sesi Ujian</h3>
        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-xl font-medium transition-colors shadow-lg shadow-indigo-100"
        >
          <Plus size={18} />
          Tambah Sesi
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sessions.map((session) => (
          <div key={session.id} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-indigo-300 transition-all">
            <div className="absolute top-0 right-0 p-3">
               <span className="bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase px-2 py-1 rounded">
                SESI {session.sessionNumber}
              </span>
            </div>
            
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-slate-100 rounded-xl text-slate-600">
                <Book size={24} />
              </div>
              <div>
                <h4 className="font-bold text-slate-800">{session.subject}</h4>
                <p className="text-xs text-slate-500">Paket: {packages.find(p => p.id === session.packageId)?.name || 'Paket tidak ditemukan'}</p>
              </div>
            </div>
            
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Calendar size={16} className="text-indigo-500" />
                <span>{session.date}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Clock size={16} className="text-indigo-500" />
                <span>{session.time} - {session.endTime || '--:--'} WIB</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Hourglass size={16} className="text-indigo-500" />
                <span className="font-bold">{session.duration} Menit</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Users size={16} className="text-indigo-500" />
                <span>{Array.isArray(session.studentIds) ? session.studentIds.length : 0} Siswa</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={(e) => { e.stopPropagation(); handleOpenEdit(session); }}
                className="flex-1 flex items-center justify-center gap-2 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-sm font-bold rounded-xl border border-indigo-100 transition-colors"
              >
                <Edit3 size={16} /> Edit
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(session.id); }}
                className="flex-1 flex items-center justify-center gap-2 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-bold rounded-xl border border-red-100 transition-colors"
              >
                <Trash2 size={16} /> Hapus
              </button>
            </div>
          </div>
        ))}
      </div>

      {deleteConfirmId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden p-8 text-center space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-2">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase">Hapus Sesi?</h3>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">Tindakan ini tidak dapat dibatalkan.</p>
            <div className="flex gap-3 pt-4">
              <button onClick={() => setDeleteConfirmId(null)} className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all">Batal</button>
              <button onClick={confirmDelete} className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-200">Ya, Hapus</button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="p-8 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">{editingSessionId ? 'Edit Sesi' : 'Tambah Sesi'}</h3>
                <p className="text-sm text-slate-500 font-medium">Tentukan jadwal, durasi, dan daftar peserta.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Mata Pelajaran</label>
                  <select className="w-full px-5 py-3 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold bg-white" value={formData.subject} onChange={(e) => setFormData({...formData, subject: e.target.value as Subject})}>
                    <option value={Subject.BAHASA_INDONESIA}>Bahasa Indonesia</option>
                    <option value={Subject.MATEMATIKA}>Matematika</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Paket Soal</label>
                  <select required className="w-full px-5 py-3 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold bg-white" value={formData.packageId} onChange={(e) => setFormData({...formData, packageId: e.target.value})}>
                    <option value="">-- Pilih Paket --</option>
                    {filteredPackages.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Tanggal</label><input type="date" required className="w-full px-5 py-3 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} /></div>
                <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Mulai (WIB)</label><input type="time" required className="w-full px-5 py-3 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold" value={formData.time} onChange={(e) => setFormData({...formData, time: e.target.value})} /></div>
                <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Batas Selesai</label><input type="time" required className="w-full px-5 py-3 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold" value={formData.endTime} onChange={(e) => setFormData({...formData, endTime: e.target.value})} /></div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Durasi (Menit)</label>
                  <input type="number" min="1" required className="w-full px-5 py-3 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold" value={formData.duration} onChange={(e) => setFormData({...formData, duration: parseInt(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Nomor Sesi</label>
                  <input type="number" min="1" className="w-full px-5 py-3 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold" value={formData.sessionNumber} onChange={(e) => setFormData({...formData, sessionNumber: parseInt(e.target.value)})} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Peserta</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 h-48 overflow-y-auto p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                  {students.map(student => (
                    <label key={student.id} className="flex items-center gap-3 p-2 bg-white rounded-xl border border-slate-100 cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 rounded text-indigo-600" checked={formData.selectedStudentIds.includes(student.id)} onChange={(e) => {
                        const ids = e.target.checked ? [...formData.selectedStudentIds, student.id] : formData.selectedStudentIds.filter(id => id !== student.id);
                        setFormData({...formData, selectedStudentIds: ids});
                      }} />
                      <span className="text-xs font-bold text-slate-700">{student.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-8 py-4 border-2 border-slate-200 text-slate-600 rounded-2xl font-black text-sm uppercase">Batal</button>
                <button type="submit" className="flex-1 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase shadow-xl shadow-indigo-100">Simpan Sesi</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleManagement;
