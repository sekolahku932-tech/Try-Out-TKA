import React, { useState } from 'react';
import { 
  Plus, BookOpen, ChevronRight, FileText, Trash2, Edit3, X, 
  ImageIcon, Sparkles, Loader2, Database, Layout, 
  AlignLeft, ChevronLeft, Save, Target, BookMarked, Tags, FileType,
  Wand2, BrainCircuit, Link as LinkIcon, FileSearch, Info, Copy,
  ClipboardList, Printer, Eye, AlertTriangle, Layers, Zap, Map,
  SortAsc, SortDesc
} from 'lucide-react';
import { QuestionPackage, Subject, Question, QuestionType, KisiKisi, AppSettings, UserRole } from '../types';
import { GoogleGenAI, Type } from "@google/genai";
import MathText from './MathText';
import katex from 'katex';

interface QuestionBankProps {
  packages: QuestionPackage[];
  masterPackages: QuestionPackage[];
  settings: AppSettings;
  role: UserRole | null;
  onAddPackage: (pkg: QuestionPackage) => Promise<void>;
  onDeletePackage: (id: string) => Promise<void>;
  onAddQuestion: (packageId: string, question: Question) => Promise<void>;
  onUpdateQuestion: (packageId: string, question: Question) => Promise<void>;
  onDeleteQuestion: (packageId: string, questionId: string) => Promise<void>;
}

const QuestionBank: React.FC<QuestionBankProps> = ({ 
  packages, 
  masterPackages,
  settings,
  role,
  onAddPackage, 
  onDeletePackage, 
  onAddQuestion, 
  onUpdateQuestion,
  onDeleteQuestion 
}) => {
  const [activeSource, setActiveSource] = useState<'LOCAL' | 'MASTER'>('LOCAL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPackageId, setEditingPackageId] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState<string | null>(null);

  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isGeneratingStimulusAI, setIsGeneratingStimulusAI] = useState(false);
  const [isGeneratingQuestionAI, setIsGeneratingQuestionAI] = useState(false);
  const [viewingKisiKisi, setViewingKisiKisi] = useState<KisiKisi | null>(null);
  const [isViewingFullKisiKisi, setIsViewingFullKisiKisi] = useState(false);

  const [packageToDelete, setPackageToDelete] = useState<string | null>(null);
  const [questionToDelete, setQuestionToDelete] = useState<{pkgId: string, qId: string} | null>(null);

  const [packageForm, setPackageForm] = useState({
    name: '',
    subject: Subject.BAHASA_INDONESIA
  });

  const [questionForm, setQuestionForm] = useState<Partial<Question>>({
    text: '',
    type: QuestionType.MCSA,
    options: ['', '', '', '', ''],
    correctAnswer: 0,
    stimulus: '',
    imagePosition: 'above',
    kisiKisi: {
      kompetensi: '',
      subKompetensi: '',
      jenisTeks: 'Teks Deskripsi',
      elemen: 'Bilangan',
      subElemen: '',
      levelKognitif: 'L1 (Pemahaman)',
      konteks: 'Masalah Matematika',
      indikatorSoal: '',
      bentukSoal: QuestionType.MCSA,
      jenisSoal: 'TUNGGAL',
      nomorSoal: 1
    }
  });

  const isBinaryType = (type: QuestionType) => 
    [QuestionType.TRUE_FALSE, QuestionType.AGREE_DISAGREE, QuestionType.YES_NO, QuestionType.MATCH_UNMATCH].includes(type);

  const getBinaryLabels = (type: QuestionType) => {
    switch (type) {
      case QuestionType.TRUE_FALSE: return { h1: "B", h2: "S" };
      case QuestionType.AGREE_DISAGREE: return { h1: "S", h2: "TS" };
      case QuestionType.YES_NO: return { h1: "Y", h2: "T" };
      case QuestionType.MATCH_UNMATCH: return { h1: "S", h2: "TS" };
      default: return { h1: "B", h2: "S" };
    }
  };

  const processMathForPrint = (text?: string) => {
    if (!text) return '';
    return text.replace(/(\$.*?\$)/g, (match) => {
      const tex = match.slice(1, -1);
      try {
        return katex.renderToString(tex, { throwOnError: false });
      } catch (e) {
        return match;
      }
    });
  };

  const formatCorrectAnswer = (q: Question) => {
    if (q.type === QuestionType.MCSA) {
      return String.fromCharCode(65 + (q.correctAnswer as number));
    }
    if (q.type === QuestionType.MCMA) {
      const answers = (q.correctAnswer as number[]) || [];
      return answers.map(idx => String.fromCharCode(65 + idx)).join(', ');
    }
    if (isBinaryType(q.type)) {
      const labels = getBinaryLabels(q.type);
      const answers = (q.correctAnswer as number[]) || [];
      return answers.map((val, i) => `${i + 1}:${val === 0 ? labels.h1 : labels.h2}`).join('|');
    }
    return '-';
  };

  const getCleanedStimulus = (text?: string) => {
    if (!text) return { title: '', body: '' };
    let cleaned = text.replace(/\[JUDUL\]/gi, '').replace(/\[ISI BACAAN\]/gi, '').trim();
    const lines = cleaned.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) return { title: '', body: '' };
    return { title: lines[0], body: lines.slice(1).join('\n') };
  };

  const handlePrint = () => {
    if (!activePackage) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Gagal membuka jendela cetak. Pastikan pop-up diizinkan.");
      return;
    }

    const isMath = activePackage.subject === Subject.MATEMATIKA;

    const rows = [...activePackage.questions]
      .sort((a, b) => (a.kisiKisi?.nomorSoal || 0) - (b.kisiKisi?.nomorSoal || 0))
      .map((q, idx) => {
        const { title, body } = getCleanedStimulus(q.stimulus);
        const binary = isBinaryType(q.type);
        const labels = binary ? getBinaryLabels(q.type) : null;
        const answers = Array.isArray(q.correctAnswer) ? q.correctAnswer : [];
        
        const imageHtml = q.imageUrl ? `
          <div style="text-align: center; margin: 10px 0;">
            <img src="${q.imageUrl}" style="max-height: 150px; max-width: 100%; border: 1px solid #ddd; padding: 2px; border-radius: 4px;" />
          </div>
        ` : '';

        return `
        <tr>
          <td style="text-align: center;">${idx + 1}</td>
          ${isMath ? `
            <td style="text-align: center; font-weight: bold; color: #047857;">${q.kisiKisi?.elemen || '-'}</td>
            <td>${q.kisiKisi?.subElemen || '-'}</td>
            <td>${q.kisiKisi?.kompetensi || '-'}</td>
            <td style="text-align: center; font-weight: bold; color: #b45309;">${q.kisiKisi?.levelKognitif || '-'}</td>
            <td style="text-align: center;">${q.kisiKisi?.konteks || '-'}</td>
          ` : `
            <td>${q.kisiKisi?.kompetensi || '-'}</td>
            <td>${q.kisiKisi?.subKompetensi || '-'}</td>
            <td style="text-align: center; text-transform: uppercase; font-weight: bold;">${q.kisiKisi?.jenisTeks || '-'}</td>
          `}
          <td style="font-style: italic; font-size: 7.5pt;">${q.kisiKisi?.indikatorSoal || '-'}</td>
          <td style="text-align: center; font-size: 7.5pt;">${q.kisiKisi?.bentukSoal || q.type || '-'}</td>
          <td style="text-align: center; font-size: 7.5pt;">${q.kisiKisi?.jenisSoal || 'TUNGGAL'}</td>
          <td style="padding: 12px;">
            ${q.imagePosition === 'above' ? imageHtml : ''}
            ${title ? `
              <div style="margin-bottom: 12px; padding: 12px; background-color: #f8fafc; border: 1.5px solid #000; border-radius: 6px;">
                <div style="font-weight: 900; text-align: center; text-transform: uppercase; font-size: 10pt; margin-bottom: 10px; border-bottom: 1px solid #000; pb: 5px;">${title}</div>
                <div style="font-size: 9pt; text-align: justify; line-height: 1.5; color: #000;">${processMathForPrint(body)}</div>
              </div>
            ` : ''}
            ${q.imagePosition === 'below' ? imageHtml : ''}
            <div style="font-weight: 800; font-size: 9.5pt; margin-bottom: 12px; color: #000;">${processMathForPrint(q.text)}</div>
            ${binary && labels ? `
              <table style="width: 100%; border-collapse: collapse; border: 1px solid #000; margin-top: 10px;">
                <thead>
                  <tr style="background-color: #f3f4f6;">
                    <th style="border: 1px solid #000; padding: 6px; text-align: left; font-size: 8pt;">PERNYATAAN</th>
                    <th style="border: 1px solid #000; padding: 6px; text-align: center; width: 45px;">${labels.h1}</th>
                    <th style="border: 1px solid #000; padding: 6px; text-align: center; width: 45px;">${labels.h2}</th>
                  </tr>
                </thead>
                <tbody>
                  ${q.options.map((opt, i) => `
                    <tr>
                      <td style="border: 1px solid #000; padding: 6px; font-size: 8.5pt;">${i + 1}. ${processMathForPrint(opt)}</td>
                      <td style="border: 1px solid #000; padding: 6px; text-align: center; font-size: 16pt; font-weight: bold;">${answers[i] === 0 ? '•' : ''}</td>
                      <td style="border: 1px solid #000; padding: 6px; text-align: center; font-size: 16pt; font-weight: bold;">${answers[i] === 1 ? '•' : ''}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : `
              <div style="padding-left: 8px;">
                ${q.options.map((opt, i) => `<div style="margin-bottom: 5px; font-size: 9pt;"><span style="font-weight: 900;">${String.fromCharCode(65 + i)}.</span> ${processMathForPrint(opt)}</div>`).join('')}
              </div>
            `}
          </td>
          <td style="text-align: center; font-weight: 900; vertical-align: middle; color: #1e1b4b; font-size: 9pt; background-color: #f8fafc;">${formatCorrectAnswer(q)}</td>
          <td style="text-align: center; vertical-align: middle; color: #64748b; font-weight: bold;">${q.kisiKisi?.nomorSoal || idx + 1}</td>
        </tr>
      `}).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Matriks Kisi-Kisi - ${activePackage.name}</title>
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">
          <style>
            @page { size: A4 landscape; margin: 0.8cm; }
            body { font-family: 'Times New Roman', Times, serif; font-size: 8.5pt; margin: 0; padding: 10px; line-height: 1.3; color: #000; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 3px double #000; padding-bottom: 12px; }
            h1 { text-align: center; font-size: 16pt; margin: 0; text-transform: uppercase; font-weight: 900; letter-spacing: 1px; }
            h2 { text-align: center; font-size: 12pt; margin: 4px 0; text-transform: uppercase; font-weight: 700; color: #333; }
            .meta-info { display: flex; justify-content: center; gap: 20px; font-weight: 900; text-transform: uppercase; font-size: 8.5pt; margin-top: 8px; }
            table { width: 100%; border-collapse: collapse; table-layout: fixed; }
            th, td { border: 1.2pt solid #000; padding: 6px; text-align: left; vertical-align: top; word-wrap: break-word; }
            th { background-color: #f1f5f9; font-weight: 900; text-transform: uppercase; font-size: 8pt; text-align: center; vertical-align: middle; }
            .footer { margin-top: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
            .sign-box { text-align: center; width: 220px; }
            .katex { font-size: 1.1em !important; }
          </style>
        </head>
        <body>
          <div class="header">
            ${role !== 'ADMIN' ? `<h1>${settings.schoolName}</h1>` : ''}
            <h2>TRY OUT TES KEMAMPUAN AKADEMIK</h2>
            <div class="meta-info">
              <span>PAKET: ${activePackage.name}</span>
              <span>|</span>
              <span>MAPEL: ${activePackage.subject}</span>
              <span>|</span>
              <span>TA: ${settings.academicYear}</span>
            </div>
          </div>
          <table>
            <colgroup>
              <col style="width: 25px;">
              ${isMath ? `
                <col style="width: 80px;">
                <col style="width: 80px;">
                <col style="width: 90px;">
                <col style="width: 55px;">
                <col style="width: 60px;">
              ` : `
                <col style="width: 100px;">
                <col style="width: 100px;">
                <col style="width: 80px;">
              `}
              <col style="width: 140px;">
              <col style="width: 65px;">
              <col style="width: 55px;">
              <col>
              <col style="width: 50px;">
              <col style="width: 25px;">
            </colgroup>
            <thead>
              <tr>
                <th>NO</th>
                ${isMath ? `
                  <th>ELEMEN</th>
                  <th>SUB ELEMEN</th>
                  <th>KOMPETENSI</th>
                  <th>LEVEL</th>
                  <th>KONTEKS</th>
                ` : `
                  <th>KOMPETENSI</th>
                  <th>SUB KOMPETENSI</th>
                  <th>JENIS TEKS</th>
                `}
                <th>INDIKATOR SOAL</th>
                <th>BENTUK SOAL</th>
                <th>JENIS SOAL</th>
                <th>BUTIR SOAL & OPSI JAWABAN</th>
                <th>KUNCI</th>
                <th>NO</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
          <div class="footer">
            <div style="font-style: italic; font-size: 7pt; color: #444;">Dokumen dicetak otomatis melalui System Assessment Hub pada ${new Date().toLocaleString('id-ID')}</div>
            <div class="sign-box">
              <p style="font-weight: bold; margin-bottom: 60px;">Penyusun Matriks,</p>
              <div style="border-bottom: 1.5px solid #000; margin: 0 auto; width: 180px;"></div>
              <p style="font-weight: bold; margin-top: 6px; font-size: 9pt;">NIP. ........................................</p>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    
    setTimeout(() => { 
      printWindow.focus();
      printWindow.print(); 
    }, 1200);
  };

  const handleCopyPreviousStimulus = () => {
    if (!activePackage) return;
    const currentNo = questionForm.kisiKisi?.nomorSoal || 1;
    const prevNo = currentNo - 1;
    if (prevNo < 1) {
      alert("Tidak ada nomor sebelumnya.");
      return;
    }
    const prevQuestion = activePackage.questions.find(q => q.kisiKisi?.nomorSoal === prevNo);
    if (prevQuestion) {
      setQuestionForm(prev => ({
        ...prev,
        stimulus: prevQuestion.stimulus || '',
        imageUrl: prevQuestion.imageUrl || '',
        imagePosition: prevQuestion.imagePosition || 'above'
      }));
    } else {
      alert(`Butir soal nomor ${prevNo} tidak ditemukan dalam paket ini.`);
    }
  };

  const handleGenerateAIIndicator = async () => {
    const { kompetensi, subKompetensi, jenisTeks, elemen, levelKognitif } = questionForm.kisiKisi || {};
    const isMath = activePackage?.subject === Subject.MATEMATIKA;

    if (isMath && !elemen) {
      alert("Harap isi Elemen Matematika terlebih dahulu.");
      return;
    }
    if (!isMath && (!kompetensi || !subKompetensi)) {
      alert("Harap isi Kompetensi dan Sub Kompetensi terlebih dahulu agar AI dapat bekerja.");
      return;
    }

    setIsGeneratingAI(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      let prompt = "";
      
      if (isMath) {
        prompt = `Sebagai pakar kurikulum Matematika Sekolah Dasar (SD), buatkan SATU kalimat "Indikator Soal" yang spesifik untuk level KELAS 6 SD berdasarkan data berikut:
        Elemen: ${elemen}
        Level Kognitif: ${levelKognitif}
        Gunakan format: "Disajikan sebuah [Situasi/Masalah Matematika], siswa dapat [Kata Kerja Operasional] [Materi] dengan tepat."
        HANYA berikan teks indikatornya saja.`;
      } else {
        prompt = `Sebagai pakar kurikulum Bahasa Indonesia untuk Sekolah Dasar (SD), buatkan SATU kalimat "Indikator Soal" yang spesifik untuk level KELAS 6 SD berdasarkan data berikut:
        Kompetensi: ${kompetensi}
        Sub Kompetensi: ${subKompetensi}
        Jenis Teks: ${jenisTeks}
        HANYA berikan teks indikatornya saja.`;
      }

      const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
      const result = response.text?.trim();
      if (result) {
        setQuestionForm(prev => ({ ...prev, kisiKisi: { ...prev.kisiKisi!, indikatorSoal: result } }));
      }
    } catch (error) {
      console.error("AI Generation Error:", error);
      alert("Gagal menghubungi asisten AI.");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleGenerateStimulusAI = async () => {
    const isMath = activePackage?.subject === Subject.MATEMATIKA;
    const { elemen, konteks, indikatorSoal, jenisTeks } = questionForm.kisiKisi || {};
    
    if (isMath && !indikatorSoal) {
      alert("Harap isi Indikator Soal terlebih dahulu agar stimulus sesuai.");
      return;
    }

    setIsGeneratingStimulusAI(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      let prompt = "";
      
      if (isMath) {
        prompt = `Buatlah sebuah stimulus cerita pendek atau data untuk soal Matematika Kelas 6 SD. 
        Panduan Indikator: "${indikatorSoal}".
        
        SYARAT KETAT:
        1. Panjang teks WAJIB antara 50-100 kata.
        2. Gunakan kalimat yang SANGAT SEDERHANA, pendek, dan mudah dipahami anak SD (Kelas 6).
        3. Gunakan format LaTeX untuk semua pecahan, angka bertumpuk, atau simbol matematika. 
           Contoh: "5 1/2" ditulis sebagai "$5 \\frac{1}{2}$", "3/4" sebagai "$\\frac{3}{4}$", "75%" sebagai "$75 \\%$".
        4. Pastikan data angka disediakan dengan jelas untuk diolah menjadi soal.

        Format output:
        [JUDUL]
        [Isi Stimulus]`;
      } else {
        prompt = `Buatkan sebuah teks bacaan lengkap dengan Judul untuk anak kelas 6 SD.
        Jenis Teks: ${jenisTeks}
        Panjang Teks: 150-200 kata.
        Format output:
        [JUDUL]
        [Isi Bacaan]`;
      }

      const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
      const result = response.text?.trim();
      if (result) {
        setQuestionForm(prev => ({ ...prev, stimulus: result }));
      }
    } catch (error) {
      console.error("AI Stimulus Generation Error:", error);
      alert("Gagal membuat stimulus otomatis.");
    } finally {
      setIsGeneratingStimulusAI(false);
    }
  };

  const handleGenerateQuestionAI = async () => {
    const { stimulus, kisiKisi } = questionForm;
    if (!stimulus || !kisiKisi?.indikatorSoal) {
      alert("Harap isi Stimulus dan Indikator Soal terlebih dahulu.");
      return;
    }

    const isMath = activePackage?.subject === Subject.MATEMATIKA;
    const isMCMA = kisiKisi.bentukSoal === QuestionType.MCMA;
    const formsRequiringThreeOptions = [QuestionType.TRUE_FALSE, QuestionType.AGREE_DISAGREE, QuestionType.YES_NO, QuestionType.MATCH_UNMATCH];
    const isPGKCategory = formsRequiringThreeOptions.includes(kisiKisi.bentukSoal as QuestionType);

    setIsGeneratingQuestionAI(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      let specialInstructions = "";
      if (isMath && (isMCMA || isPGKCategory)) {
        specialInstructions = `
          ATURAN KHUSUS MATEMATIKA UNTUK ${kisiKisi.bentukSoal}:
          1. Opsi Jawaban (Perny याताan) WAJIB berjumlah TEPAT 3 item.
          2. Kunci Jawaban (correctAnswer) WAJIB terdiri atas TEPAT 2 (DUA) pernyataan yang BENAR/YA/SETUJU/SESUAI dan 1 pernyataan yang SALAH.
          3. Gunakan format LaTeX ($ ... $) for semua penulisan angka pecahan, persen, atau satuan luas/volume.
          4. Kalimat harus lugas dan sederhana bagi anak kelas 6 SD.
        `;
      } else if (isMCMA) {
        specialInstructions = `
          ATURAN KHUSUS UNTUK PGK MCMA:
          1. Opsi Jawaban HARUS berjumlah 5 item.
          2. Kunci Jawaban HARUS terdiri atas TEPAT 2 (DUA) indeks pilihan yang benar.
        `;
      } else if (isPGKCategory) {
        specialInstructions = `
          ATURAN KHUSUS UNTUK ${kisiKisi.bentukSoal}:
          1. Opsi Jawaban (Pernyataan) HARUS berjumlah 3 item.
          2. Kunci Jawaban HARUS terdiri atas TEPAT 2 pernyataan yang BENAR/YA/SETUJU/SESUAI dan 1 pernyataan yang SALAH.
        `;
      }

      const prompt = `Buatkan sebuah soal level kelas 6 SD berdasarkan data berikut:
      Mapel: ${activePackage?.subject}
      Stimulus: ${stimulus}
      Indikator Soal: ${kisiKisi.indikatorSoal}
      Bentuk Soal: ${kisiKisi.bentukSoal}
      ${specialInstructions}
      ${isMath ? 'Gunakan LaTeX ($ ... $) untuk simbol matematika. URUTKAN PILIHAN JAWABAN numerik dari nilai TERKECIL ke TERBESAR.' : ''}
      
      ATURAN UMUM:
      - Selalu gunakan LaTeX ($ ... $) for pecahan, contoh: $\\frac{1}{2}$.
      - Teks harus mudah dipahami anak SD.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              questionText: { type: Type.STRING, description: "Teks pertanyaan utama" },
              options: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Daftar pilihan jawaban atau pernyataan (Gunakan LaTeX jika perlu)" },
              correctAnswer: { type: Type.ARRAY, items: { type: Type.INTEGER }, description: "Daftar indeks jawaban yang benar" }
            },
            required: ["questionText", "options", "correctAnswer"]
          }
        }
      });

      const data = JSON.parse(response.text);
      
      let finalCorrectAnswer: number | number[] = 0;
      if (kisiKisi.bentukSoal === QuestionType.MCSA) {
        finalCorrectAnswer = data.correctAnswer[0] || 0;
      } else {
        finalCorrectAnswer = data.correctAnswer;
      }

      setQuestionForm(prev => ({
        ...prev,
        text: data.questionText,
        options: data.options,
        correctAnswer: finalCorrectAnswer
      }));
    } catch (error) {
      console.error("AI Question Generation Error:", error);
      alert("Gagal membuat pertanyaan otomatis.");
    } finally {
      setIsGeneratingQuestionAI(false);
    }
  };

  const handleSortOptions = (order: 'asc' | 'desc') => {
    if (!questionForm.options) return;
    
    const indexedOptions = questionForm.options.map((opt, idx) => ({ opt, idx }));
    
    indexedOptions.sort((a, b) => {
      const extractNum = (str: string) => {
        const match = str.replace(/[^\d./-]/g, '');
        if (!match) return 0;
        if (match.includes('/')) {
          const parts = match.split('/');
          if (parts.length === 2) {
            const n = parseFloat(parts[0]);
            const d = parseFloat(parts[1]);
            return isNaN(n) || isNaN(d) || d === 0 ? 0 : n / d;
          }
        }
        return parseFloat(match) || 0;
      };
      const numA = extractNum(a.opt);
      const numB = extractNum(b.opt);
      return order === 'asc' ? numA - numB : numB - numA;
    });

    const newOptions = indexedOptions.map(x => x.opt);
    
    if (questionForm.type === QuestionType.MCSA) {
      const oldIdx = questionForm.correctAnswer as number;
      const newIdx = indexedOptions.findIndex(x => x.idx === oldIdx);
      setQuestionForm(prev => ({ ...prev, options: newOptions, correctAnswer: newIdx !== -1 ? newIdx : 0 }));
    } else if (Array.isArray(questionForm.correctAnswer)) {
      const oldIndices = questionForm.correctAnswer as number[];
      const newIndices = oldIndices.map(oldIdx => indexedOptions.findIndex(x => x.idx === oldIdx)).filter(idx => idx !== -1);
      setQuestionForm(prev => ({ ...prev, options: newOptions, correctAnswer: newIndices }));
    } else {
      setQuestionForm(prev => ({ ...prev, options: newOptions }));
    }
  };

  const handleImport = async (pkg: QuestionPackage) => {
    setIsImporting(pkg.id);
    try {
      const newPkg: QuestionPackage = {
        ...pkg,
        id: `import_${pkg.id}_${Date.now()}`,
        name: `[Pusat] ${pkg.name}`,
        isMaster: false,
        originalId: pkg.id
      };      await onAddPackage(newPkg);
      setActiveSource('LOCAL');
      alert('Paket soal berhasil di-import!');
    } catch (err) {
      alert('Gagal meng-import soal.');
    } finally {
      setIsImporting(null);
    }
  };

  const handleCreatePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    const newPkg: QuestionPackage = {
      id: Date.now().toString(),
      name: packageForm.name,
      subject: packageForm.subject,
      questions: [],
      isMaster: activeSource === 'MASTER'
    };
    await onAddPackage(newPkg);
    setPackageForm({ name: '', subject: Subject.BAHASA_INDONESIA });
    setIsModalOpen(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => { setQuestionForm(prev => ({ ...prev, imageUrl: reader.result as string })); };
      reader.readAsDataURL(file);
    }
  };

  const handleTypeChange = (newType: QuestionType) => {
    const isMath = activePackage?.subject === Subject.MATEMATIKA;
    const isPGK = isBinaryType(newType) || newType === QuestionType.MCMA;
    
    const defaultOptionCount = (isMath && isPGK) ? 3 : (newType === QuestionType.MCSA || newType === QuestionType.MCMA) ? 5 : 3;

    setQuestionForm(prev => ({
      ...prev,
      type: newType,
      kisiKisi: { ...prev.kisiKisi!, bentukSoal: newType },
      options: Array(defaultOptionCount).fill(''),
      correctAnswer: (newType === QuestionType.MCMA || isBinaryType(newType)) ? [] : 0
    }));
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPackageId) {
      alert("Gagal menyimpan: ID Paket tidak ditemukan.");
      return;
    }
    try {
      if (!questionForm.text) { alert("Harap isi teks pertanyaan."); return; }
      const questionData: Question = {
        id: editingQuestion?.id || Date.now().toString(),
        text: questionForm.text || '',
        type: (questionForm.type as QuestionType) || QuestionType.MCSA,
        options: questionForm.options || [],
        correctAnswer: questionForm.correctAnswer ?? 0,
        stimulus: questionForm.stimulus || '',
        imageUrl: questionForm.imageUrl || '',
        imagePosition: questionForm.imagePosition || 'above',
        kisiKisi: {
          kompetensi: questionForm.kisiKisi?.kompetensi || '',
          subKompetensi: questionForm.kisiKisi?.subKompetensi || '',
          jenisTeks: questionForm.kisiKisi?.jenisTeks || 'Teks Deskripsi',
          elemen: questionForm.kisiKisi?.elemen || 'Bilangan',
          subElemen: questionForm.kisiKisi?.subElemen || '',
          levelKognitif: questionForm.kisiKisi?.levelKognitif || 'L1 (Pemahaman)',
          konteks: questionForm.kisiKisi?.konteks || 'Masalah Matematika',
          indikatorSoal: questionForm.kisiKisi?.indikatorSoal || '',
          bentukSoal: questionForm.kisiKisi?.bentukSoal || (questionForm.type as string) || QuestionType.MCSA,
          jenisSoal: questionForm.kisiKisi?.jenisSoal || 'TUNGGAL',
          nomorSoal: questionForm.kisiKisi?.nomorSoal || 1
        }
      };
      if (editingQuestion) { await onUpdateQuestion(editingPackageId, questionData); } 
      else { await onAddQuestion(editingPackageId, questionData); }
      setIsAddingQuestion(false);
      setEditingQuestion(null);
      setQuestionForm({
        text: '', type: QuestionType.MCSA, options: ['', '', '', '', ''], correctAnswer: 0, stimulus: '', imagePosition: 'above',
        kisiKisi: { 
          kompetensi: '', subKompetensi: '', jenisTeks: 'Teks Deskripsi', 
          elemen: 'Bilangan', subElemen: '', levelKognitif: 'L1 (Pemahaman)', konteks: 'Masalah Matematika',
          indikatorSoal: '', bentukSoal: QuestionType.MCSA, jenisSoal: 'TUNGGAL', nomorSoal: (activePackage?.questions.length || 0) + 1 
        }
      });
    } catch (err) {
      console.error("Save Error:", err);
      alert("Terjadi kesalahan saat menyimpan soal.");
    }
  };

  const startEditQuestion = (q: Question) => {
    setEditingQuestion(q);
    setQuestionForm(q);
    setIsAddingQuestion(true);
  };

  const handleDeletePackageConfirm = async () => {
    if (packageToDelete) {
      await onDeletePackage(packageToDelete);
      setPackageToDelete(null);
    }
  };

  const handleDeleteQuestionConfirm = async () => {
    if (questionToDelete) {
      await onDeleteQuestion(questionToDelete.pkgId, questionToDelete.qId);
      setQuestionToDelete(null);
    }
  };

  const displayPackages = activeSource === 'LOCAL' ? packages : masterPackages;
  const activePackage = [...packages, ...masterPackages].find(p => String(p.id) === String(editingPackageId));
  const isAuthorizedToEdit = activePackage && (!activePackage.isMaster || role === 'ADMIN');

  if (editingPackageId && activePackage) {
    const isMath = activePackage.subject === Subject.MATEMATIKA;

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
        <div className="flex flex-col md:flex-row items-center justify-between bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm gap-4">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <button onClick={() => setEditingPackageId(null)} className="p-3 hover:bg-slate-100 rounded-2xl text-slate-400 transition-all">
              <ChevronLeft size={24} />
            </button>
            <div>
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">{activePackage.name}</h3>
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{activePackage.subject} • {activePackage.questions.length} Butir Soal</p>
            </div>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <button onClick={() => setIsViewingFullKisiKisi(true)} className="flex-1 md:flex-none bg-sky-50 hover:bg-sky-100 text-sky-600 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-sky-100">
              <ClipboardList size={16} /> Kisi-Kisi
            </button>
            {isAuthorizedToEdit && (
              <button onClick={() => { 
                setEditingQuestion(null); 
                setQuestionForm({ 
                  text: '', type: QuestionType.MCSA, options: ['', '', '', '', ''], correctAnswer: 0,
                  kisiKisi: { 
                    kompetensi: '', subKompetensi: '', jenisTeks: 'Teks Deskripsi', 
                    elemen: 'Bilangan', subElemen: '', levelKognitif: 'L1 (Pemahaman)', konteks: 'Masalah Matematika',
                    indikatorSoal: '', bentukSoal: QuestionType.MCSA, jenisSoal: 'TUNGGAL', nomorSoal: activePackage.questions.length + 1 
                  }
                }); 
                setIsAddingQuestion(true); 
              }}
              className="flex-1 md:flex-none bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-2"
              >
                <Plus size={16} /> Tambah Butir Soal
              </button>
            )}
          </div>
        </div>

        {isAddingQuestion ? (
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden animate-in zoom-in duration-300">
            <div className="p-8 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
               <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight">{editingQuestion ? 'Edit Butir Soal' : 'Buat Soal Baru'}</h4>
               <div className="flex gap-2">
                 <button type="button" onClick={() => setViewingKisiKisi(questionForm.kisiKisi as KisiKisi)} className="p-3 text-sky-600 hover:bg-sky-50 rounded-xl transition-all flex items-center gap-2 font-black text-[10px] uppercase tracking-widest">
                   <FileSearch size={18} /> Pratinjau Kisi-Kisi
                 </button>
                 <button onClick={() => setIsAddingQuestion(false)} className="text-slate-400 hover:text-slate-600 p-2 transition-all"><X size={24} /></button>
               </div>
            </div>
            
            <form onSubmit={handleSaveQuestion} className="p-8 space-y-10">
               <div className="space-y-4">
                  <h5 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] flex items-center gap-2 mb-4"><Target size={14} /> Matriks Kisi-Kisi Soal ({activePackage.subject})</h5>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-1 space-y-1.5">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">No. Soal</label>
                       <input type="number" className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold text-sm" value={questionForm.kisiKisi?.nomorSoal} onChange={(e) => setQuestionForm({...questionForm, kisiKisi: {...questionForm.kisiKisi!, nomorSoal: parseInt(e.target.value)}})} />
                    </div>

                    {isMath ? (
                      <>
                        <div className="md:col-span-3 space-y-1.5">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-1"><Layers size={10}/> Elemen Matematika</label>
                          <select className="w-full px-5 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold text-sm" value={questionForm.kisiKisi?.elemen} onChange={(e) => setQuestionForm({...questionForm, kisiKisi: {...questionForm.kisiKisi!, elemen: e.target.value}})}>
                            <option value="Bilangan">Bilangan</option>
                            <option value="Aljabar">Aljabar</option>
                            <option value="Pengukuran">Pengukuran</option>
                            <option value="Geometri">Geometri</option>
                            <option value="Analisis Data dan Peluang">Analisis Data dan Peluang</option>
                          </select>
                        </div>
                        <div className="md:col-span-2 space-y-1.5">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Sub Elemen</label>
                          <input className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-bold" value={questionForm.kisiKisi?.subElemen} onChange={(e) => setQuestionForm({...questionForm, kisiKisi: {...questionForm.kisiKisi!, subElemen: e.target.value}})} placeholder="Misal: Operasi Hitung..." />
                        </div>
                        <div className="md:col-span-2 space-y-1.5">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Kompetensi</label>
                          <input className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-bold" value={questionForm.kisiKisi?.kompetensi} onChange={(e) => setQuestionForm({...questionForm, kisiKisi: {...questionForm.kisiKisi!, kompetensi: e.target.value}})} placeholder="Misal: Menentukan hasil bagi..." />
                        </div>
                        <div className="md:col-span-2 space-y-1.5">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-1"><Zap size={10}/> Level Kognitif</label>
                          <select className="w-full px-5 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold text-sm" value={questionForm.kisiKisi?.levelKognitif} onChange={(e) => setQuestionForm({...questionForm, kisiKisi: {...questionForm.kisiKisi!, levelKognitif: e.target.value}})}>
                            <option value="L1 (Pemahaman)">L1 (Pemahaman)</option>
                            <option value="L2 (Aplikasi)">L2 (Aplikasi)</option>
                            <option value="L3 (Penalaran)">L3 (Penalaran)</option>
                          </select>
                        </div>
                        <div className="md:col-span-2 space-y-1.5">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-1"><Map size={10}/> Konteks</label>
                          <select className="w-full px-5 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold text-sm" value={questionForm.kisiKisi?.konteks} onChange={(e) => setQuestionForm({...questionForm, kisiKisi: {...questionForm.kisiKisi!, konteks: e.target.value}})}>
                            <option value="Masalah Matematika">Masalah Matematika</option>
                            <option value="Masalah Sehari-hari">Masalah Sehari-hari</option>
                          </select>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="md:col-span-3 space-y-1.5">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Kompetensi</label>
                          <input className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-bold" value={questionForm.kisiKisi?.kompetensi} onChange={(e) => setQuestionForm({...questionForm, kisiKisi: {...questionForm.kisiKisi!, kompetensi: e.target.value}})} placeholder="Matriks Kompetensi..." />
                        </div>
                        <div className="md:col-span-2 space-y-1.5">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Sub Kompetensi</label>
                          <input className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-bold" value={questionForm.kisiKisi?.subKompetensi} onChange={(e) => setQuestionForm({...questionForm, kisiKisi: {...questionForm.kisiKisi!, subKompetensi: e.target.value}})} placeholder="Matriks Sub Kompetensi..." />
                        </div>
                        <div className="md:col-span-2 space-y-1.5">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-1"><BookMarked size={10}/> Jenis Teks</label>
                          <select className="w-full px-5 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold text-sm" value={questionForm.kisiKisi?.jenisTeks} onChange={(e) => setQuestionForm({...questionForm, kisiKisi: {...questionForm.kisiKisi!, jenisTeks: e.target.value}})}>
                            <option value="Teks Deskripsi">Teks Deskripsi</option><option value="Teks Prosedur">Teks Prosedur</option><option value="Teks Eksplanasi">Teks Eksplanasi</option><option value="Teks Eksposisi">Teks Eksposisi</option><option value="Teks Hasil Pengamatan">Teks Hasil Pengamatan</option><option value="Teks Fiksi">Teks Fiksi</option>
                          </select>
                        </div>
                      </>
                    )}

                    <div className="md:col-span-4 space-y-1.5">
                       <div className="flex justify-between items-end mb-1 px-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Indikator Soal</label>
                          <button type="button" disabled={isGeneratingAI} onClick={handleGenerateAIIndicator} className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg text-[8px] font-black uppercase tracking-widest hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50">
                            {isGeneratingAI ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                            {isGeneratingAI ? 'Merespons...' : 'Generate Indikator (AI)'}
                          </button>
                       </div>
                       <textarea className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold text-sm min-h-[60px]" value={questionForm.kisiKisi?.indikatorSoal} onChange={(e) => setQuestionForm({...questionForm, kisiKisi: {...questionForm.kisiKisi!, indikatorSoal: e.target.value}})} placeholder="Tulis indikator atau gunakan AI..." />
                    </div>
                    <div className="md:col-span-2 space-y-1.5">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-1"><FileType size={10}/> Bentuk Soal</label>
                       <select className="w-full px-5 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold text-sm" value={questionForm.kisiKisi?.bentukSoal} onChange={(e) => handleTypeChange(e.target.value as QuestionType)}>
                         {Object.values(QuestionType).map(type => (<option key={type} value={type}>{type}</option>))}
                       </select>
                    </div>
                    <div className="md:col-span-2 space-y-1.5">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-1"><Tags size={10}/> Jenis Soal</label>
                       <select className="w-full px-5 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold text-sm" value={questionForm.kisiKisi?.jenisSoal} onChange={(e) => setQuestionForm({...questionForm, kisiKisi: {...questionForm.kisiKisi!, jenisSoal: e.target.value}})}>
                         <option value="TUNGGAL">TUNGGAL</option><option value="Grup">Grup</option>
                       </select>
                    </div>
                  </div>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <div className="space-y-2">
                       <div className="flex justify-between items-center px-1 mb-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><AlignLeft size={14} /> Stimulus / Bacaan</label>
                          <div className="flex gap-2">
                             <button type="button" onClick={handleCopyPreviousStimulus} className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg text-[8px] font-black uppercase tracking-widest hover:from-amber-600 hover:to-orange-700 transition-all shadow-lg shadow-amber-200"><Copy size={10} /> Ambil No. Sebelumnya</button>
                             <button type="button" disabled={isGeneratingStimulusAI} onClick={handleGenerateStimulusAI} className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-indigo-600 text-white rounded-lg text-[8px] font-black uppercase tracking-widest hover:from-emerald-700 hover:to-indigo-700 transition-all shadow-lg shadow-emerald-200 disabled:opacity-50">
                                {isGeneratingStimulusAI ? <Loader2 size={10} className="animate-spin" /> : <Wand2 size={10} />}{isGeneratingStimulusAI ? 'Merespons...' : 'Generate Stimulus (AI)'}
                             </button>
                          </div>
                       </div>
                       <textarea className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl min-h-[220px] outline-none focus:ring-4 focus:ring-indigo-500/10 font-medium text-sm leading-relaxed" value={questionForm.stimulus} onChange={(e) => setQuestionForm({...questionForm, stimulus: e.target.value})} placeholder="Tuliskan stimulus di sini..." />
                       {questionForm.stimulus && (
                         <div className="mt-4 p-6 bg-indigo-50 border-2 border-indigo-100 rounded-[2rem] shadow-inner animate-in fade-in slide-in-from-top-2 duration-500">
                           <p className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2"><Eye size={12}/> Pratinjau Tampilan Rumus</p>
                           <MathText text={questionForm.stimulus} className="text-slate-800 font-medium text-sm leading-relaxed block" />
                         </div>
                       )}
                    </div>

                    <div className="space-y-2">
                       <div className="flex justify-between items-center px-1 mb-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Pertanyaan (SOAL)</label>
                          <button type="button" disabled={isGeneratingQuestionAI} onClick={handleGenerateQuestionAI} className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-rose-500 text-white rounded-lg text-[8px] font-black uppercase tracking-widest hover:from-indigo-600 hover:to-rose-600 transition-all shadow-lg shadow-rose-200 disabled:opacity-50">
                            {isGeneratingQuestionAI ? <Loader2 size={10} className="animate-spin" /> : <BrainCircuit size={10} />}{isGeneratingQuestionAI ? 'Berpikir...' : 'Magic Question (AI)'}
                          </button>
                       </div>
                       <textarea required className="w-full px-5 py-4 bg-white border border-slate-300 rounded-2xl min-h-[120px] outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold text-base shadow-sm" value={questionForm.text} onChange={(e) => setQuestionForm({...questionForm, text: e.target.value})} placeholder="Tuliskan pertanyaan utama..." />
                       {/* Fix: questionText was undefined, changed to questionForm.text */}
                       {questionForm.text && (
                         <div className="mt-4 p-4 bg-rose-50 border border-rose-100 rounded-2xl">
                           <MathText text={questionForm.text} className="text-slate-800 font-bold text-sm" />
                         </div>
                       )}
                    </div>

                    <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-200 space-y-4">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2"><ImageIcon size={14} /> Gambar Pendukung</label>
                       <div className="space-y-3">
                         <div className="flex flex-col md:flex-row items-center gap-3">
                            <div className="relative flex-1 w-full group">
                              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-400 transition-colors"><LinkIcon size={14} /></div>
                              <input type="text" placeholder="Masukkan URL Gambar (https://...)" className="w-full pl-10 pr-5 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/10 font-medium text-[11px] transition-all" value={questionForm.imageUrl || ''} onChange={(e) => setQuestionForm({...questionForm, imageUrl: e.target.value})} />
                            </div>
                            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Atau</span>
                            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" id="q-image" />
                            <label htmlFor="q-image" className="cursor-pointer bg-white border border-slate-200 px-6 py-3 rounded-xl text-[10px] font-black uppercase text-slate-600 hover:bg-slate-50 transition-all shadow-sm whitespace-nowrap">Upload File</label>
                         </div>
                         {questionForm.imageUrl && (
                           <div className="flex justify-end"><button type="button" onClick={() => setQuestionForm({...questionForm, imageUrl: undefined})} className="text-red-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 hover:text-red-600 transition-colors"><Trash2 size={12} /> Hapus Gambar</button></div>
                         )}
                       </div>
                       {questionForm.imageUrl && (
                         <div className="mt-4 p-4 bg-white rounded-2xl border border-slate-200 relative group text-center animate-in zoom-in duration-300">
                            <img src={questionForm.imageUrl} className="max-h-48 rounded-lg mx-auto shadow-sm" alt="Preview" onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/600x400?text=Gambar+Tidak+Ditemukan'; }} />
                            <div className="mt-4 flex justify-center gap-2">
                               <button type="button" onClick={() => setQuestionForm({...questionForm, imagePosition: 'above'})} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase border transition-all ${questionForm.imagePosition === 'above' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-400 border-slate-200'}`}>Di Atas Stimulus</button>
                               <button type="button" onClick={() => setQuestionForm({...questionForm, imagePosition: 'below'})} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase border transition-all ${questionForm.imagePosition === 'below' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-400 border-slate-200'}`}>Di Bawah Stimulus</button>
                            </div>
                         </div>
                       )}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-4">
                       <div className="flex justify-between items-center px-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest tracking-[0.1em]">KUNCI JAWABAN & Opsi</label>
                        <div className="flex gap-2">
                           {isMath && !isBinaryType(questionForm.type as QuestionType) && (
                             <>
                               <button type="button" onClick={() => handleSortOptions('asc')} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all flex items-center gap-1 font-black text-[8px] uppercase tracking-widest border border-indigo-100 shadow-sm" title="Urutkan dari Terkecil">
                                 <SortAsc size={12} /> ASC
                               </button>
                               <button type="button" onClick={() => handleSortOptions('desc')} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all flex items-center gap-1 font-black text-[8px] uppercase tracking-widest border border-indigo-100 shadow-sm" title="Urutkan dari Terbesar">
                                 <SortDesc size={12} /> DESC
                               </button>
                             </>
                           )}
                           {!isBinaryType(questionForm.type as QuestionType) && <span className="text-[9px] font-bold text-amber-500 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">Klik Huruf untuk Kunci</span>}
                        </div>
                       </div>
                       
                       <div className="space-y-3">
                          {isBinaryType(questionForm.type as QuestionType) ? (
                            <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm">
                              <div className="bg-[#26a69a] p-4 flex justify-between text-[10px] font-black text-white uppercase tracking-widest px-6">
                                <span className="flex-1">PERNYATAAN</span>
                                <div className="flex gap-8 md:gap-16 pr-8">
                                  <span>{getBinaryLabels(questionForm.type as QuestionType).h1}</span>
                                  <span>{getBinaryLabels(questionForm.type as QuestionType).h2}</span>
                                </div>
                                <span className="w-10"></span>
                              </div>
                              <div className="divide-y divide-slate-100">
                                {questionForm.options?.map((opt, idx) => {
                                  const currentKeys = (questionForm.correctAnswer as number[]) || [];
                                  return (
                                    <div key={idx} className="p-4 px-6 flex items-center gap-4 hover:bg-slate-50 transition-colors animate-in slide-in-from-left duration-300">
                                      <div className="flex-1 space-y-1">
                                        <input 
                                          className="w-full bg-transparent border-none outline-none font-bold text-slate-700 placeholder-slate-300 text-sm"
                                          placeholder="Tulis pernyataan..."
                                          value={opt}
                                          onChange={(e) => {
                                            const newOpts = [...(questionForm.options || [])];
                                            newOpts[idx] = e.target.value;
                                            setQuestionForm({...questionForm, options: newOpts});
                                          }}
                                        />
                                        {opt && <MathText text={opt} className="text-[10px] text-indigo-500 block font-bold" />}
                                      </div>
                                      <div className="flex gap-10 md:gap-16 pr-4">
                                        <button 
                                          type="button"
                                          onClick={() => {
                                            const newKeys = [...currentKeys];
                                            newKeys[idx] = 0;
                                            setQuestionForm({...questionForm, correctAnswer: newKeys});
                                          }}
                                          className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${currentKeys[idx] === 0 ? 'border-[#26a69a] bg-[#26a69a]/10' : 'border-slate-200 hover:border-indigo-300'}`}
                                        >
                                          {currentKeys[idx] === 0 && <div className="w-4 h-4 rounded-full bg-[#26a69a] shadow-sm"></div>}
                                        </button>
                                        <button 
                                          type="button"
                                          onClick={() => {
                                            const newKeys = [...currentKeys];
                                            newKeys[idx] = 1;
                                            setQuestionForm({...questionForm, correctAnswer: newKeys});
                                          }}
                                          className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${currentKeys[idx] === 1 ? 'border-red-500 bg-red-50' : 'border-slate-200 hover:border-indigo-300'}`}
                                        >
                                          {currentKeys[idx] === 1 && <div className="w-4 h-4 rounded-full bg-red-500 shadow-sm"></div>}
                                        </button>
                                      </div>
                                      <button 
                                        type="button" 
                                        onClick={() => {
                                          const newOpts = questionForm.options?.filter((_, i) => i !== idx);
                                          const newKeys = ((questionForm.correctAnswer as number[]) || []).filter((_, i) => i !== idx);
                                          setQuestionForm({...questionForm, options: newOpts, correctAnswer: newKeys});
                                        }}
                                        className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                              <button 
                                type="button" 
                                onClick={() => {
                                  setQuestionForm({
                                    ...questionForm, 
                                    options: [...(questionForm.options || []), ''],
                                    correctAnswer: [...((questionForm.correctAnswer as number[]) || []), 0]
                                  });
                                }}
                                className="w-full py-4 text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:bg-indigo-50/50 transition-all flex items-center justify-center gap-2 border-t border-slate-100 bg-slate-50/30"
                              >
                                <Plus size={14} /> Tambah Pernyataan Baru
                              </button>
                            </div>
                          ) : (
                            <>
                              {questionForm.options?.map((opt, idx) => (
                                <div key={idx} className="flex gap-3 items-start animate-in slide-in-from-left duration-300">
                                  <button type="button" onClick={() => { if (questionForm.type === QuestionType.MCSA) { setQuestionForm({...questionForm, correctAnswer: idx}); } else { const current = (questionForm.correctAnswer as number[]) || []; const newAns = current.includes(idx) ? current.filter(i => i !== idx) : [...current, idx]; setQuestionForm({...questionForm, correctAnswer: newAns}); } }} className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm shrink-0 transition-all ${(questionForm.type === QuestionType.MCSA && questionForm.correctAnswer === idx) || (Array.isArray(questionForm.correctAnswer) && questionForm.correctAnswer.includes(idx)) ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200 ring-4 ring-emerald-500/10' : 'bg-slate-100 text-slate-400 hover:bg-slate-200 border border-slate-200'}`}>{String.fromCharCode(65 + idx)}</button>
                                  <div className="flex-1 space-y-1">
                                    <input required className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium text-sm transition-all" placeholder={`Pilihan ${String.fromCharCode(65 + idx)}...`} value={opt} onChange={(e) => { const newOpts = [...(questionForm.options || [])]; newOpts[idx] = e.target.value; setQuestionForm({...questionForm, options: newOpts}); }} />
                                    {opt && <MathText text={opt} className="text-[10px] text-indigo-500 block font-bold px-2" />}
                                  </div>
                                  <button type="button" onClick={() => setQuestionForm({...questionForm, options: questionForm.options?.filter((_, i) => i !== idx)})} className="p-3 text-slate-300 hover:text-red-500 transition-colors mt-0.5"><Trash2 size={18} /></button>
                                </div>
                              ))}
                              <button type="button" onClick={() => setQuestionForm({...questionForm, options: [...(questionForm.options || []), '']})} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-black text-[10px] uppercase tracking-widest hover:border-indigo-300 hover:text-indigo-600 transition-all bg-slate-50/30">+ Tambah Opsi Jawaban</button>
                            </>
                          )}
                       </div>
                    </div>
                  </div>
               </div>

               <div className="pt-10 border-t border-slate-100 flex flex-col md:flex-row gap-4">
                  <button type="button" onClick={() => setIsAddingQuestion(false)} className="flex-1 py-5 border-2 border-slate-200 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-50 transition-all">Batalkan</button>
                  <button type="submit" className="flex-[2] py-5 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-emerald-700 shadow-2xl shadow-emerald-100 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"><Save size={20} /> Simpan Butir Soal</button>
               </div>
            </form>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {activePackage.questions.length > 0 ? [...activePackage.questions].sort((a,b) => (a.kisiKisi?.nomorSoal || 0) - (b.kisiKisi?.nomorSoal || 0)).map((q, idx) => (
              <div key={q.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col md:flex-row gap-6 hover:border-indigo-200 transition-all group relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-900 group-hover:bg-indigo-600 transition-colors"></div>
                 <div className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-black text-xl shrink-0 shadow-lg shadow-slate-200 group-hover:bg-indigo-600 transition-colors">{q.kisiKisi?.nomorSoal || idx + 1}</div>
                 <div className="flex-1 space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100 uppercase tracking-widest">{q.type}</span>
                      {isMath ? (
                        <>
                          {q.kisiKisi?.elemen && <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 uppercase tracking-widest">{q.kisiKisi.elemen}</span>}
                          {q.kisiKisi?.levelKognitif && <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-100 uppercase tracking-widest">{q.kisiKisi.levelKognitif}</span>}
                        </>
                      ) : (
                        q.kisiKisi?.kompetensi && <span className="text-[9px] font-black text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 uppercase tracking-widest">{q.kisiKisi.kompetensi}</span>
                      )}
                    </div>
                    <div className="text-slate-800 font-bold text-lg leading-tight tracking-tight">
                       <MathText text={q.text} />
                    </div>
                 </div>
                 <div className="flex md:flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                    <button onClick={() => setViewingKisiKisi(q.kisiKisi as KisiKisi)} title="Lihat Kisi-Kisi" className="flex-1 md:flex-none p-3.5 bg-sky-50 text-sky-600 rounded-2xl hover:bg-sky-600 hover:text-white transition-all shadow-sm border border-sky-100"><FileSearch size={18} /></button>
                    {isAuthorizedToEdit && (<><button onClick={() => startEditQuestion(q)} className="flex-1 md:flex-none p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm border border-indigo-100"><Edit3 size={18} /></button><button onClick={() => setQuestionToDelete({pkgId: String(editingPackageId), qId: q.id})} className="flex-1 md:flex-none p-3.5 bg-red-50 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-sm border border-red-100"><Trash2 size={18} /></button></>)}
                 </div>
              </div>
            )) : (
              <div className="bg-white py-32 rounded-[3.5rem] border-2 border-dashed border-slate-200 text-center flex flex-col items-center gap-4 shadow-sm"><div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center text-slate-200"><AlignLeft size={48} /></div><div><p className="text-slate-800 font-black text-xl uppercase tracking-tight">Belum Ada Soal</p><p className="text-slate-400 font-bold italic text-sm mt-1">Gunakan tombol "Tambah Butir Soal" di atas.</p></div></div>
            )}
          </div>
        )}

        {questionToDelete && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[210] p-4">
            <div className="bg-white rounded-3xl w-full max-sm shadow-2xl overflow-hidden p-8 text-center space-y-4 animate-in fade-in zoom-in duration-200">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-2">
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase">Hapus Butir Soal?</h3>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">
                Butir soal ini akan dihapus secara permanen dari paket. Tindakan ini tidak dapat dibatalkan.
              </p>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setQuestionToDelete(null)} className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all">Batal</button>
                <button onClick={handleDeleteQuestionConfirm} className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-200">Ya, Hapus</button>
              </div>
            </div>
          </div>
        )}

        {viewingKisiKisi && (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center z-[150] p-6 animate-in fade-in duration-200">
            <div className="bg-white rounded-[3rem] w-full max-w-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
              <div className="p-10 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center"><div className="flex items-center gap-4"><div className="p-4 bg-sky-100 text-sky-600 rounded-2xl shadow-inner"><FileSearch size={24} /></div><div><h3 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Detail Kisi-Kisi Soal</h3><p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Ringkasan Parameter Matriks No. {viewingKisiKisi.nomorSoal}</p></div></div><button onClick={() => setViewingKisiKisi(null)} className="p-3 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-all"><X size={24} /></button></div>
              <div className="p-10"><div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  {isMath ? (
                    <>
                      <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Elemen</label><div className="p-5 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-100 font-bold text-sm">{viewingKisiKisi.elemen || '-'}</div></div>
                      <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Kompetensi</label><div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 font-bold text-slate-700 leading-relaxed">{viewingKisiKisi.kompetensi || '-'}</div></div>
                    </>
                  ) : (
                    <>
                      <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Kompetensi Inti</label><div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 font-bold text-slate-700 leading-relaxed">{viewingKisiKisi.kompetensi || '-'}</div></div>
                      <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Sub-Kompetensi</label><div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 font-bold text-slate-700 leading-relaxed">{viewingKisiKisi.subKompetensi || '-'}</div></div>
                    </>
                  )}
                </div>
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    {isMath ? (
                      <>
                        <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Level Kognitif</label><div className="p-5 bg-amber-50 text-amber-700 rounded-2xl border border-amber-100 font-black text-xs uppercase tracking-tight">{viewingKisiKisi.levelKognitif || '-'}</div></div>
                        <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Konteks</label><div className="p-5 bg-indigo-50 text-indigo-700 rounded-2xl border border-indigo-100 font-black text-xs uppercase tracking-tight">{viewingKisiKisi.konteks || '-'}</div></div>
                      </>
                    ) : (
                      <>
                        <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Jenis Teks</label><div className="p-5 bg-indigo-50 text-indigo-700 rounded-2xl border border-indigo-100 font-black text-xs uppercase tracking-tight">{viewingKisiKisi.jenisTeks || '-'}</div></div>
                        <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Bentuk Soal</label><div className="p-5 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-100 font-black text-xs uppercase tracking-tight">{viewingKisiKisi.bentukSoal || '-'}</div></div>
                      </>
                    )}
                  </div>
                  <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Indikator Soal</label><div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 font-medium text-slate-600 italic leading-relaxed min-h-[100px] border-l-4 border-l-sky-500">"{viewingKisiKisi.indikatorSoal || '-'}"</div></div>
                </div>
              </div><div className="mt-10 pt-10 border-t border-slate-100 flex justify-between items-center"><div className="flex items-center gap-3 text-slate-400"><Info size={18} /><p className="text-[10px] font-bold uppercase tracking-widest">Matriks ini sesuai dengan Standar Asesmen Kurikulum Merdeka</p></div><button onClick={() => setViewingKisiKisi(null)} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all active:scale-95">Tutup Rincian</button></div></div>
            </div>
          </div>
        )}

        {isViewingFullKisiKisi && (
          <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-2xl flex flex-col z-[200] animate-in fade-in duration-300">
            <div className="px-8 py-6 flex justify-between items-center shrink-0 border-b border-white/10">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center border border-indigo-500/30">
                  <Eye size={20} />
                </div>
                <h3 className="text-lg font-black text-white tracking-widest uppercase">PRATINJAU KISI-KISI ({activePackage.subject})</h3>
              </div>
              <div className="flex items-center gap-4">
                <button onClick={handlePrint} className="flex items-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-2xl border border-indigo-500/30"><Printer size={16} /> CETAK SEKARANG</button>
                <button onClick={() => setIsViewingFullKisiKisi(false)} className="p-3 text-white/40 hover:text-white transition-all"><X size={28} /></button>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto p-4 md:p-12 flex justify-center custom-scrollbar">
              <div className="bg-white w-full max-w-[297mm] min-h-fit shadow-[0_0_100px_rgba(0,0,0,0.5)] p-12 flex flex-col animate-in slide-in-from-bottom-10 duration-700">
                
                <div className="text-center mb-8 border-b-4 border-double border-slate-900 pb-6">
                  {role !== 'ADMIN' && (
                    <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight leading-none mb-1">{settings.schoolName}</h1>
                  )}
                  <h2 className="text-xl font-bold text-slate-800 uppercase tracking-tight">TRY OUT TES KEMAMPUAN AKADEMIK</h2>
                  <div className="flex justify-center gap-8 mt-4 font-black text-[10px] uppercase tracking-widest text-slate-500">
                    <span>PAKET: {activePackage.name}</span>
                    <span className="opacity-30">|</span>
                    <span>MATA PELAJARAN: {activePackage.subject}</span>
                    <span className="opacity-30">|</span>
                    <span>TA: {settings.academicYear}</span>
                  </div>
                </div>

                <div className="border border-slate-900 overflow-x-auto">
                  <table className="w-full text-[10px] border-collapse table-fixed">
                    <thead>
                      <tr className="bg-slate-50 text-slate-900 font-black uppercase text-center border-b border-slate-900">
                        <th className="border-r border-slate-900 p-2" style={{width: '30px'}}>NO</th>
                        {isMath ? (
                          <>
                            <th className="border-r border-slate-900 p-2" style={{width: '80px'}}>ELEMEN</th>
                            <th className="border-r border-slate-900 p-2" style={{width: '80px'}}>SUB ELEMEN</th>
                            <th className="border-r border-slate-900 p-2" style={{width: '90px'}}>KOMPETENSI</th>
                            <th className="border-r border-slate-900 p-2" style={{width: '60px'}}>LEVEL</th>
                            <th className="border-r border-slate-900 p-2" style={{width: '60px'}}>KONTEKS</th>
                          </>
                        ) : (
                          <>
                            <th className="border-r border-slate-900 p-2" style={{width: '100px'}}>KOMPETENSI</th>
                            <th className="border-r border-slate-900 p-2" style={{width: '100px'}}>SUB KOMPETENSI</th>
                            <th className="border-r border-slate-900 p-2" style={{width: '70px'}}>JENIS TEKS</th>
                          </>
                        )}
                        <th className="border-r border-slate-900 p-2" style={{width: '140px'}}>INDIKATOR SOAL</th>
                        <th className="border-r border-slate-900 p-2" style={{width: '60px'}}>BENTUK SOAL</th>
                        <th className="border-r border-slate-900 p-2" style={{width: '60px'}}>JENIS SOAL</th>
                        <th className="border-r border-slate-900 p-2">SOAL & PILIHAN JAWABAN</th>
                        <th className="border-r border-slate-900 p-2" style={{width: '50px'}}>KUNCI</th>
                        <th className="p-2" style={{width: '30px'}}>NO.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900">
                      {activePackage.questions.length > 0 ? [...activePackage.questions].sort((a,b) => (a.kisiKisi?.nomorSoal || 0) - (b.kisiKisi?.nomorSoal || 0)).map((q, idx) => {
                        const { title, body } = getCleanedStimulus(q.stimulus);
                        const binary = isBinaryType(q.type);
                        const labels = binary ? getBinaryLabels(q.type) : null;
                        const answers = Array.isArray(q.correctAnswer) ? q.correctAnswer : [];
                        
                        return (
                          <tr key={q.id} className="text-slate-800">
                            <td className="border-r border-slate-900 p-2 text-center font-black">{idx + 1}</td>
                            
                            {isMath ? (
                              <>
                                <td className="border-r border-slate-900 p-2 font-bold align-top text-center text-emerald-700">{q.kisiKisi?.elemen || '-'}</td>
                                <td className="border-r border-slate-900 p-2 font-medium align-top leading-snug">{q.kisiKisi?.subElemen || '-'}</td>
                                <td className="border-r border-slate-900 p-2 font-medium align-top leading-snug">{q.kisiKisi?.kompetensi || '-'}</td>
                                <td className="border-r border-slate-900 p-2 text-center font-bold align-top text-[8px] text-amber-600">{q.kisiKisi?.levelKognitif || '-'}</td>
                                <td className="border-r border-slate-900 p-2 text-center font-bold align-top text-[8px] text-indigo-600">{q.kisiKisi?.konteks || '-'}</td>
                              </>
                            ) : (
                              <>
                                <td className="border-r border-slate-900 p-2 font-medium align-top leading-snug">{q.kisiKisi?.kompetensi || '-'}</td>
                                <td className="border-r border-slate-900 p-2 font-medium align-top leading-snug">{q.kisiKisi?.subKompetensi || '-'}</td>
                                <td className="border-r border-slate-900 p-2 font-black align-top text-center uppercase tracking-tighter">{q.kisiKisi?.jenisTeks || '-'}</td>
                              </>
                            )}

                            <td className="border-r border-slate-900 p-2 text-[9px] leading-relaxed italic align-top">{q.kisiKisi?.indikatorSoal || '-'}</td>
                            <td className="border-r border-slate-900 p-2 text-center font-bold align-top text-[8px]">{q.kisiKisi?.bentukSoal || q.type || '-'}</td>
                            <td className="border-r border-slate-900 p-2 text-center font-bold align-top text-[8px]">{q.kisiKisi?.jenisSoal || 'TUNGGAL'}</td>
                            <td className="border-r border-slate-900 p-0 align-top">
                              <div className="p-4 space-y-3">
                                {q.imageUrl && q.imagePosition === 'above' && (
                                  <div className="flex justify-center mb-3">
                                    <img src={q.imageUrl} className="max-h-32 border border-slate-300 rounded p-1 bg-white shadow-sm" alt="Visual" />
                                  </div>
                                )}
                                {title && (
                                  <div className="bg-slate-50 border border-slate-300 p-3 rounded shadow-inner">
                                    <h5 className="font-black text-center uppercase text-[10px] mb-2 border-b border-slate-300 pb-2">{title}</h5>
                                    <div className="text-[9px] leading-relaxed italic text-justify whitespace-pre-wrap">
                                      <MathText text={body} />
                                    </div>
                                  </div>
                                )}
                                {q.imageUrl && q.imagePosition === 'below' && (
                                  <div className="flex justify-center mt-3 mb-3">
                                    <img src={q.imageUrl} className="max-h-32 border border-slate-300 rounded p-1 bg-white shadow-sm" alt="Visual" />
                                  </div>
                                )}
                                <p className="font-black text-[10px] leading-snug">
                                  <MathText text={q.text} />
                                </p>
                                
                                {binary && labels ? (
                                  <table className="w-full mt-3 border-collapse border border-slate-900">
                                    <thead>
                                      <tr className="bg-slate-100 text-[8px] font-black uppercase">
                                        <th className="border border-slate-900 p-1 text-left">PERNYATAAN</th>
                                        <th className="border border-slate-900 p-1 text-center w-10">{labels.h1}</th>
                                        <th className="border border-slate-900 p-1 text-center w-10">{labels.h2}</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {q.options.map((opt, oIdx) => (
                                        <tr key={oIdx} className="text-[8px]">
                                          <td className="border border-slate-900 p-1 font-medium">{oIdx + 1}. <MathText text={opt} /></td>
                                          <td className="border border-slate-900 p-1 text-center font-black text-indigo-700 text-base leading-none">{answers[oIdx] === 0 ? '•' : ''}</td>
                                          <td className="border border-slate-900 p-1 text-center font-black text-indigo-700 text-base leading-none">{answers[oIdx] === 1 ? '•' : ''}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                ) : (
                                  <div className="grid grid-cols-1 gap-1.5 mt-2 pl-2">
                                    {q.options.map((opt, oIdx) => (
                                      <div key={oIdx} className="text-[9px] flex gap-2">
                                        <span className="font-black shrink-0">{String.fromCharCode(65 + oIdx)}.</span>
                                        <span className="font-medium"><MathText text={opt} /></span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="border-r border-slate-900 p-1 text-center font-black align-middle text-indigo-600 text-[8px]">{formatCorrectAnswer(q)}</td>
                            <td className="p-2 text-center font-black align-middle text-slate-200">{q.kisiKisi?.nomorSoal || idx + 1}</td>
                          </tr>
                        );
                      }) : (
                        <tr><td colSpan={10} className="p-32 text-center text-slate-300 italic font-black text-xl">DOKUMEN KOSONG</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="mt-12 flex justify-between items-end">
                  <div className="text-[8px] text-slate-400 italic">
                    DICETAK OTOMATIS OLEH SYSTEM ASSESSMENT HUB PADA {new Date().toLocaleString('id-ID')}
                  </div>
                  <div className="w-64 text-center">
                    <p className="text-[10px] font-bold mb-20 uppercase">Penyusun Matriks,</p>
                    <div className="border-b-2 border-slate-900 mx-auto w-48"></div>
                    <p className="text-[9px] mt-2 font-black">NIP. ........................................</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div><h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Manajemen Bank Soal</h3><p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-0.5">Pusat Distribusi Soal {role === 'ADMIN' ? 'Lembaga' : 'Nasional'}</p></div>
        <div className="flex bg-slate-200/50 p-1.5 rounded-2xl border border-slate-200 w-full md:w-auto">
          <button onClick={() => setActiveSource('LOCAL')} className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black transition-all ${activeSource === 'LOCAL' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}><Layout size={16} /> DATA {role === 'ADMIN' ? 'SEKOLAH' : 'INTERNAL'}</button>
          <button onClick={() => setActiveSource('MASTER')} className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black transition-all ${activeSource === 'MASTER' ? 'bg-white text-emerald-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}><Database size={16} /> PUSAT SOAL NASIONAL</button>
        </div>
      </div>
      {activeSource === 'MASTER' && role !== 'ADMIN' && (<div className="bg-emerald-50 border border-emerald-200 p-6 rounded-[2rem] flex gap-4 items-center"><div className="p-4 bg-emerald-100 text-emerald-600 rounded-2xl"><Sparkles size={28} /></div><div><h4 className="font-black text-emerald-900 text-sm uppercase tracking-tight">Repositori Cloud Aktif</h4><p className="text-emerald-700 text-xs font-medium">Klik tombol "Import" untuk menggunakan butir soal pusat di sekolah Anda.</p></div></div>)}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {displayPackages.map(pkg => (
          <div key={pkg.id} className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm flex flex-col group hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/5 transition-all relative overflow-hidden">
            <div className={`absolute top-0 right-0 p-4 ${pkg.isMaster ? 'text-emerald-500' : 'text-indigo-500'} opacity-10 -rotate-12 translate-x-4 -translate-y-4`}><BookOpen size={120} /></div>
            <div className="flex justify-between items-start mb-6 relative z-10"><div className={`p-4 rounded-2xl shadow-inner ${pkg.subject === Subject.MATEMATIKA ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'}`}><BookOpen size={28} /></div><div className="flex gap-2">{activeSource === 'MASTER' && role !== 'ADMIN' ? (<button disabled={isImporting === pkg.id} onClick={() => handleImport(pkg)} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all shadow-lg shadow-emerald-100">{isImporting === pkg.id ? <Loader2 className="animate-spin" size={14} /> : <Database size={14} />}IMPORT</button>) : (<button onClick={() => setPackageToDelete(pkg.id)} className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={20} /></button>)}</div></div>
            <div className="relative z-10"><h4 className="text-xl font-black text-slate-800 leading-tight mb-1 group-hover:text-indigo-600 transition-colors">{pkg.name}</h4><p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8">{pkg.subject}</p></div>
            <div className="mt-auto flex items-center justify-between pt-6 border-t border-slate-50 relative z-10"><div className="flex flex-col"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Konten</span><span className="text-sm font-black text-slate-800">{pkg.questions.length} Butir</span></div><button onClick={() => setEditingPackageId(pkg.id)} className="flex items-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg active:scale-95">Kelola Soal <ChevronRight size={14} /></button></div>
          </div>
        ))}
        {((activeSource === 'LOCAL' && role !== 'ADMIN') || (activeSource === 'MASTER' && role === 'ADMIN')) && (<button onClick={() => { setPackageForm({ name: '', subject: Subject.BAHASA_INDONESIA }); setIsModalOpen(true); }} className="rounded-[2.5rem] border-4 border-dashed border-slate-200 flex flex-col items-center justify-center p-12 text-slate-400 hover:border-indigo-300 hover:text-indigo-600 transition-all bg-slate-50/50 group"><div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-sm group-hover:shadow-indigo-100 transition-all"><Plus size={32} /></div><span className="font-black text-xs uppercase tracking-[0.2em]">Tambah Paket Baru</span></button>)}
      </div>

      {packageToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
          <div className="bg-white rounded-3xl w-full max-sm shadow-2xl overflow-hidden p-8 text-center space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-2">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase">Hapus Paket Soal?</h3>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">
              Seluruh butir soal dalam paket ini akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-3 pt-4">
              <button onClick={() => setPackageToDelete(null)} className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all">Batal</button>
              <button onClick={handleDeletePackageConfirm} className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-200">Ya, Hapus</button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (<div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4"><div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in duration-200"><div className="p-8 border-b border-slate-100 bg-slate-50 flex justify-between items-center"><h3 className="text-2xl font-black text-slate-800 tracking-tight">Paket Soal Baru</h3><button onClick={() => setIsModalOpen(false)} className="text-slate-400 p-2 hover:bg-slate-200 rounded-full transition-all"><X size={24} /></button></div><form onSubmit={handleCreatePackage} className="p-8 space-y-6"><div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nama Paket Ujian</label><input required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-bold text-lg" value={packageForm.name} onChange={(e) => setPackageForm({...packageForm, name: e.target.value})} placeholder="MISAL: Ujian Literasi I" /></div><div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Mata Pelajaran</label><select className="w-full px-5 py-4 bg-white border-2 border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-black text-indigo-600" value={packageForm.subject} onChange={(e) => setPackageForm({...packageForm, subject: e.target.value as Subject})}><option value={Subject.BAHASA_INDONESIA}>Bahasa Indonesia</option><option value={Subject.MATEMATIKA}>Matematika</option></select></div><button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-indigo-100 mt-4 active:scale-95 transition-all">Terbitkan Paket</button></form></div></div>)}
    </div>
  );
};

export default QuestionBank;
