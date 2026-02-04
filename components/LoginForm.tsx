
import React, { useState, useEffect } from 'react';
import { UserRole } from '../types';
import { ArrowRight, Lock, User, Database, Globe, Loader2, ShieldCheck } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, setDoc, doc } from 'firebase/firestore';

interface LoginFormProps {
  onLogin: (role: UserRole, user: any) => void;
  examTitle: string;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLogin, examTitle }) => {
  const [activeTab, setActiveTab] = useState<UserRole>('STUDENT');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isNewSystem, setIsNewSystem] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const snap = await getDocs(collection(db, 'admin_users'));
        if (snap.empty) setIsNewSystem(true);
      } catch (e) {
        console.warn("Database Connection Error");
      }
    };
    checkStatus();
  }, []);

  const handleSetup = async () => {
    if (!username || !password) {
      setError('Masukkan username & password untuk admin pertama.');
      return;
    }
    setIsVerifying(true);
    try {
      const adminId = Date.now().toString();
      const adminData = { 
        id: adminId, 
        username: username.trim(), 
        password: password.trim(), 
        name: 'Administrator Utama', 
        createdAt: Date.now() 
      };
      await setDoc(doc(db, 'admin_users', adminId), adminData);
      onLogin('ADMIN', adminData);
    } catch (err) {
      setError('Gagal setup admin.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsVerifying(true);

    const cleanUser = username.trim();
    const cleanPass = password.trim();
    const collectionName = activeTab === 'ADMIN' ? 'admin_users' : 'students';

    try {
      const q = query(
        collection(db, collectionName), 
        where('username', '==', cleanUser), 
        where('password', '==', cleanPass)
      );
      const snap = await getDocs(q);

      if (snap.empty) {
        setError('Username atau Password salah.');
        setIsVerifying(false);
        return;
      }

      const userData = snap.docs[0].data();
      onLogin(activeTab, { ...userData, id: snap.docs[0].id });

    } catch (err) {
      console.error(err);
      setError('Terjadi kesalahan koneksi.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
      {/* Background Ornaments */}
      <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
        <div className="absolute top-10 left-10 w-64 h-64 bg-indigo-500 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-10 right-10 w-64 h-64 bg-emerald-500 rounded-full blur-[120px]"></div>
      </div>

      <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/10 rounded-[2.5rem] shadow-2xl p-10 relative z-10">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-3xl flex items-center justify-center shadow-2xl transition-all duration-500 bg-gradient-to-br from-indigo-500 to-indigo-700">
            <ShieldCheck size={40} className="text-white" />
          </div>
          <h2 className="text-2xl font-black text-white tracking-tighter uppercase leading-none mb-2">
            TRY OUT TKA
          </h2>
          <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.3em]">
            Digital School Solution
          </p>
        </div>

        <div className="flex bg-black/20 p-1 rounded-2xl mb-8 border border-white/5">
          <button
            onClick={() => setActiveTab('STUDENT')}
            className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${activeTab === 'STUDENT' ? 'bg-white text-slate-900 shadow-lg' : 'text-white/40 hover:text-white'}`}
          >
            PESERTA
          </button>
          <button
            onClick={() => setActiveTab('ADMIN')}
            className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${activeTab === 'ADMIN' ? 'bg-white text-slate-900 shadow-lg' : 'text-white/40 hover:text-white'}`}
          >
            PROKTOR
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest px-1">Username</label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-indigo-400"><User size={18} /></div>
              <input
                required
                autoComplete="username"
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-bold"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest px-1">Password</label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-indigo-400"><Lock size={18} /></div>
              <input
                required
                type="password"
                autoComplete="current-password"
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-bold"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-[11px] font-bold text-red-400 text-center animate-in fade-in slide-in-from-top-1">
              {error}
            </div>
          )}

          {isNewSystem ? (
            <button
              onClick={handleSetup}
              type="button"
              className="w-full bg-amber-600 hover:bg-amber-500 text-white font-black py-4 rounded-2xl shadow-xl shadow-amber-600/20 transition-all flex items-center justify-center gap-2"
            >
              {isVerifying ? <Loader2 className="animate-spin" size={18} /> : <Database size={18} />}
              SETUP ADMIN PERTAMA
            </button>
          ) : (
            <button
              disabled={isVerifying}
              type="submit"
              className="w-full py-4 rounded-2xl text-white font-black shadow-xl transition-all flex items-center justify-center gap-3 active:scale-95 bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  MEMVERIFIKASI...
                </>
              ) : (
                <>
                  MASUK KE SISTEM
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          )}
        </form>
      </div>
      
      {/* Branding */}
      <div className="mt-8 relative z-10 text-center animate-in fade-in slide-in-from-top-4 duration-1000">
        <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.15em]">
          TryOut Akademik • Digital School Solution By Ariyanto Rahman
        </p>
      </div>
    </div>
  );
};

export default LoginForm;
