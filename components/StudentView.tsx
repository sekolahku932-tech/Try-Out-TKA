
import React, { useState, useEffect } from 'react';
import { Play, ClipboardCheck, Clock, BookOpen, AlertCircle, CheckCircle2, Square, CheckSquare, ListChecks, User, UserCheck, ShieldAlert, AlertTriangle, LogOut, Timer, AlignLeft, Info, Monitor, PartyPopper } from 'lucide-react';
import { TestSession, QuestionPackage, Student, Subject, QuestionType, Question } from '../types';
import { db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import MathText from './MathText';

interface StudentViewProps {
  student: Student;
  sessions: TestSession[];
  packages: QuestionPackage[];
  schoolName: string;
  onLogout: () => void;
}

const StudentView: React.FC<StudentViewProps> = ({ student, sessions, packages, schoolName, onLogout }) => {
  const [activeTest, setActiveTest] = useState<TestSession | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number | number[]>>({});
  const [isFinished, setIsFinished] = useState(false);
  const [isIdentityConfirmed, setIsIdentityConfirmed] = useState(false);
  const [testStartTime, setTestStartTime] = useState<number | null>(null);
  const [timeRemainingStr, setTimeRemainingStr] = useState<string>('00:00:00');
  const [isTimeUp, setIsTimeUp] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);

  // Update current time every second for reactive UI
  useEffect(() => {
    const clock = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(clock);
  }, []);

  const studentSessions = sessions.filter(s => {
    if (!s.studentIds || !Array.isArray(s.studentIds)) return false;
    return s.studentIds.includes(student.id) || s.studentIds.includes(student.nisn);
  });

  const getSafeDateTime = (dateStr: string, timeStr: string) => {
    if (!dateStr || !timeStr || timeStr.trim() === "") return NaN;
    try {
      const [year, month, day] = dateStr.split('-').map(Number);
      const [hours, minutes] = timeStr.split(':').map(Number);
      if (isNaN(year) || isNaN(hours)) return NaN;
      const date = new Date(year, month - 1, day, hours, minutes, 0);
      return date.getTime();
    } catch (e) { return NaN; }
  };

  const getBinaryLabels = (type: QuestionType) => {
    switch (type) {
      case QuestionType.TRUE_FALSE: return { h1: "BENAR", h2: "SALAH" };
      case QuestionType.AGREE_DISAGREE: return { h1: "SETUJU", h2: "TIDAK SETUJU" };
      case QuestionType.YES_NO: return { h1: "YA", h2: "TIDAK" };
      case QuestionType.MATCH_UNMATCH: return { h1: "SESUAI", h2: "TIDAK SESUAI" };
      default: return { h1: "PILIHAN 1", h2: "PILIHAN 2" };
    }
  };

  const formatStimulus = (text?: string) => {
    if (!text) return null;
    let cleaned = text.replace(/\[JUDUL\]/gi, '').replace(/\[ISI BACAAN\]/gi, '').trim();
    const lines = cleaned.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) return null;
    const title = lines[0];
    const content = lines.slice(1).join('\n');
    return (
      <div className="space-y-6">
        <h4 className="text-2xl md:text-3xl font-black text-slate-900 text-center uppercase tracking-tight leading-tight">{title}</h4>
        <div className="text-slate-700 font-medium text-base md:text-lg leading-relaxed whitespace-pre-wrap text-justify">
          <MathText text={content} />
        </div>
      </div>
    );
  };

  useEffect(() => {
    if (activeTest && !isFinished) {
      const pkg = packages.find(p => p.id === activeTest.packageId);
      const answeredCount = Object.keys(answers).length;
      const syncProgress = async () => {
        try {
          const progressRef = doc(db, 'test_progress', `${activeTest.id}_${student.id}`);
          await setDoc(progressRef, {
            id: `${activeTest.id}_${student.id}`,
            sessionId: activeTest.id,
            studentId: student.id,
            studentName: student.name,
            nisn: student.nisn,
            lastActive: Date.now(),
            currentQuestionIndex,
            totalQuestions: pkg?.questions.length || 0,
            answeredCount,
            status: 'WORKING',
            answers: answers 
          });
        } catch (e) { console.error("Failed to sync progress", e); }
      };
      syncProgress();
      const pulse = setInterval(syncProgress, 30000);
      return () => clearInterval(pulse);
    }
  }, [activeTest, currentQuestionIndex, answers, isFinished, student]);

  useEffect(() => {
    let timer: any;
    if (activeTest && testStartTime && !isFinished) {
      timer = setInterval(() => {
        const now = Date.now();
        const start = getSafeDateTime(activeTest.date, activeTest.time);
        const durationMs = (activeTest.duration || 60) * 60 * 1000;
        const endTimeByDuration = start + durationMs;
        const absoluteEndTime = getSafeDateTime(activeTest.date, activeTest.endTime);
        
        let targetEndTime = 0;
        if (!isNaN(endTimeByDuration) && !isNaN(absoluteEndTime)) targetEndTime = Math.min(endTimeByDuration, absoluteEndTime);
        else if (!isNaN(endTimeByDuration)) targetEndTime = endTimeByDuration;
        else if (!isNaN(absoluteEndTime)) targetEndTime = absoluteEndTime;
        
        const diff = targetEndTime - now;
        if (diff <= 0 && targetEndTime > 0) {
          clearInterval(timer);
          setIsTimeUp(true);
          handleFinishTest(true);
        } else if (targetEndTime > 0) {
          const h = Math.floor(diff / (1000 * 60 * 60));
          const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const s = Math.floor((diff % (1000 * 60)) / 1000);
          setTimeRemainingStr(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
        }
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [activeTest, testStartTime, isFinished]);

  const startTest = (session: TestSession) => {
    const pkg = packages.find(p => p.id === session.packageId);
    if (!pkg) { alert('Maaf, paket soal belum tersedia untuk sesi ini.'); return; }
    
    const now = Date.now();
    const startDateTime = getSafeDateTime(session.date, session.time);
    const GRACE_PERIOD = 300000; // 5 menit toleransi

    if (!isNaN(startDateTime) && now < (startDateTime - GRACE_PERIOD)) {
      const startStr = new Date(startDateTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      alert(`BELUM DIMULAI.\nJadwal: ${startStr} WIB\nJam Anda: ${new Date(now).toLocaleTimeString('id-ID')} WIB`);
      return;
    }

    const durationMs = (session.duration || 60) * 60 * 1000;
    const endFromDuration = startDateTime + durationMs;
    const absoluteEndTime = getSafeDateTime(session.date, session.endTime);
    
    const finalEnd = isNaN(absoluteEndTime) ? endFromDuration : absoluteEndTime;

    if (!isNaN(finalEnd) && now >= finalEnd) { 
      alert('Maaf, waktu akses untuk sesi ini sudah berakhir.'); 
      return; 
    }

    setActiveTest(session);
    setTestStartTime(Date.now());
    setCurrentQuestionIndex(0);
    setAnswers({});
    setIsFinished(false);
    setIsTimeUp(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getSessionStatus = (session: TestSession) => {
    const now = currentTime;
    const start = getSafeDateTime(session.date, session.time);
    const GRACE_PERIOD = 300000; // 5 menit

    if (isNaN(start)) return 'ACTIVE'; 
    if (now < (start - GRACE_PERIOD)) return 'UPCOMING';
    
    const durationMs = (session.duration || 60) * 60 * 1000;
    const endFromDuration = start + durationMs;
    const absoluteEndTime = getSafeDateTime(session.date, session.endTime);
    
    const finalEnd = isNaN(absoluteEndTime) ? endFromDuration : absoluteEndTime;

    if (now >= (start - GRACE_PERIOD) && now < finalEnd) return 'ACTIVE';
    
    return 'ENDED';
  };

  const isBinaryType = (type: QuestionType) => 
    [QuestionType.TRUE_FALSE, QuestionType.AGREE_DISAGREE, QuestionType.YES_NO, QuestionType.MATCH_UNMATCH].includes(type);

  const handleSelectOption = (qId: string, qType: QuestionType, optionIndex: number, subIndex?: number) => {
    if (qType === QuestionType.MCMA) {
      const current = (answers[qId] as number[]) || [];
      if (current.includes(optionIndex)) setAnswers(prev => ({ ...prev, [qId]: current.filter(i => i !== optionIndex) }));
      else setAnswers(prev => ({ ...prev, [qId]: [...current, optionIndex] }));
    } else if (isBinaryType(qType)) {
      const current = (answers[qId] as number[]) || [];
      const newAns = [...current];
      if (subIndex !== undefined) { newAns[subIndex] = optionIndex; setAnswers(prev => ({ ...prev, [qId]: newAns })); }
    } else setAnswers(prev => ({ ...prev, [qId]: optionIndex }));
  };

  const handleFinishTest = async (auto = false) => {
    setIsFinished(true);
    setIsFinishModalOpen(false);
    if (activeTest) {
      const pkg = packages.find(p => p.id === activeTest.packageId);
      try {
        const progressRef = doc(db, 'test_progress', `${activeTest.id}_${student.id}`);
        await setDoc(progressRef, { status: 'FINISHED', lastActive: Date.now(), answeredCount: Object.keys(answers).length, totalQuestions: pkg?.questions.length || 0, answers: answers }, { merge: true });
      } catch (e) {}
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!isIdentityConfirmed) {
    return (
      <div className="max-w-2xl mx-auto py-12 animate-in fade-in zoom-in duration-500">
        <div className="bg-white rounded-[2rem] shadow-2xl border border-slate-200 overflow-hidden">
          <div className="bg-indigo-600 p-8 text-white text-center"><div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-md"><UserCheck size={32} /></div><h3 className="text-xl font-black uppercase tracking-tight">Konfirmasi Identitas</h3><p className="text-indigo-100 text-xs opacity-80">Silakan periksa kembali data diri Anda</p></div>
          <div className="p-8 space-y-5">
            <div className="space-y-3">
              <div className="flex flex-col gap-1 p-4 bg-slate-50 rounded-xl border border-slate-100"><span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nama Lengkap Peserta</span><span className="text-lg font-bold text-slate-800">{student.name}</span></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1 p-4 bg-slate-50 rounded-xl border border-slate-100"><span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">NISN</span><span className="text-base font-bold text-slate-800 font-mono">{student.nisn}</span></div>
                <div className="flex flex-col gap-1 p-4 bg-slate-50 rounded-xl border border-slate-100"><span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Jenis Kelamin</span><span className="text-base font-bold text-slate-800">{student.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</span></div>
              </div>
              <div className="flex flex-col gap-1 p-4 bg-slate-50 rounded-xl border border-slate-100"><span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tempat, Tanggal Lahir</span><span className="text-base font-bold text-slate-800">{student.birthPlace}, {student.birthDate}</span></div>
              <div className="flex flex-col gap-1 p-4 bg-slate-50 rounded-xl border border-slate-100"><span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Username Login</span><span className="text-base font-bold text-indigo-600 font-mono">{student.username}</span></div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-700"><ShieldAlert className="shrink-0 mt-0.5" size={18} /><p className="text-[11px] font-medium leading-relaxed">Apabila terdapat kesalahan pada data, mohon melapor ke Proktor.</p></div>
            <button onClick={() => setIsIdentityConfirmed(true)} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-xl shadow-indigo-100 transition-all flex items-center justify-center gap-3 active:scale-95 text-sm uppercase">YA, DATA SAYA BENAR</button>
            <button onClick={onLogout} className="w-full py-2 text-slate-400 hover:text-red-500 font-bold text-[10px] uppercase tracking-widest transition-colors flex items-center justify-center gap-2"><LogOut size={12} /> BUKAN SAYA, KELUAR</button>
          </div>
        </div>
      </div>
    );
  }

  if (activeTest) {
    const pkg = packages.find(p => p.id === activeTest.packageId);
    if (!pkg) return null;
    const allQuestionsAnswered = pkg.questions.every(q => {
      const ans = answers[q.id];
      if (ans === undefined) return false;
      if (Array.isArray(ans)) {
        if (q.type === QuestionType.MCMA) return ans.length > 0;
        if (isBinaryType(q.type)) return ans.length === q.options.length && ans.every(v => v !== undefined);
      }
      return true;
    });

    if (isFinished) {
      return (
        <div className="max-w-2xl mx-auto py-12 text-center space-y-8 animate-in fade-in zoom-in duration-500">
          <div className="p-12 bg-white rounded-[3rem] shadow-2xl border border-slate-100 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 to-indigo-500"></div>
            
            {isTimeUp && (
              <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 font-black animate-bounce flex items-center justify-center gap-3 text-sm uppercase tracking-widest">
                <Clock size={20} /> WAKTU UJIAN TELAH BERAKHIR!
              </div>
            )}

            <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-lg shadow-emerald-50 transform rotate-6">
              <PartyPopper size={48} />
            </div>

            <h3 className="text-3xl font-black text-slate-900 mb-3 tracking-tight uppercase">Ujian Berhasil Diselesaikan!</h3>
            <p className="text-slate-500 font-medium text-lg leading-relaxed max-w-md mx-auto mb-10">
              Terima kasih, <b>{student.name}</b>. Jawaban Anda telah berhasil disimpan dan dikirim ke server pusat untuk diproses.
            </p>

            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 mb-10 flex items-center gap-5 text-left">
              <div className="p-3 bg-white rounded-2xl text-indigo-600 shadow-sm">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status Sinkronisasi</p>
                <p className="text-sm font-bold text-slate-700">Database Sekolah Terhubung & Aman</p>
              </div>
            </div>

            <button 
              onClick={onLogout} 
              className="w-full py-5 bg-slate-900 hover:bg-indigo-600 text-white font-black rounded-2xl transition-all shadow-2xl shadow-slate-200 flex items-center justify-center gap-4 active:scale-95 text-xs uppercase tracking-[0.2em]"
            >
              <LogOut size={20} /> KELUAR DARI SISTEM
            </button>
            
            <p className="mt-8 text-[10px] font-black text-slate-300 uppercase tracking-widest">System Assessment Hub • bilato sub-district</p>
          </div>
        </div>
      );
    }

    const currentQuestion = pkg.questions[currentQuestionIndex];
    return (
      <div className="max-w-[1400px] mx-auto flex flex-col h-full min-h-screen pb-10">
        <div className="sticky top-0 z-30 bg-slate-50/95 backdrop-blur-md pt-3 pb-1">
          <div className="bg-white px-6 md:px-10 py-3 rounded-2xl shadow-sm border border-slate-200 flex flex-col lg:flex-row justify-between items-center gap-4">
            <div className="w-full lg:w-auto space-y-0.5"><h3 className="font-black text-slate-800 text-lg md:text-xl uppercase tracking-tight leading-none">{pkg.name}</h3><div className="flex flex-wrap items-center gap-3"><p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">PESERTA: <span className="text-slate-700 font-bold">{student.nisn}</span> • <span className="text-indigo-600 font-bold">{currentQuestionIndex + 1}</span> / {pkg.questions.length}</p><div className="flex items-center gap-2 px-3 py-1 rounded-full border shadow-xs text-[9px] font-black bg-white border-slate-100 text-slate-700"><Clock size={12} className="text-slate-400" /><span className="uppercase tracking-widest">SISA: {timeRemainingStr}</span></div></div></div>
            <div className="flex flex-wrap gap-1.5 justify-center lg:justify-end max-w-[650px]">{pkg.questions.map((q, idx) => { const isCurrent = idx === currentQuestionIndex; const ans = answers[q.id]; let isAns = ans !== undefined && (Array.isArray(ans) ? ans.length > 0 : true); return (<button key={idx} onClick={() => { setCurrentQuestionIndex(idx); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all border-2 flex items-center justify-center ${isCurrent ? 'ring-2 ring-indigo-100 border-indigo-600 bg-white text-indigo-600 shadow-sm' : 'border-transparent'} ${isAns ? 'bg-[#f43f5e] text-white' : 'bg-slate-100/80 text-slate-400 hover:bg-slate-200'}`}>{idx + 1}</button>); })}</div>
          </div>
        </div>
        <div className="bg-white px-6 md:px-10 py-6 mt-3 rounded-[1.5rem] shadow-sm border border-slate-200 min-h-[500px] flex flex-col">
          <div className="mb-6">
             <div className="inline-block px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-indigo-100 mb-4">{currentQuestion.type}</div>
             {currentQuestion.imageUrl && currentQuestion.imagePosition === 'above' && (<div className="flex justify-center w-full mb-6"><div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-white"><img src={currentQuestion.imageUrl} alt="Visual" className="max-h-[320px] w-auto h-auto object-contain mx-auto" /></div></div>) }
             {currentQuestion.stimulus && (<div className="mb-6 bg-slate-100 p-6 md:p-10 rounded-[2.5rem] border-l-8 border-indigo-500 shadow-inner"><div className="flex items-center gap-2 mb-6 text-indigo-600 font-black text-[10px] uppercase tracking-widest"><AlignLeft size={14} /> Bacaan Stimulus</div>{formatStimulus(currentQuestion.stimulus)}</div>)}
             {currentQuestion.imageUrl && currentQuestion.imagePosition === 'below' && (<div className="flex justify-center w-full mb-6"><div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-white"><img src={currentQuestion.imageUrl} alt="Visual" className="max-h-[320px] w-auto h-auto object-contain mx-auto" /></div></div>)}
             <div className="bg-slate-50/50 p-6 md:p-8 rounded-[1.5rem] border border-slate-100 relative overflow-hidden"><div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500/20"></div><div className="text-lg md:text-xl font-medium text-slate-800 leading-relaxed tracking-tight text-justify"><MathText text={currentQuestion.text} /></div></div>
          </div>
          <div className="flex-1 w-full space-y-3">
            {isBinaryType(currentQuestion.type) ? (
              <div className="overflow-x-auto rounded-xl border border-slate-200 mt-4 shadow-xs">
                <table className="w-full text-left border-collapse">
                  <thead><tr className="bg-[#26a69a] text-white text-[9px] font-black tracking-widest uppercase"><th className="px-4 py-2.5">Pernyataan</th><th className="px-2 py-2.5 text-center w-20 md:w-32">{getBinaryLabels(currentQuestion.type).h1}</th><th className="px-2 py-2.5 text-center w-20 md:w-32">{getBinaryLabels(currentQuestion.type).h2}</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">{currentQuestion.options.map((stmt, sIdx) => (<tr key={sIdx} className={sIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}><td className="px-4 py-3 text-slate-700 font-semibold text-sm md:text-base leading-snug">{sIdx + 1}. <MathText text={stmt} /></td><td className="px-2 py-3 text-center"><button onClick={() => handleSelectOption(currentQuestion.id, currentQuestion.type, 0, sIdx)} className={`w-7 h-7 rounded-full border-2 mx-auto flex items-center justify-center transition-all ${(answers[currentQuestion.id] as number[])?.[sIdx] === 0 ? 'border-[#26a69a] bg-[#26a69a]/10' : 'border-slate-200 hover:border-indigo-300'}`}>{(answers[currentQuestion.id] as number[])?.[sIdx] === 0 && <div className="w-3.5 h-3.5 rounded-full bg-[#26a69a]"></div>}</button></td><td className="px-2 py-3 text-center"><button onClick={() => handleSelectOption(currentQuestion.id, currentQuestion.type, 1, sIdx)} className={`w-7 h-7 rounded-full border-2 mx-auto flex items-center justify-center transition-all ${(answers[currentQuestion.id] as number[])?.[sIdx] === 1 ? 'border-[#26a69a] bg-[#26a69a]/10' : 'border-slate-200 hover:border-indigo-300'}`}>{(answers[currentQuestion.id] as number[])?.[sIdx] === 1 && <div className="w-3.5 h-3.5 rounded-full bg-[#26a69a]"></div>}</button></td></tr>))}</tbody>
                </table>
              </div>
            ) : currentQuestion.type === QuestionType.MCMA ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 mt-2">
                {currentQuestion.options.map((option, idx) => {
                  const userAnswer = answers[currentQuestion.id] as number[] || [];
                  const isSelected = userAnswer.includes(idx);
                  return (
                    <button key={idx} onClick={() => handleSelectOption(currentQuestion.id, currentQuestion.type, idx)} className={`w-full text-left p-3.5 rounded-2xl border-2 transition-all flex items-start gap-4 ${isSelected ? 'border-indigo-600 bg-indigo-50/20 shadow-xs' : 'border-slate-50 bg-white hover:border-slate-200 hover:bg-slate-50/50'}`}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all flex-shrink-0 text-base ${isSelected ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-400'}`}>
                        {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                      </div>
                      <span className={`text-base md:text-lg transition-colors pt-2 flex-1 leading-snug ${isSelected ? 'text-indigo-900 font-bold' : 'text-slate-700 font-medium'}`}><MathText text={option} /></span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 mt-2">{currentQuestion.options.map((option, idx) => { const userAnswer = answers[currentQuestion.id]; const isSelected = Array.isArray(userAnswer) ? userAnswer.includes(idx) : userAnswer === idx; return (<button key={idx} onClick={() => handleSelectOption(currentQuestion.id, currentQuestion.type, idx)} className={`w-full text-left p-3.5 rounded-2xl border-2 transition-all flex items-start gap-4 ${isSelected ? 'border-indigo-600 bg-indigo-50/20 shadow-xs' : 'border-slate-50 bg-white hover:border-slate-200 hover:bg-slate-50/50'}`}><div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-white transition-all flex-shrink-0 text-base ${isSelected ? 'bg-indigo-600 shadow-md' : 'bg-slate-100 text-slate-400'}`}>{isSelected ? <CheckCircle2 size={20} /> : <span className="font-bold text-slate-500">{String.fromCharCode(65 + idx)}</span>}</div><span className={`text-base md:text-lg transition-colors pt-2 flex-1 leading-snug ${isSelected ? 'text-indigo-900 font-bold' : 'text-slate-700 font-medium'}`}><MathText text={option} /></span></button>); })}</div>
            )}
          </div>
          <div className="mt-8 pt-6 border-t border-slate-100 flex justify-between items-center bg-white sticky bottom-0 pb-2">
            <button disabled={currentQuestionIndex === 0} onClick={() => { setCurrentQuestionIndex(prev => prev - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="px-8 py-3.5 rounded-xl font-black text-[11px] border-2 border-slate-200 text-slate-500 disabled:opacity-30 uppercase tracking-widest transition-all hover:bg-slate-50 active:scale-95">Sebelumnya</button>
            {currentQuestionIndex === pkg.questions.length - 1 ? (
              <button onClick={() => setIsFinishModalOpen(true)} disabled={!allQuestionsAnswered} className={`px-10 py-3.5 rounded-xl font-black text-[11px] shadow-lg flex items-center gap-2 uppercase tracking-widest transition-all active:scale-95 ${allQuestionsAnswered ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>{!allQuestionsAnswered && <AlertCircle size={16} />}Selesaikan</button>
            ) : (<button onClick={() => { setCurrentQuestionIndex(prev => prev + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="px-10 py-3.5 rounded-xl font-black text-[11px] bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl shadow-indigo-100/50 transition-all uppercase tracking-widest active:scale-95">Berikutnya</button>)}
          </div>
        </div>

        {/* Finish Confirmation Modal */}
        {isFinishModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-3xl w-full max-sm shadow-2xl overflow-hidden p-8 text-center space-y-4 animate-in fade-in zoom-in duration-200">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2">
                <ClipboardCheck size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase">Selesaikan Ujian?</h3>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">
                Apakah Anda yakin ingin mengakhiri sesi ujian ini? Pastikan semua butir soal telah terjawab dengan teliti.
              </p>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setIsFinishModalOpen(false)} className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all">Kembali</button>
                <button onClick={() => handleFinishTest()} className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200">Ya, Selesai</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 py-6">
      <div className="bg-indigo-600 p-10 rounded-[2.5rem] text-white relative shadow-2xl overflow-hidden">
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-6"><div className="space-y-1"><p className="text-indigo-200 font-bold text-xs uppercase tracking-widest opacity-80">{schoolName}</p><h2 className="text-4xl font-black tracking-tight leading-tight">Selamat Datang, {student.name}!</h2></div><button onClick={onLogout} className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all border border-white/10 backdrop-blur-md shadow-lg group"><LogOut size={24} /></button></div>
          <div className="flex flex-col md:flex-row justify-between items-end gap-4">
            <p className="text-indigo-100 text-lg max-w-xl leading-relaxed">Persiapkan diri Anda sebaik mungkin. Klik tombol "Mulai Ujian" di bawah jadwal untuk memulai.</p>
            <div className="bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2 rounded-2xl flex items-center gap-3">
              <Monitor size={16} className="text-indigo-200" />
              <div className="text-right">
                <p className="text-[9px] font-black uppercase tracking-widest text-indigo-200 opacity-60">Jam Sistem Perangkat</p>
                <p className="text-sm font-black text-white">{new Date(currentTime).toLocaleTimeString('id-ID')}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 p-10 opacity-10 -rotate-12 translate-x-1/4 -translate-y-1/4"><BookOpen size={280} /></div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-xl font-black text-slate-800 flex items-center gap-3"><div className="p-2.5 bg-indigo-100 rounded-xl text-indigo-600 shadow-xs"><Clock size={24} /></div> Jadwal Ujian Aktif</h3>
          <div className="space-y-4">
            {studentSessions.length > 0 ? studentSessions.map((session) => {
              const status = getSessionStatus(session);
              const isActive = status === 'ACTIVE';
              return (
                <div key={session.id} className={`bg-white p-8 rounded-[2rem] border shadow-xs flex flex-col md:flex-row justify-between items-center gap-6 transition-all ${isActive ? 'border-indigo-300 ring-4 ring-indigo-500/5' : 'border-slate-200 opacity-95'}`}>
                  <div className="flex items-center gap-6"><div className={`w-20 h-20 rounded-3xl flex items-center justify-center font-black text-3xl shadow-inner ${session.subject === Subject.MATEMATIKA ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>{session.subject.charAt(0)}</div><div><div className="flex items-center gap-2.5 mb-1.5"><h4 className="font-black text-2xl text-slate-800 tracking-tight leading-none">{session.subject}</h4>{isActive && <span className="bg-emerald-100 text-emerald-600 text-[9px] font-black px-2.5 py-0.5 rounded-full animate-pulse border border-emerald-200">AKTIF</span>}</div><p className="text-slate-500 font-bold text-base mb-2">{session.date} • {session.time} WIB</p><div className="flex items-center gap-2 text-indigo-600 text-xs font-black uppercase tracking-widest"><Timer size={16} /> {session.duration} Menit</div></div></div>
                  <button onClick={() => startTest(session)} disabled={!isActive} className={`w-full md:w-auto px-10 py-5 font-black rounded-2xl flex items-center justify-center gap-4 transition-all shadow-xl active:scale-95 ${isActive ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-slate-50 text-slate-300 cursor-not-allowed border border-slate-100'}`}><Play size={22} fill={isActive ? "currentColor" : "none"} /> {status === 'UPCOMING' ? 'BELUM DIMULAI' : status === 'ENDED' ? 'BERAKHIR' : 'MULAI UJIAN'}</button>
                </div>
              );
            }) : (<div className="bg-white p-16 rounded-[2rem] border border-slate-200 text-center flex flex-col items-center gap-4 shadow-sm"><AlertTriangle size={48} className="text-amber-400" /><div className="space-y-2"><p className="text-slate-700 font-bold text-lg">Jadwal tidak ditemukan.</p><p className="text-slate-400 text-sm max-w-xs mx-auto">Anda mungkin belum didaftarkan ke sesi ujian manapun oleh Proktor.</p></div></div>)}
          </div>
        </div>
        <div className="space-y-6"><h3 className="text-xl font-black text-slate-800 flex items-center gap-3"><div className="p-2.5 bg-emerald-100 rounded-xl text-emerald-600 shadow-xs"><ListChecks size={24} /></div> Petunjuk</h3><div className="bg-white p-8 rounded-[2rem] border border-slate-200 space-y-6 shadow-sm"><ul className="space-y-4"><li className="flex gap-3 items-start text-slate-600 text-sm font-medium"><div className="w-5 h-5 rounded bg-emerald-100 text-emerald-600 flex items-center justify-center text-[10px] font-black shrink-0">1</div><span>Gunakan navigasi nomor soal untuk berpindah dengan cepat.</span></li><li className="flex gap-3 items-start text-slate-600 text-sm font-medium"><div className="w-5 h-5 rounded bg-emerald-100 text-emerald-600 flex items-center justify-center text-[10px] font-black shrink-0">2</div><span>Klik "Selesaikan" di soal terakhir jika sudah yakin.</span></li></ul><div className="flex items-start gap-4 p-6 bg-amber-50 rounded-2xl border-dashed border-2 border-amber-200"><AlertCircle size={28} className="text-amber-500 shrink-0" /><p className="text-[11px] font-bold text-amber-800 leading-tight uppercase tracking-tight italic">Peringatan: dilarang keras bekerja sama atau melakukan kecurangan selama ujian berlangsung!</p></div></div></div>
      </div>
    </div>
  );
};

export default StudentView;
