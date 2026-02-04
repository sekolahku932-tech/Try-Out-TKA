
import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, School, Key, X, Calendar, Edit3, Database, 
  Info, AlertTriangle, Users2, User, Shield, Lock, Eye, EyeOff, 
  CheckCircle2, Loader2, Save
} from 'lucide-react';
import { School as SchoolType, FirebaseConfig, AdminUser } from '../types';
import { getSchoolFirestore } from '../lib/firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, query } from 'firebase/firestore';

interface SchoolManagementProps {
  schools: SchoolType[];
  onAdd: (school: SchoolType) => Promise<void>;
  onUpdate: (school: SchoolType) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const SchoolManagement: React.FC<SchoolManagementProps> = ({ schools, onAdd, onUpdate, onDelete }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'BASIC' | 'FIREBASE'>('BASIC');
  const [editingSchool, setEditingSchool] = useState<SchoolType | null>(null);
  const [schoolToDelete, setSchoolToDelete] = useState<SchoolType | null>(null);
  
  // State untuk Manajemen Admin Sekolah
  const [managingAdminsFor, setManagingAdminsFor] = useState<SchoolType | null>(null);
  const [schoolAdmins, setSchoolAdmins] = useState<AdminUser[]>([]);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [isSavingAdmin, setIsSavingAdmin] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  
  const [adminFormData, setAdminFormData] = useState({ 
    id: '',
    name: '', 
    username: '', 
    password: '' 
  });

  const initialForm = {
    name: '',
    code: '',
    firebase: {
      apiKey: '',
      authDomain: '',
      projectId: '',
      storageBucket: '',
      messagingSenderId: '',
      appId: ''
    }
  };
  
  const [formData, setFormData] = useState(initialForm);

  // Listener untuk Admin Sekolah tertentu
  useEffect(() => {
    if (managingAdminsFor) {
      try {
        const targetDb = getSchoolFirestore(managingAdminsFor.firebaseConfig, managingAdminsFor.id);
        const unsub = onSnapshot(collection(targetDb, 'admin_users'), 
          (snapshot) => {
            setSchoolAdmins(snapshot.docs.map(doc => ({ ...(doc.data() as AdminUser), id: doc.id })));
          },
          (error) => {
            console.error("Listener Error:", error);
            setAdminError("Gagal memuat daftar admin. Periksa Firebase Rules koleksi 'admin_users'.");
          }
        );
        return () => unsub();
      } catch (err) {
        setAdminError("Koneksi ke database lembaga gagal.");
      }
    }
  }, [managingAdminsFor]);

  const handleOpenAdd = () => {
    setEditingSchool(null);
    setFormData(initialForm);
    setActiveTab('BASIC');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (school: SchoolType) => {
    setEditingSchool(school);
    setFormData({
      name: school.name,
      code: school.code,
      firebase: school.firebaseConfig || initialForm.firebase
    });
    setActiveTab('BASIC');
    setIsModalOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (schoolToDelete) {
      onDelete(schoolToDelete.id);
      setSchoolToDelete(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isConfigComplete = Object.values(formData.firebase).every(v => v !== '');
    const config = isConfigComplete ? formData.firebase : undefined;
    if (editingSchool) { 
      await onUpdate({ ...editingSchool, name: formData.name, code: formData.code.toUpperCase().trim(), firebaseConfig: config }); 
    } else { 
      await onAdd({ id: Date.now().toString(), name: formData.name, code: formData.code.toUpperCase().trim(), isActive: true, createdAt: Date.now(), firebaseConfig: config }); 
    }
    setIsModalOpen(false);
  };

  // Fungsi Manajemen Admin
  const handleOpenAdminForm = (admin?: AdminUser) => {
    if (admin) {
      setAdminFormData({ id: admin.id, name: admin.name, username: admin.username, password: admin.password });
    } else {
      setAdminFormData({ id: '', name: '', username: '', password: '' });
    }
    setAdminError(null);
    setIsAdminModalOpen(true);
  };

  const handleSaveAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managingAdminsFor) return;
    
    setIsSavingAdmin(true);
    setAdminError(null);
    
    try {
      const targetDb = getSchoolFirestore(managingAdminsFor.firebaseConfig, managingAdminsFor.id);
      const adminId = adminFormData.id || Date.now().toString();
      
      const adminData: AdminUser = {
        id: adminId,
        name: adminFormData.name,
        username: adminFormData.username.toLowerCase().trim(),
        password: adminFormData.password,
        createdAt: Date.now(),
        schoolId: managingAdminsFor.id
      };

      await setDoc(doc(targetDb, 'admin_users', adminId), adminData);
      
      setIsSavingAdmin(false);
      setIsAdminModalOpen(false);
      setAdminFormData({ id: '', name: '', username: '', password: '' });
    } catch (err: any) {
      console.error("Firebase Save Error:", err);
      setIsSavingAdmin(false);
      if (err.code === 'permission-denied') {
        setAdminError("Izin Ditolak: Pastikan Firebase Rules mengizinkan penulisan ke koleksi 'admin_users'.");
      } else {
        setAdminError("Gagal menyimpan data: " + err.message);
      }
    }
  };

  const handleDeleteAdmin = async (id: string) => {
    if (!managingAdminsFor) return;
    if (!confirm("Hapus akun admin ini?")) return;

    try {
      const targetDb = getSchoolFirestore(managingAdminsFor.firebaseConfig, managingAdminsFor.id);
      await deleteDoc(doc(targetDb, 'admin_users', id));
    } catch (err) {
      alert("Gagal menghapus admin. Periksa izin Firebase.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-600 text-white rounded-2xl"><School size={24} /></div>
            <div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Manajemen Lembaga</h3>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-0.5">Otoritas Pusat • Multi-Database Control</p>
            </div>
          </div>
          <button onClick={handleOpenAdd} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-indigo-100">Daftar Sekolah Baru</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
              <tr>
                <th className="px-8 py-5">Nama Sekolah</th>
                <th className="px-8 py-5">Database</th>
                <th className="px-8 py-5 text-center">Admin</th>
                <th className="px-8 py-5">Kode Akses</th>
                <th className="px-8 py-5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {schools.map((school) => (
                <tr key={school.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-5">
                    <p className="font-bold text-slate-800">{school.name}</p>
                    <p className="text-[10px] text-slate-400 font-medium">Terdaftar: {new Date(school.createdAt).toLocaleDateString()}</p>
                  </td>
                  <td className="px-8 py-5">
                    {school.firebaseConfig ? (
                      <span className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 text-[10px] font-black uppercase">
                        <Database size={12} /> External
                      </span>
                    ) : (
                      <span className="text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100 text-[10px] font-black uppercase">
                        Shared DB
                      </span>
                    )}
                  </td>
                  <td className="px-8 py-5 text-center">
                    <button 
                      onClick={() => setManagingAdminsFor(school)}
                      className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all relative"
                      title="Kelola Admin Sekolah"
                    >
                      <Users2 size={20} />
                      {/* Counter dot if needed */}
                    </button>
                  </td>
                  <td className="px-8 py-5">
                    <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100 uppercase tracking-widest">
                      {school.code}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleOpenEdit(school)} className="p-2.5 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                        <Edit3 size={18} />
                      </button>
                      <button onClick={() => setSchoolToDelete(school)} className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
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

      {/* Modal Manajemen Admin Sekolah */}
      {managingAdminsFor && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center z-[120] p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-200 border border-white/20">
            <div className="p-8 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200">
                  <Users2 size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase">Kelola Admin</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{managingAdminsFor.name}</p>
                </div>
              </div>
              <button onClick={() => setManagingAdminsFor(null)} className="text-slate-400 p-2 hover:bg-slate-200 rounded-full transition-all">
                <X size={24} />
              </button>
            </div>

            <div className="p-8">
              {adminError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex gap-3 text-red-700 animate-in slide-in-from-top duration-300">
                  <AlertTriangle size={20} className="shrink-0" />
                  <p className="text-xs font-bold leading-relaxed">{adminError}</p>
                </div>
              )}

              <div className="flex justify-between items-center mb-6">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Daftar Administrator</h4>
                <button 
                  onClick={() => handleOpenAdminForm()}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-indigo-100"
                >
                  <Plus size={14} /> Tambah Admin
                </button>
              </div>

              <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                {schoolAdmins.length > 0 ? schoolAdmins.map(admin => (
                  <div key={admin.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-indigo-200 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-200 text-slate-400 group-hover:text-indigo-600 transition-colors">
                        <User size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{admin.name}</p>
                        <div className="flex items-center gap-3">
                          <p className="text-[10px] font-mono font-black text-indigo-600 uppercase">USER: {admin.username}</p>
                          <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
                            <span>PASS: {showPasswords[admin.id] ? admin.password : '••••••••'}</span>
                            <button onClick={() => setShowPasswords(prev => ({...prev, [admin.id]: !prev[admin.id]}))} className="hover:text-indigo-600 transition-colors">
                              {showPasswords[admin.id] ? <EyeOff size={10} /> : <Eye size={10} />}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleOpenAdminForm(admin)}
                        className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteAdmin(admin.id)}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                )) : (
                  <div className="py-12 text-center text-slate-300 italic font-bold text-sm bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                    Belum ada admin untuk sekolah ini.
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setManagingAdminsFor(null)}
                className="px-8 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95"
              >
                Tutup Panel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah/Edit Admin Sekolah (Sub-modal) */}
      {isAdminModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[130] p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="p-8 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-800 tracking-tight">
                {adminFormData.id ? 'Edit Akun Admin' : 'Akun Admin Baru'}
              </h3>
              <button onClick={() => setIsAdminModalOpen(false)} className="text-slate-400 p-2 hover:bg-slate-200 rounded-full transition-all">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSaveAdmin} className="p-8 space-y-6">
              {adminError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex gap-3 text-red-700">
                  <AlertTriangle size={18} className="shrink-0" />
                  <p className="text-[10px] font-bold leading-relaxed">{adminError}</p>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nama Lengkap</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors"><User size={20} /></div>
                  <input required className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-bold" value={adminFormData.name} onChange={(e) => setAdminFormData({...adminFormData, name: e.target.value})} placeholder="Nama Proktor" />
                </div>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Username Login</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors"><Lock size={20} /></div>
                  <input required className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-mono font-bold" value={adminFormData.username} onChange={(e) => setAdminFormData({...adminFormData, username: e.target.value.toLowerCase().replace(/\s/g, '')})} placeholder="admin_sekolah" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Password</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors"><Key size={20} /></div>
                  <input required className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-bold" value={adminFormData.password} onChange={(e) => setAdminFormData({...adminFormData, password: e.target.value})} placeholder="minimal 8 karakter" />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsAdminModalOpen(false)} className="flex-1 px-6 py-4 border-2 border-slate-200 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all">Batal</button>
                <button 
                  type="submit" 
                  disabled={isSavingAdmin}
                  className="flex-1 px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  {isSavingAdmin ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Proses...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Simpan Akun
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Delete Sekolah Confirmation */}
      {schoolToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[150] p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden p-8 text-center space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-2">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase">Hapus Lembaga?</h3>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">Lembaga <b>{schoolToDelete.name}</b> dan seluruh akses terkait akan dihapus. Tindakan ini permanen.</p>
            <div className="flex gap-3 pt-4">
              <button onClick={() => setSchoolToDelete(null)} className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all">Batal</button>
              <button onClick={handleDeleteConfirm} className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-200">Ya, Hapus</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Daftar/Edit Sekolah */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="p-8 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">{editingSchool ? 'Edit Sekolah' : 'Tambah Sekolah'}</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Pengaturan Identitas & Database</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 p-2 hover:bg-slate-200 rounded-full transition-all">
                <X size={24} />
              </button>
            </div>
            <div className="flex border-b border-slate-100">
              <button onClick={() => setActiveTab('BASIC')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'BASIC' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-400'}`}>Informasi Umum</button>
              <button onClick={() => setActiveTab('FIREBASE')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'FIREBASE' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-400'}`}>Konfigurasi Firebase</button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {activeTab === 'BASIC' ? (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nama Lembaga</label>
                    <input required className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-bold" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Kode Akses Unik</label>
                    <input required className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-mono font-bold uppercase" value={formData.code} onChange={(e) => setFormData({...formData, code: e.target.value})} />
                  </div>
                  <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex gap-3 text-amber-700">
                    <Info size={18} className="shrink-0" />
                    <p className="text-[10px] font-bold leading-relaxed italic">Catatan: Kode akses ini akan digunakan siswa dan admin sekolah saat login.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-[11px] text-slate-500 font-medium mb-4">Lengkapi data di bawah ini jika sekolah menggunakan project Firebase mandiri. Kosongkan jika ingin menggunakan database pusat.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'].map(field => (
                      <div key={field} className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{field}</label>
                        <input className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono" value={(formData.firebase as any)[field]} onChange={(e) => setFormData({...formData, firebase: {...formData.firebase, [field]: e.target.value}})} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 border-2 border-slate-200 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all">Batal</button>
                <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all">Simpan Data Sekolah</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchoolManagement;
