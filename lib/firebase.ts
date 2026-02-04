
import { initializeApp, getApp, getApps, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { FirebaseConfig } from "../types";

// Firebase Pusat (Registry)
const centralConfig = {
  apiKey: "AIzaSyD60xL075kRNG9FKHJjsLei_uUerM9jo0M",
  authDomain: "try-out-tka-88b9b.firebaseapp.com",
  projectId: "try-out-tka-88b9b",
  storageBucket: "try-out-tka-88b9b.firebasestorage.app",
  messagingSenderId: "138428840961",
  appId: "1:138428840961:web:5c9a1a30fd2b4dbdf11400",
  measurementId: "G-QEY7P6V9QF"
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
