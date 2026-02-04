
import React, { useState, useEffect } from 'react';
import { UserRole, School as SchoolType, FirebaseConfig } from '../types';
import { ShieldCheck, UserCircle2, ArrowRight, Lock, User, School, Database, Globe } from 'lucide-react';
import { db, getSchoolFirestore } from '../lib/firebase';
import { collection, query, where, getDocs, setDoc, doc } from 'firebase/firestore';

interface LoginFormProps {
  onLogin: (role: UserRole, user: any, schoolId: string | null, schoolDb?: any) => void;
  examTitle: string;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLogin, examTitle }) => {
  const [activeTab, setActiveTab] = useState<UserRole>('STUDENT');
  const [schoolCode, setSchoolCode] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSystemEmpty, setIsSystemEmpty] = useState(false);

  useEffect(() => {
    const checkAdmins = async () => {
      try {
        const snap = await getDocs(collection(db, 'system_admins'));
        if (snap.empty) setIsSystemEmpty(true);
      } catch (e) {
        console.warn("Central DB Check Failed");
      }
    };
    checkAdmins();
  }, []);

  const handleInitialize = async () => {
    if (!username || !password) {
      setError('Lengkapi kredensial admin pusat.');
      return;
    }
    setIsVerifying(true);
    try {
      const adminId = Date.now().toString();
      const adminData = { id: adminId, username, password, name: 'Super Administrator', createdAt: Date.now() };
      await setDoc(doc(db, 'system_admins', adminId), adminData);
      onLogin('SUPER_ADMIN', adminData, null);
    } catch (err) {
      setError('Gagal inisialisasi pusat.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsVerifying(true);

    try {
      const formattedCode = schoolCode.trim().toUpperCase();

      // 1. CEK ADMIN PUSAT (DATABASE REGISTRY)
      if (formattedCode === 'PUSAT' && activeTab === 'ADMIN') {
        const qSuper = query(collection(db, 'system_admins'), where('username', '==', username), where('password', '==', password));
        const superSnap = await getDocs(qSuper);
        if (!superSnap.empty) {
          onLogin('SUPER_ADMIN', { ...superSnap.docs[0].data(), id: superSnap.docs[0].id }, null);
          return;
        }
        setError(isSystemEmpty ? 'Sistem kosong. Klik tombol Inisialisasi.' : 'Kredensial Pusat salah.');
        setIsVerifying(false);
        return;
      }

      // 2. CEK REGISTRY SEKOLAH DI PUSAT
      const qSchool = query(collection(db, 'schools'), where('code', '==', formattedCode));
      const schoolSnap = await getDocs(qSchool);

      if (schoolSnap.empty) {
        setError('Kode Sekolah/Otoritas tidak terdaftar di Pusat.');
        setIsVerifying(false);
        return;
      }

      const schoolData = schoolSnap.docs[0].data() as SchoolType;
      const schoolId = schoolSnap.docs[0].id;

      // 3. INISIALISASI DATABASE LEMBAGA SECARA DINAMIS
      const targetDb = getSchoolFirestore(schoolData.firebaseConfig, schoolId);

      // 4. VERIFIKASI USER DI DATABASE LEMBAGA
      const userCol = activeTab === 'ADMIN' ? 'admin_users' : 'students';
      const qUser = query(collection(targetDb, userCol), where('username', '==', username), where('password', '==', password));
      const userSnap = await getDocs(qUser);

      if (userSnap.empty) {
        setError(`Kredensial tidak ditemukan di database ${schoolData.name}.`);
        setIsVerifying(false);
        return;
      }

      const userData = userSnap.docs[0].data();
      onLogin(activeTab, { ...userData, id: userSnap.docs[0].id }, schoolId, targetDb);

    } catch (err) {
      console.error(err);
      setError('Koneksi database lembaga gagal. Periksa konfigurasi Firebase.');
    } finally {
      setIsVerifying(false);
    }
  };

  const isPusatMode = schoolCode.trim().toUpperCase() === 'PUSAT' && activeTab === 'ADMIN';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
      {/* Background Ornaments */}
      <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
        <div className="absolute top-10 left-10 w-64 h-64 bg-indigo-500 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-10 right-10 w-64 h-64 bg-emerald-500 rounded-full blur-[120px]"></div>
      </div>

      <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/10 rounded-[2.5rem] shadow-2xl p-10 relative z-10">
        <div className="text-center mb-8">
          <div className={`w-20 h-20 mx-auto mb-4 rounded-3xl flex items-center justify-center shadow-2xl rotate-3 transition-all duration-500 bg-gradient-to-br ${isPusatMode ? 'from-amber-500 to-amber-700' : 'from-indigo-500 to-indigo-700'}`}>
            <Globe size={40} className="text-white -rotate-3" />
          </div>
          <h2 className="text-3xl font-black text-white tracking-tighter uppercase leading-none mb-2">
            {isPusatMode ? 'Registry Pusat' : 'TRY OUT TKA'}
          </h2>
          <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.3em]">Multi-Tenant Assessment System</p>
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
            PENGELOLA
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest px-1">Otoritas / Kode Sekolah</label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-indigo-400"><School size={18} /></div>
              <input
                required
                placeholder="MISAL: PUSAT / SMK01"
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-white/10 outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-bold uppercase tracking-widest"
                value={schoolCode}
                onChange={(e) => setSchoolCode(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest px-1">Username</label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-indigo-400"><User size={18} /></div>
              <input
                required
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-bold"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest px-1">Password</label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-indigo-400"><Lock size={18} /></div>
              <input
                required
                type="password"
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-bold"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-[11px] font-bold text-red-400 text-center">{error}</div>}

          {isSystemEmpty && isPusatMode ? (
            <button
              onClick={handleInitialize}
              type="button"
              className="w-full bg-amber-600 hover:bg-amber-500 text-white font-black py-4 rounded-2xl shadow-xl shadow-amber-600/20 transition-all flex items-center justify-center gap-2"
            >
              <Database size={18} /> INISIALISASI PUSAT
            </button>
          ) : (
            <button
              disabled={isVerifying}
              type="submit"
              className={`w-full py-4 rounded-2xl text-white font-black shadow-xl transition-all flex items-center justify-center gap-3 active:scale-95 ${isPusatMode ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20' : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20'}`}
            >
              {isVerifying ? 'MEMVERIFIKASI...' : 'MASUK KE SISTEM'}
              {!isVerifying && <ArrowRight size={18} />}
            </button>
          )}
        </form>
      </div>
      
      {/* Branding Pembuat Aplikasi */}
      <div className="mt-8 relative z-10 text-center animate-in fade-in slide-in-from-top-4 duration-1000">
        <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.15em] hover:text-white/40 transition-colors cursor-default">
          © 2026 TryOut Akademik • Digital Assessment Solution By. Ariyanto Rahman
        </p>
      </div>
    </div>
  );
};

export default LoginForm;
