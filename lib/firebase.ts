
import { initializeApp, getApp, getApps, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { FirebaseConfig } from "../types";

// Firebase Pusat (Registry) - Updated with new Database Config
const centralConfig = {
  apiKey: "AIzaSyCI5YSGf-vZ_X8FfXEpVRa-gEX-nh4wKpo",
  authDomain: "try-out-tka-a2661.firebaseapp.com",
  projectId: "try-out-tka-a2661",
  storageBucket: "try-out-tka-a2661.firebasestorage.app",
  messagingSenderId: "1053467723023",
  appId: "1:1053467723023:web:9efd35fc9899cb0a73ea7a",
  measurementId: "G-0TP0G3HB62"
};

// Inisialisasi App Pusat
const centralApp = !getApps().length ? initializeApp(centralConfig) : getApp();
export const db = getFirestore(centralApp);

/**
 * Fungsi untuk mendapatkan instance Firestore sekolah secara dinamis.
 * Jika config disediakan, akan menginisialisasi/mengambil app spesifik sekolah.
 */
export const getSchoolFirestore = (config?: FirebaseConfig, schoolId?: string): Firestore => {
  if (!config || !schoolId) return db;

  const appName = `school-${schoolId}`;
  let schoolApp: FirebaseApp;

  try {
    schoolApp = getApp(appName);
  } catch (e) {
    // Jika belum ada, inisialisasi baru
    schoolApp = initializeApp(config, appName);
  }

  return getFirestore(schoolApp);
};
