
import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, Search, Filter, Download, User, CheckCircle2, XCircle, Clock, Eye, X, ClipboardCheck, AlertCircle, HelpCircle, Printer } from 'lucide-react';
import { TestSession, StudentProgress, Subject, QuestionPackage, Question, QuestionType, AppSettings } from '../types';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';

interface TestResultsViewProps {
  sessions: TestSession[];
  packages: QuestionPackage[];
  settings: AppSettings;
}

const TestResultsView: React.FC<TestResultsViewProps> = ({ sessions, packages, settings }) => {
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [results, setResults] = useState<StudentProgress[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingResult, setViewingResult] = useState<StudentProgress | null>(null);

  useEffect(() => {
    if (selectedSessionId) {
      const q = query(collection(db, 'test_progress'), where('sessionId', '==', selectedSessionId));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => doc.data() as StudentProgress);
        setResults(data);
      });
      return () => unsubscribe();
    }
  }, [selectedSessionId]);

  const filteredResults = results.filter(r => 
    r.studentName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.nisn.includes(searchTerm)
  );

  const getQuestionResult = (q: Question, userAns: any) => {
    const isBinary = [QuestionType.TRUE_FALSE, QuestionType.AGREE_DISAGREE, QuestionType.YES_NO, QuestionType.MATCH_UNMATCH].includes(q.type);
    const maxScore = q.type === QuestionType.MCSA ? 1 : q.type === QuestionType.MCMA ? 2 : 3;

    if (userAns === undefined) {
      return { score: 0, maxScore, level: 'unanswered' };
    }
    
    const correctAns = q.correctAnswer;

    if (q.type === QuestionType.MCSA) {
      const isCorrect = userAns === correctAns;
      return { score: isCorrect ? 1 : 0, maxScore: 1, level: isCorrect ? 'correct' : 'incorrect' };
    }
    
    if (q.type === QuestionType.MCMA) {
      const u = (userAns as number[]) || [];
      const c = (correctAns as number[]) || [];
      if (u.length === 0) return { score: 0, maxScore: 2, level: 'unanswered' };
      const correctMatches = u.filter(x => c.includes(x)).length;
      const incorrectMatches = u.filter(x => !c.includes(x)).length;
      if (u.length === c.length && correctMatches === c.length) return { score: 2, maxScore: 2, level: 'correct' };
      const rawScore = ((correctMatches - incorrectMatches) / c.length) * 2;
      const finalScore = Math.max(0, Number(rawScore.toFixed(2)));
      return { score: finalScore, maxScore: 2, level: finalScore >= 2 ? 'correct' : finalScore > 0 ? 'partial' : 'incorrect' };
    }

    const u = (userAns as number[]) || [];
    const c = (correctAns as number[]) || [];
    const totalItems = c.length;
    if (u.length === 0) return { score: 0, maxScore: 3, level: 'unanswered' };
    let correctCount = 0;
    u.forEach((val, i) => { if (val === c[i]) correctCount++; });
    if (correctCount === totalItems) return { score: 3, maxScore: 3, level: 'correct' };
    const finalScore = Math.max(0, Number(((correctCount / totalItems) * 3).toFixed(2)));
    return { score: finalScore, maxScore: 3, level: finalScore >= 3 ? 'correct' : finalScore > 0 ? 'partial' : 'incorrect' };
  };

  const calculateTotalScore = (progress: StudentProgress, pkg: QuestionPackage) => {
    let totalScore = 0;
    pkg.questions.forEach(q => {
      const result = getQuestionResult(q, progress.answers?.[q.id]);
      totalScore += result.score;
    });
    // Mengembalikan jumlah total poin langsung (bukan persentase)
    return Number(totalScore.toFixed(1));
  };

  const getBinaryLabels = (type: QuestionType) => {
    switch (type) {
      case QuestionType.TRUE_FALSE: return { h1: "B", h2: "S" };
      case QuestionType.AGREE_DISAGREE: return { h1: "S", h2: "TS" };
      case QuestionType.YES_NO: return { h1: "Y", h2: "T" };
      case QuestionType.MATCH_UNMATCH: return { h1: "S", h2: "TS" };
      default: return { h1: "B", h2: "S" };
    }
  };

  const currentPkg = packages.find(p => p.id === sessions.find(s => s.id === (viewingResult?.sessionId || selectedSessionId))?.packageId);
  const currentSession = sessions.find(s => s.id === (viewingResult?.sessionId || selectedSessionId));

  const handlePrintDetail = () => {
    if (!viewingResult || !currentPkg) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const correctCount = currentPkg.questions.filter(q => getQuestionResult(q, viewingResult.answers?.[q.id]).level === 'correct').length;
    const partialCount = currentPkg.questions.filter(q => getQuestionResult(q, viewingResult.answers?.[q.id]).level === 'partial').length;
    const finalScore = calculateTotalScore(viewingResult, currentPkg);

    const rows = currentPkg.questions.map((q, idx) => {
      const userAns = viewingResult.answers ? viewingResult.answers[q.id] : undefined;
      const result = getQuestionResult(q, userAns);
      const binary = [QuestionType.TRUE_FALSE, QuestionType.AGREE_DISAGREE, QuestionType.YES_NO, QuestionType.MATCH_UNMATCH].includes(q.type);
      const labels = binary ? getBinaryLabels(q.type) : null;

      let displayUserAns = '-';
      let displayCorrectAns = '-';

      if (binary && Array.isArray(userAns)) {
        displayUserAns = userAns.map((val, i) => `${i + 1}:${val === 0 ? labels?.h1 : labels?.h2}`).join(',');
        displayCorrectAns = (q.correctAnswer as number[]).map((val, i) => `${i + 1}:${val === 0 ? labels?.h1 : labels?.h2}`).join(',');
      } else if (q.type === QuestionType.MCMA && Array.isArray(userAns)) {
        displayUserAns = userAns.map(i => String.fromCharCode(65 + i)).join(',');
        displayCorrectAns = (q.correctAnswer as number[]).map(i => String.fromCharCode(65 + i)).join(',');
      } else {
        displayUserAns = userAns !== undefined ? String.fromCharCode(65 + (userAns as number)) : '-';
        displayCorrectAns = String.fromCharCode(65 + (q.correctAnswer as number));
      }

      return `
        <tr>
          <td style="text-align: center;">${idx + 1}</td>
          <td style="font-size: 8pt;">${q.text}</td>
          <td style="text-align: center; font-weight: bold; font-size: 8pt;">${displayUserAns}</td>
          <td style="text-align: center; font-weight: bold; color: #059669; font-size: 8pt;">${displayCorrectAns}</td>
          <td style="text-align: center; font-weight: bold; font-size: 8pt;">${result.score}/${result.maxScore}</td>
        </tr>
      `;
    }).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Hasil - ${viewingResult.studentName}</title>
          <style>
            @page { size: A4; margin: 0.8cm; }
            body { font-family: 'Inter', sans-serif; font-size: 8.5pt; color: #000; margin: 0; line-height: 1.2; }
            .header { text-align: center; border-bottom: 1.5px solid #000; padding-bottom: 5px; margin-bottom: 10px; }
            .header h1 { margin: 0; font-size: 13pt; font-weight: 900; }
            .header h2 { margin: 2px 0; font-size: 10pt; font-weight: 700; }
            .info-line { display: flex; justify-content: space-between; margin-bottom: 3px; font-weight: bold; border-bottom: 1px dashed #ccc; padding-bottom: 2px; }
            .summary-line { display: flex; gap: 15px; margin-bottom: 10px; background: #f8fafc; padding: 5px; border: 1px solid #e2e8f0; border-radius: 4px; }
            .summary-item { font-weight: bold; }
            .summary-item span { color: #64748b; font-weight: normal; margin-right: 4px; text-transform: uppercase; font-size: 7.5pt; }
            table { width: 100%; border-collapse: collapse; margin-top: 5px; table-layout: fixed; }
            th, td { border: 1px solid #000; padding: 3px 5px; text-align: left; vertical-align: middle; word-wrap: break-word; }
            th { background-color: #f1f5f9; text-transform: uppercase; font-size: 7.5pt; text-align: center; font-weight: 800; }
            .score-highlight { color: #4f46e5; font-weight: 900; border: 1.5px solid #4f46e5; padding: 0 5px; border-radius: 3px; }
            .footer { margin-top: 15px; display: flex; justify-content: space-between; align-items: flex-end; }
            .sign-box { text-align: center; min-width: 150px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${settings.schoolName}</h1>
            <h2>${settings.examTitle} - TA ${settings.academicYear}</h2>
          </div>
          
          <div class="info-line">
            <span>PESERTA: ${viewingResult.studentName} (${viewingResult.nisn})</span>
            <span>MAPEL: ${currentSession?.subject} - ${currentSession?.date}</span>
          </div>

          <div class="summary-line">
            <div class="summary-item"><span>Total Soal:</span>${currentPkg.questions.length}</div>
            <div class="summary-item"><span>Benar:</span>${correctCount}</div>
            <div class="summary-item"><span>Parsial:</span>${partialCount}</div>
            <div class="summary-item"><span>TOTAL POIN:</span><span class="score-highlight">${finalScore}</span></div>
          </div>

          <table>
            <colgroup>
              <col style="width: 25px;">
              <col>
              <col style="width: 85px;">
              <col style="width: 85px;">
              <col style="width: 45px;">
            </colgroup>
            <thead>
              <tr>
                <th>NO</th>
                <th>BUTIR PERTANYAAN / SOAL</th>
                <th>JAWABAN</th>
                <th>KUNCI</th>
                <th>POIN</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>

          <div class="footer">
            <div style="font-size: 7pt; color: #666; font-style: italic;">Dicetak: ${new Date().toLocaleString('id-ID')}</div>
            <div class="sign-box">
              <p style="margin-bottom: 40px;">Proktor / Pengawas,</p>
              <div style="border-bottom: 1px solid #000; width: 100%;"></div>
              <p style="font-size: 7.5pt; margin-top: 2px;">NIP. ........................................</p>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); }, 500);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
            <Filter size={20} />
          </div>
          <select 
            className="bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500 w-full"
            value={selectedSessionId}
            onChange={(e) => setSelectedSessionId(e.target.value)}
          >
            <option value="">-- Pilih Sesi Ujian --</option>
            {sessions.map(s => (
              <option key={s.id} value={s.id}>{s.subject} - Sesi {s.sessionNumber} ({s.date})</option>
            ))}
          </select>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Cari NISN atau Nama..." 
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <button className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg active:scale-95 whitespace-nowrap">
          <Download size={18} /> Export Excel
        </button>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <tr>
              <th className="px-8 py-5">Peserta</th>
              <th className="px-6 py-5">Status</th>
              <th className="px-6 py-5 text-center">Progres</th>
              <th className="px-6 py-5 text-center">Total Poin</th>
              <th className="px-6 py-5 text-right">Rincian</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredResults.length > 0 ? filteredResults.map((res) => {
              const pkg = packages.find(p => p.id === sessions.find(s => s.id === res.sessionId)?.packageId);
              const score = pkg ? calculateTotalScore(res, pkg) : 0;
              return (
                <tr key={res.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-bold">
                        {res.studentName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{res.studentName}</p>
                        <p className="text-[10px] font-mono text-slate-400">NISN: {res.nisn}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-black border uppercase tracking-wider ${
                      res.status === 'FINISHED' 
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                        : 'bg-amber-50 text-amber-600 border-amber-100'
                    }`}>
                      {res.status === 'FINISHED' ? 'SELESAI' : 'MENGERJAKAN'}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <p className="text-xs font-bold text-slate-500">{res.answeredCount} / {res.totalQuestions}</p>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <div className="inline-block px-4 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 font-black text-base">
                      {score}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <button 
                      onClick={() => setViewingResult(res)}
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                      title="Lihat Detail Pekerjaan"
                    >
                      <Eye size={20} />
                    </button>
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan={5} className="px-8 py-20 text-center">
                  <div className="max-w-xs mx-auto space-y-3">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-200">
                      <FileSpreadsheet size={32} />
                    </div>
                    <p className="text-slate-400 font-bold italic text-sm">
                      {selectedSessionId ? 'Tidak ada data hasil untuk sesi ini.' : 'Silakan pilih sesi untuk menampilkan hasil.'}
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Detail Jawaban Siswa */}
      {viewingResult && currentPkg && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center z-[150] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[3rem] w-full max-w-4xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col border border-white/20 animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200">
                  <ClipboardCheck size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase">Rincian Jawaban Siswa</h3>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                    <span>{viewingResult.studentName}</span>
                    <span className="opacity-30">•</span>
                    <span>NISN: {viewingResult.nisn}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handlePrintDetail}
                  className="p-3 bg-white hover:bg-indigo-50 rounded-full text-indigo-600 hover:text-indigo-800 transition-all shadow-sm border border-slate-200"
                  title="Cetak Rincian Jawaban"
                >
                  <Printer size={24} />
                </button>
                <button onClick={() => setViewingResult(null)} className="p-3 bg-white hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all shadow-sm border border-slate-200">
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="p-8 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/30">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Soal</p>
                  <p className="text-2xl font-black text-slate-800">{currentPkg.questions.length}</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm text-center">
                  <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Status Jawaban</p>
                  <p className="text-sm font-black text-emerald-600 uppercase">
                    {currentPkg.questions.filter(q => getQuestionResult(q, viewingResult.answers?.[q.id]).level === 'correct').length} Benar
                  </p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm text-center">
                  <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Partial</p>
                  <p className="text-sm font-black text-amber-600 uppercase">
                    {currentPkg.questions.filter(q => getQuestionResult(q, viewingResult.answers?.[q.id]).level === 'partial').length} Sebagian
                  </p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm text-center ring-2 ring-indigo-500/20">
                  <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">Total Poin</p>
                  <p className="text-3xl font-black text-indigo-600">{calculateTotalScore(viewingResult, currentPkg)}</p>
                </div>
              </div>

              <div className="space-y-6">
                {currentPkg.questions.map((q, idx) => {
                  const userAns = viewingResult.answers ? viewingResult.answers[q.id] : undefined;
                  const result = getQuestionResult(q, userAns);
                  const isBinary = [QuestionType.TRUE_FALSE, QuestionType.AGREE_DISAGREE, QuestionType.YES_NO, QuestionType.MATCH_UNMATCH].includes(q.type);
                  
                  return (
                    <div key={q.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row">
                      <div className={`w-full md:w-16 flex items-center justify-center font-black text-xl shrink-0 ${
                        result.level === 'correct' ? 'bg-emerald-500 text-white' : 
                        result.level === 'partial' ? 'bg-amber-400 text-slate-900' :
                        result.level === 'incorrect' ? 'bg-red-500 text-white' : 'bg-slate-200 text-slate-400'
                      }`}>
                        {idx + 1}
                      </div>
                      <div className="p-6 flex-1 space-y-4">
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100 uppercase tracking-widest mb-2 inline-block">
                              {q.type}
                            </span>
                            <p className="text-slate-800 font-bold text-base leading-snug">{q.text}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                             <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${
                               result.level === 'unanswered' ? 'text-slate-400 bg-slate-50 border-slate-100' :
                               result.level === 'correct' ? 'text-emerald-600 bg-emerald-50 border-emerald-100' :
                               result.level === 'partial' ? 'text-amber-600 bg-amber-50 border-amber-100' :
                               'text-red-600 bg-red-50 border-red-100'
                             }`}>
                                {result.level === 'correct' ? <CheckCircle2 size={16} /> : 
                                 result.level === 'incorrect' ? <XCircle size={16} /> : <AlertCircle size={16} />}
                                <span className="text-[9px] font-black uppercase">
                                  {result.level === 'unanswered' ? 'KOSONG' : result.level === 'correct' ? 'BENAR' : result.level === 'partial' ? 'SEBAGIAN' : 'SALAH'}
                                </span>
                             </div>
                             <p className="text-[10px] font-black text-slate-400">Poin: {result.score} / {result.maxScore}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                          <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Jawaban Siswa:</p>
                            <div className="space-y-1.5">
                              {isBinary ? (
                                <div className="space-y-1">
                                  {q.options.map((opt, oIdx) => (
                                    <div key={oIdx} className={`text-xs font-bold flex justify-between p-2 rounded-lg border ${
                                      userAns?.[oIdx] === (q.correctAnswer as number[])[oIdx] 
                                      ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
                                      : userAns?.[oIdx] === undefined ? 'bg-white border-slate-200 text-slate-400' : 'bg-red-50 border-red-100 text-red-700'
                                    }`}>
                                      <span>{oIdx + 1}. {opt.length > 20 ? opt.substring(0, 20) + '...' : opt}</span>
                                      <span className="font-black">{userAns?.[oIdx] === 0 ? getBinaryLabels(q.type).h1 : userAns?.[oIdx] === 1 ? getBinaryLabels(q.type).h2 : '-'}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : q.type === QuestionType.MCMA ? (
                                <div className="flex flex-wrap gap-2">
                                  {((userAns as number[]) || []).map(idx => (
                                    <span key={idx} className={`w-8 h-8 rounded-lg flex items-center justify-center font-black shadow-sm ${
                                      (q.correctAnswer as number[]).includes(idx) ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
                                    }`}>{String.fromCharCode(65 + idx)}</span>
                                  ))}
                                  {(!userAns || userAns.length === 0) && <span className="text-slate-400 italic">Tidak ada jawaban</span>}
                                </div>
                              ) : (
                                <div className="flex items-center gap-3">
                                   <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black shadow-md ${
                                     userAns === q.correctAnswer ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
                                   }`}>{userAns !== undefined ? String.fromCharCode(65 + userAns) : '-'}</div>
                                   <p className="text-sm font-bold text-slate-700">{userAns !== undefined ? q.options[userAns] : '-'}</p>
                                </div>
                              )}
                            </div>
                          </div>
                          <div>
                            <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-2">Kunci Jawaban:</p>
                            <div className="space-y-1.5">
                              {isBinary ? (
                                <div className="space-y-1">
                                  {q.options.map((opt, oIdx) => (
                                    <div key={oIdx} className="text-xs font-bold text-slate-700 flex justify-between bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                                      <span>{oIdx + 1}. {opt.length > 20 ? opt.substring(0, 20) + '...' : opt}</span>
                                      <span className="text-emerald-700 font-black">{(q.correctAnswer as number[])[oIdx] === 0 ? getBinaryLabels(q.type).h1 : getBinaryLabels(q.type).h2}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : q.type === QuestionType.MCMA ? (
                                <div className="flex flex-wrap gap-2">
                                  {((q.correctAnswer as number[]) || []).map(idx => (
                                    <span key={idx} className="bg-emerald-500 text-white w-8 h-8 rounded-lg flex items-center justify-center font-black shadow-sm">{String.fromCharCode(65 + idx)}</span>
                                  ))}
                                </div>
                              ) : (
                                <div className="flex items-center gap-3">
                                   <div className="bg-emerald-500 text-white w-10 h-10 rounded-xl flex items-center justify-center font-black shadow-md">{String.fromCharCode(65 + (q.correctAnswer as number))}</div>
                                   <p className="text-sm font-bold text-slate-700">{q.options[q.correctAnswer as number]}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-8 border-t border-slate-100 bg-slate-50 flex justify-end shrink-0">
               <button onClick={() => setViewingResult(null)} className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 shadow-xl shadow-slate-200">Tutup Rincian</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestResultsView;
