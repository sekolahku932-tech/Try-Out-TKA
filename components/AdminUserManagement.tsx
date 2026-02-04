
import React, { useState } from 'react';
import { Plus, Trash2, User, Key, X, Shield, Lock, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { AdminUser } from '../types';

interface AdminUserManagementProps {
  adminUsers: AdminUser[];
  onAdd: (user: AdminUser) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const AdminUserManagement: React.FC<AdminUserManagementProps> = ({ adminUsers, onAdd, onDelete }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: ''
  });

  const togglePassword = (id: string) => {
    setShowPasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const newUser: AdminUser = {
      id: Date.now().toString(),
      ...formData,
      createdAt: Date.now(),
      schoolId: '' // This should be handled by the parent
    };
    await onAdd(newUser);
    setFormData({ name: '', username: '', password: '' });
    setIsModalOpen(false);
  };

  const handleDeleteConfirm = () => {
    if (userToDelete) {
      onDelete(userToDelete);
      setUserToDelete(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl"><Shield size={24} /></div>
            <div>
              <h3 className="text-xl font-bold text-slate-800">Manajemen Admin</h3>
              <p className="text-sm text-slate-500">Kelola akses akun administrator sistem.</p>
            </div>
          </div>
          <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg active:scale-95"><Plus size={18} />Tambah Admin</button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100"><tr><th className="px-8 py-5">Nama Administrator</th><th className="px-8 py-5">Username</th><th className="px-8 py-5">Password</th><th className="px-8 py-5 text-right">Aksi</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {adminUsers.length > 0 ? adminUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all"><User size={20} /></div><p className="font-bold text-slate-800">{user.name}</p></div></td>
                  <td className="px-8 py-5"><span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100">{user.username}</span></td>
                  <td className="px-8 py-5"><div className="flex items-center gap-3 text-slate-500 font-mono text-sm"><span className="font-bold">{showPasswords[user.id] ? user.password : '••••••••'}</span><button onClick={() => togglePassword(user.id)} className="text-slate-300 hover:text-indigo-600 transition-colors">{showPasswords[user.id] ? <EyeOff size={14} /> : <Eye size={14} />}</button></div></td>
                  <td className="px-8 py-5 text-right"><button onClick={() => setUserToDelete(user.id)} className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={18} /></button></td>
                </tr>
              )) : (<tr><td colSpan={4} className="px-8 py-16 text-center"><div className="flex flex-col items-center gap-2 opacity-30"><Shield size={48} /><p className="italic font-bold">Belum ada user admin tambahan.</p></div></td></tr>)}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden p-8 text-center space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-2">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase">Hapus Admin?</h3>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">Akun administrator ini tidak akan dapat login lagi. Tindakan ini tidak dapat dibatalkan.</p>
            <div className="flex gap-3 pt-4">
              <button onClick={() => setUserToDelete(null)} className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all">Batal</button>
              <button onClick={handleDeleteConfirm} className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-200">Ya, Hapus</button>
            </div>
          </div>
        </div>
      )}

      {/* Info Card */}
      <div className="bg-amber-50 border border-amber-200 p-6 rounded-3xl flex gap-4">
        <div className="p-3 bg-amber-100 text-amber-600 h-fit rounded-2xl"><Key size={24} /></div>
        <div><h4 className="font-bold text-amber-800">Keamanan Akun</h4><p className="text-sm text-amber-700/80 leading-relaxed mt-1">Data login admin sangat krusial. Pastikan setiap personil menggunakan username dan password yang kuat serta unik.</p></div>
      </div>

      {/* Add Admin Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="p-8 border-b border-slate-100 bg-slate-50 flex justify-between items-center"><h3 className="text-2xl font-black text-slate-800 tracking-tight">Admin Baru</h3><button onClick={() => setIsModalOpen(false)} className="text-slate-400 p-2 hover:bg-slate-200 rounded-full transition-all"><X size={24} /></button></div>
            <form onSubmit={handleAdd} className="p-8 space-y-6">
              <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nama Lengkap</label><div className="relative group"><div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors"><User size={20} /></div><input required className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></div></div>
              <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Username Login</label><div className="relative group"><div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors"><Lock size={20} /></div><input required className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-mono font-bold" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} /></div></div>
              <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Password</label><div className="relative group"><div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors"><Key size={20} /></div><input required type="password" className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} /></div></div>
              <div className="flex gap-4 pt-4"><button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-6 py-4 border-2 border-slate-200 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all">Batal</button><button type="submit" className="flex-1 px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all active:scale-95">Simpan Admin</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUserManagement;
