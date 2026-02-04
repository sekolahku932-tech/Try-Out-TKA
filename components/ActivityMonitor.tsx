
import React, { useState, useEffect } from 'react';
import { Activity, Clock, Search, Filter, AlertCircle, RefreshCw, CheckCircle2, User } from 'lucide-react';
import { TestSession, StudentProgress, Subject } from '../types';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';

interface ActivityMonitorProps {
  sessions: TestSession[];
}

const ActivityMonitor: React.FC<ActivityMonitorProps> = ({ sessions }) => {
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [progressData, setProgressData] = useState<StudentProgress[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (selectedSessionId) {
      const q = query(collection(db, 'test_progress'), where('sessionId', '==', selectedSessionId));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => doc.data() as StudentProgress);
        setProgressData(data);
      });
      return () => unsubscribe();
    } else {
      setProgressData([]);
    }
  }, [selectedSessionId]);

  const filteredData = progressData.filter(p => 
    p.studentName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.nisn.includes(searchTerm)
  );

  const getStatusColor = (status: string, lastActive: number) => {
    const isOnline = currentTime - lastActive < 45000; // 45 seconds heartbeat
    if (status === 'FINISHED') return 'bg-emerald-100 text-emerald-600 border-emerald-200';
    if (!isOnline) return 'bg-slate-100 text-slate-400 border-slate-200';
    return 'bg-indigo-100 text-indigo-600 border-indigo-200';
  };

  const getStatusLabel = (status: string, lastActive: number) => {
    const isOnline = currentTime - lastActive < 45000;
    if (status === 'FINISHED') return 'SELESAI';
    if (!isOnline) return 'OFFLINE';
    return 'SEDANG MENGERJAKAN';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Session Selector */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-fit">
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Filter size={14} /> Pilih Sesi Ujian
          </h3>
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {sessions.map(session => (
              <button
                key={session.id}
                onClick={() => setSelectedSessionId(session.id)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  selectedSessionId === session.id 
                  ? 'border-indigo-600 bg-indigo-50 shadow-sm' 
                  : 'border-slate-100 bg-slate-50 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-2 h-2 rounded-full ${session.subject === Subject.MATEMATIKA ? 'bg-orange-500' : 'bg-blue-500'}`}></span>
                  <span className="text-xs font-black uppercase tracking-tight text-slate-400">SESI {session.sessionNumber}</span>
                </div>
                <p className="font-bold text-slate-800 text-sm">{session.subject}</p>
                <p className="text-[10px] font-medium text-slate-500">{session.date}</p>
              </button>
            ))}
            {sessions.length === 0 && <p className="text-xs text-slate-400 italic text-center py-4">Tidak ada sesi aktif.</p>}
          </div>
        </div>

        {/* Monitor Area */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Cari nama siswa..." 
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                   <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></div>
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Live Monitoring</span>
                </div>
                <button 
                  onClick={() => setSelectedSessionId(selectedSessionId)}
                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                >
                  <RefreshCw size={18} />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <tr>
                    <th className="px-6 py-4">Peserta</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Progres Jawaban</th>
                    <th className="px-6 py-4">Posisi Soal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredData.length > 0 ? filteredData.map(progress => {
                    const percentage = progress.totalQuestions > 0 
                      ? Math.round((progress.answeredCount / progress.totalQuestions) * 100) 
                      : 0;
                    
                    return (
                      <tr key={progress.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                              <User size={16} />
                            </div>
                            <div>
                              <p className="font-bold text-slate-800 text-sm">{progress.studentName}</p>
                              <p className="text-[10px] font-mono text-slate-400">{progress.nisn}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-[9px] font-black border ${getStatusColor(progress.status, progress.lastActive)}`}>
                            {getStatusLabel(progress.status, progress.lastActive)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="w-full max-w-[160px] space-y-1.5">
                            <div className="flex justify-between text-[10px] font-bold">
                              <span className="text-slate-500">{progress.answeredCount} / {progress.totalQuestions} Soal</span>
                              <span className="text-indigo-600">{percentage}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full transition-all duration-1000 ${progress.status === 'FINISHED' ? 'bg-emerald-500' : 'bg-indigo-600'}`}
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="px-3 py-1 bg-slate-100 rounded-lg font-mono font-bold text-xs text-slate-600 border border-slate-200">
                              NO. {progress.currentQuestionIndex + 1}
                            </div>
                            {progress.status === 'FINISHED' && <CheckCircle2 size={16} className="text-emerald-500" />}
                          </div>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-20 text-center text-slate-400 italic text-sm">
                        {selectedSessionId ? 'Belum ada aktivitas peserta pada sesi ini.' : 'Silakan pilih sesi ujian untuk memonitor aktivitas.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Stats Summary */}
          {selectedSessionId && progressData.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Login</p>
                <p className="text-2xl font-black text-slate-800">{progressData.length}</p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Sedang Mengerjakan</p>
                <p className="text-2xl font-black text-indigo-600">{progressData.filter(p => p.status === 'WORKING').length}</p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Sudah Selesai</p>
                <p className="text-2xl font-black text-emerald-600">{progressData.filter(p => p.status === 'FINISHED').length}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActivityMonitor;
