
import React, { useState, useEffect } from 'react';
import { BarChart3, Search, ChevronRight, HelpCircle, CheckCircle2, AlertTriangle, Filter, LayoutGrid, ListChecks, User, Calculator, Printer } from 'lucide-react';
import { TestSession, QuestionPackage, QuestionType, StudentProgress, Question, AppSettings } from '../types';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';

interface ItemAnalysisViewProps {
  sessions: TestSession[];
  packages: QuestionPackage[];
  settings: AppSettings;
}

const ItemAnalysisView: React.FC<ItemAnalysisViewProps> = ({ sessions, packages, settings }) => {
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'summary' | 'detail'>('detail');
  const [progressData, setProgressData] = useState<StudentProgress[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const selectedSession = sessions.find(s => s.id === selectedSessionId);
  const selectedPkg = packages.find(p => p.id === selectedSession?.packageId);

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

  const getQuestionResult = (q: Question, userAns: any) => {
    const isBinary = [QuestionType.TRUE_FALSE, QuestionType.AGREE_DISAGREE, QuestionType.YES_NO, QuestionType.MATCH_UNMATCH].includes(q.type);
    const maxScore = q.type === QuestionType.MCSA ? 1 : q.type === QuestionType.MCMA ? 2 : 3;

    if (userAns === undefined) return { score: 0, maxScore, level: 'unanswered' };
    const correctAns = q.correctAnswer;

    if (q.type === QuestionType.MCSA) {
      const isCorrect = userAns === correctAns;
      return { score: isCorrect ? 1 : 0, maxScore: 1, level: isCorrect ? 'correct' : 'incorrect' };
    }
    
    if (q.type === QuestionType.MCMA) {
      const u = (userAns as number[]) || [];
      const c = (correctAns as number[]) || [];
      const correctMatches = u.filter(x => c.includes(x)).length;
      const incorrectMatches = u.filter(x => !c.includes(x)).length;
      const score = Math.max(0, ((correctMatches - incorrectMatches) / c.length) * 2); 
      let level = 'incorrect';
      if (score === 2) level = 'correct';
      else if (score > 0) level = 'partial';
      return { score, maxScore: 2, level };
    }

    // PGK Kategori (Binary)
    const u = (userAns as number[]) || [];
    const c = (correctAns as number[]) || [];
    let correctCount = 0;
    const totalItems = c.length;
    u.forEach((val, i) => { if (val === c[i]) correctCount++; });
    const score = (correctCount / totalItems) * 3;
    let level = 'incorrect';
    if (score === 3) level = 'correct';
    else if (score > 0) level = 'partial';
    return { score, maxScore: 3, level };
  };

  const getCellColor = (level: string) => {
    switch (level) {
      case 'correct': return 'bg-emerald-500 text-white';
      case 'partial': return 'bg-amber-400 text-slate-900';
      case 'incorrect': return 'bg-red-500 text-white';
      default: return 'bg-slate-100 text-slate-300';
    }
  };

  const filteredProgress = progressData.filter(p => 
    p.studentName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.nisn.includes(searchTerm)
  );

  const handlePrint = () => {
    const printArea = document.querySelector('.print-area');
    if (!printArea) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Gagal membuka jendela cetak. Pastikan pop-up diizinkan.');
      return;
    }

    const style = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
        body { font-family: 'Inter', sans-serif; padding: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; table-layout: fixed; }
        th, td { border: 1px solid black; padding: 4px; text-align: left; font-size: 8pt; word-wrap: break-word; }
        .text-center { text-align: center; }
        .bg-slate-900 { background-color: #0f172a !important; color: white !important; }
        .bg-emerald-500 { background-color: #10b981 !important; color: white !important; }
        .bg-amber-400 { background-color: #fbbf24 !important; color: black !important; }
        .bg-red-500 { background-color: #ef4444 !important; color: white !important; }
        .bg-indigo-600 { background-color: #4f46e5 !important; color: white !important; }
        .no-print, .no-print * { display: none !important; }
        .print-header { text-align: center; border-bottom: 3px double black; padding-bottom: 10px; margin-bottom: 20px; }
        .font-black { font-weight: 900; }
        .uppercase { text-transform: uppercase; }
        .grid { display: grid; grid-template-cols: 1fr 1fr; gap: 10px; font-size: 9pt; font-weight: bold; margin-bottom: 15px; }
        .signature-grid { display: flex; justify-content: space-between; margin-top: 50px; font-size: 9pt; font-weight: bold; }
        .signature-box { text-align: center; width: 200px; }
        .signature-line { margin-top: 60px; border-bottom: 1px solid black; }
        .hidden { display: block !important; } /* override print area hidden */
      </style>
    `;

    printWindow.document.write(`
      <html>
        <head><title>Cetak Analisis Soal</title>${style}</head>
        <body>
          <div class="print-content">
            ${printArea.innerHTML}
          </div>
          <script>
            window.onload = () => {
              setTimeout(() => {
                window.print();
                window.close();
              }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between sticky top-4 z-20 no-print">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
            <Filter size={20} />
          </div>
          <select 
            className="bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500 w-full md:w-80"
            value={selectedSessionId}
            onChange={(e) => setSelectedSessionId(e.target.value)}
          >
            <option value="">-- Pilih Sesi Analisis --</option>
            {sessions.map(s => (
              <option key={s.id} value={s.id}>{s.subject} - Sesi {s.sessionNumber}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          {selectedPkg && (
            <div className="flex bg-slate-50 p-1 rounded-2xl border border-slate-200 flex-1 md:flex-none">
              <button 
                onClick={() => setActiveTab('summary')}
                className={`flex-1 md:flex-none px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'summary' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <BarChart3 size={14} /> Ringkasan
              </button>
              <button 
                onClick={() => setActiveTab('detail')}
                className={`flex-1 md:flex-none px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'detail' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <LayoutGrid size={14} /> Analisis Perbutir
              </button>
            </div>
          )}
          
          <button 
            onClick={handlePrint}
            disabled={!selectedSessionId}
            className="flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            <Printer size={18} /> Cetak
          </button>
        </div>
      </div>

      {!selectedPkg ? (
        <div className="bg-white p-20 rounded-[3rem] border-2 border-dashed border-slate-200 text-center no-print">
          <BarChart3 size={48} className="mx-auto text-slate-200 mb-4" />
          <p className="text-slate-400 font-bold italic">Silakan pilih sesi ujian untuk melihat analisis statistik butir soal.</p>
        </div>
      ) : (
        <div className="print-area">
          <div className="hidden print-header">
            <h1 className="font-black uppercase">{settings.schoolName}</h1>
            <h2 className="font-bold uppercase">{settings.examTitle}</h2>
            <p style={{fontStyle: 'italic', fontSize: '10pt'}}>LAPORAN ANALISIS BUTIR SOAL - TAHUN PELAJARAN {settings.academicYear}</p>
            <div className="grid" style={{textAlign: 'left', marginTop: '20px', borderTop: '1px solid black', paddingTop: '10px'}}>
               <div>MATA PELAJARAN: {selectedSession?.subject}</div>
               <div style={{textAlign: 'right'}}>TANGGAL: {selectedSession?.date}</div>
               <div>PAKET SOAL: {selectedPkg.name}</div>
               <div style={{textAlign: 'right'}}>SESI: {selectedSession?.sessionNumber}</div>
            </div>
          </div>

          {activeTab === 'detail' ? (
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/30 no-print">
                <h3 className="text-sm font-black text-slate-500 uppercase tracking-[0.15em] flex items-center gap-2">
                  <ListChecks size={18} className="text-indigo-600" /> Matriks Skor Peserta
                </h3>
                <div className="relative w-72">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                   <input 
                     type="text" 
                     placeholder="Cari siswa..." 
                     className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                   />
                </div>
              </div>

              <div className="overflow-x-auto relative custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
                      <th className="px-6 py-4 text-center" style={{width: '30px'}}>No.</th>
                      <th className="px-6 py-4" style={{width: '180px'}}>Nama Peserta</th>
                      <th className="px-6 py-4" style={{width: '100px'}}>NISN</th>
                      {selectedPkg.questions.map((_, i) => (
                        <th key={i} className="text-center" style={{width: '25px'}}>{i + 1}</th>
                      ))}
                      <th className="px-6 py-4 bg-indigo-600 text-center" style={{width: '60px'}}>Skor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredProgress.length > 0 ? filteredProgress.map((progress, pIdx) => {
                      let totalStudentScore = 0;
                      return (
                        <tr key={progress.id} className="hover:bg-slate-50/80 transition-colors group">
                          <td className="text-center font-bold text-slate-400">{pIdx + 1}</td>
                          <td className="px-6 py-4 font-bold text-slate-700">{progress.studentName}</td>
                          <td className="px-6 py-4 font-mono font-bold text-slate-400">{progress.nisn}</td>
                          {selectedPkg.questions.map((q, qIdx) => {
                            const userAns = progress.answers ? progress.answers[q.id] : undefined;
                            const result = getQuestionResult(q, userAns);
                            totalStudentScore += result.score;
                            return (
                              <td key={qIdx} className={`text-center ${getCellColor(result.level)}`} style={{fontSize: '9px', fontWeight: 'bold'}}>
                                {result.level === 'unanswered' ? '-' : result.score.toFixed(0)}
                              </td>
                            );
                          })}
                          <td className="text-center font-black text-indigo-700 bg-indigo-50">{totalStudentScore.toFixed(0)}</td>
                        </tr>
                      );
                    }) : (
                      <tr>
                        <td colSpan={selectedPkg.questions.length + 4} className="px-6 py-32 text-center text-slate-400 font-bold italic">
                           Belum ada data pengerjaan untuk sesi ini.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {selectedPkg.questions.map((q, idx) => {
                const totalSiswa = progressData.length || 1;
                const correctCount = progressData.filter(p => p.answers && getQuestionResult(q, p.answers[q.id]).level === 'correct').length;
                const partialCount = progressData.filter(p => p.answers && getQuestionResult(q, p.answers[q.id]).level === 'partial').length;
                const persentase = totalSiswa > 0 ? Math.round(((correctCount + (partialCount * 0.5)) / totalSiswa) * 100) : 0;
                let level = 'SEDANG';
                if (persentase > 75) level = 'MUDAH';
                if (persentase < 40) level = 'SULIT';

                return (
                  <div key={q.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="flex gap-4 items-start">
                      <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black shrink-0 text-xs">{idx + 1}</div>
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                           <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded border border-indigo-100 uppercase">{q.type}</span>
                           <span className="text-[10px] font-black px-2 py-0.5 rounded border uppercase">{level}</span>
                        </div>
                        <p className="text-slate-700 font-bold text-sm">{q.text}</p>
                        <p className="text-[9px] font-bold text-slate-500 italic mt-2">Daya Serap: {persentase}% ({correctCount} Benar, {partialCount} Sebagian)</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="hidden signature-grid">
             <div className="signature-box">
                <p>Mengetahui,</p>
                <p>Kepala Sekolah</p>
                <div className="signature-line"></div>
                <p style={{marginTop: '5px'}}>NIP. ........................................</p>
             </div>
             <div className="signature-box">
                <p>{settings.schoolName.split(' ')[1] || 'Indonesia'}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                <p>Penyusun,</p>
                <div className="signature-line"></div>
                <p style={{marginTop: '5px'}}>NIP. ........................................</p>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ItemAnalysisView;
