
export enum Subject {
  BAHASA_INDONESIA = 'BAHASA INDONESIA',
  MATEMATIKA = 'MATEMATIKA'
}

export enum QuestionType {
  MCSA = 'PILIHAN GANDA',
  MCMA = 'PGK MCMA',
  TRUE_FALSE = 'PGK Kategori (Benar-Salah)',
  AGREE_DISAGREE = 'PGK Kategori (Setuju-Tidak Setuju)',
  YES_NO = 'PGK Kategori (Ya-Tidak)',
  MATCH_UNMATCH = 'PGK Kategori (Sesuai-Tidak Sesuai)'
}

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export interface School {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  createdAt: number;
  firebaseConfig?: FirebaseConfig; // Opsional, jika kosong gunakan database pusat
}

export interface Student {
  id: string;
  name: string;
  nisn: string;
  gender: 'L' | 'P';
  birthPlace: string;
  birthDate: string;
  username: string;
  password: string;
  schoolId: string;
}

export interface AdminUser {
  id: string;
  name: string;
  username: string;
  password: string;
  createdAt: number;
  schoolId: string;
}

export interface KisiKisi {
  kompetensi: string;
  subKompetensi?: string;
  jenisTeks?: string;
  indikatorSoal: string;
  bentukSoal?: string;
  jenisSoal?: string;
  nomorSoal: number;
  // Tambahan untuk Matematika
  elemen?: string;
  subElemen?: string;
  levelKognitif?: string;
  konteks?: string;
}

export interface Question {
  id: string;
  stimulus?: string;
  text: string;
  type: QuestionType;
  options: string[];
  correctAnswer: number | number[]; 
  imageUrl?: string;
  imagePosition?: 'above' | 'below';
  kisiKisi?: KisiKisi;
}

export interface QuestionPackage {
  id: string;
  name: string;
  subject: Subject;
  questions: Question[];
  isMaster?: boolean;
  originalId?: string;
}

export interface TestSession {
  id: string;
  subject: Subject;
  packageId: string;
  date: string;
  time: string;
  endTime: string;
  duration: number;
  sessionNumber: number;
  studentIds: string[];
  schoolId: string;
}

export interface AppSettings {
  schoolName: string;
  examTitle: string;
  academicYear: string;
}

export interface StudentProgress {
  id: string;
  sessionId: string;
  studentId: string;
  studentName: string;
  nisn: string;
  lastActive: number;
  currentQuestionIndex: number;
  totalQuestions: number;
  answeredCount: number;
  status: 'WORKING' | 'FINISHED';
  answers: Record<string, number | number[]>;
}

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'STUDENT';
