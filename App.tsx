
import React, { useState, useEffect } from 'react';
import { UserRole, Student, TestSession, QuestionPackage, AppSettings, Question, AdminUser, School } from './types';
import { db, getSchoolFirestore } from './lib/firebase';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  getDoc,
  Firestore
} from 'firebase/firestore';
import Layout from './components/Layout';
import AdminDashboard from './components/AdminDashboard';
import StudentManagement from './components/StudentManagement';
import ScheduleManagement from './components/ScheduleManagement';
import QuestionBank from './components/QuestionBank';
import StudentView from './components/StudentView';
import SettingsView from './components/SettingsView';
import ActivityMonitor from './components/ActivityMonitor';
import TestResultsView from './components/TestResultsView';
import ItemAnalysisView from './components/ItemAnalysisView';
import AdminUserManagement from './components/AdminUserManagement';
import SchoolManagement from './components/SchoolManagement';
import LoginForm from './components/LoginForm';

const INITIAL_SETTINGS: AppSettings = {
  schoolName: 'PUSAT ASESMEN NASIONAL',
  examTitle: 'TRYOUT TES KEMAMPUAN AKADEMIK',
  academicYear: '2024/2025'
};

const App: React.FC = () => {
  const [role, setRole] = useState<UserRole | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [activeDb, setActiveDb] = useState<Firestore>(db);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeMenu, setActiveMenu] = useState('dashboard');

  const [students, setStudents] = useState<Student[]>([]);
  const [sessions, setSessions] = useState<TestSession[]>([]);
  const [packages, setPackages] = useState<QuestionPackage[]>([]);
  const [masterPackages, setMasterPackages] = useState<QuestionPackage[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [settings, setSettings] = useState<AppSettings>(INITIAL_SETTINGS);

  useEffect(() => {
    // 1. Listen to master packages (Always central)
    const unsubMaster = onSnapshot(collection(db, 'master_packages'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...(doc.data() as QuestionPackage), id: doc.id, isMaster: true }));
      setMasterPackages(data);
    });

    // 2. Super Admin specific listeners
    if (role === 'SUPER_ADMIN') {
      const unsubSchools = onSnapshot(collection(db, 'schools'), (snapshot) => {
        setSchools(snapshot.docs.map(doc => ({ ...(doc.data() as School), id: doc.id })));
      });

      // Listen to central settings
      const unsubCentralSettings = onSnapshot(doc(db, 'settings', 'config'), (snapshot) => {
        if (snapshot.exists()) setSettings(snapshot.data() as AppSettings);
      });

      return () => { unsubMaster(); unsubSchools(); unsubCentralSettings(); };
    }

    // 3. School Admin / Student listeners
    if (!schoolId) return () => unsubMaster();

    // Still need schools list for some lookups
    const unsubSchools = onSnapshot(collection(db, 'schools'), (snapshot) => {
      setSchools(snapshot.docs.map(doc => ({ ...(doc.data() as School), id: doc.id })));
    });

    const unsubStudents = onSnapshot(collection(activeDb, 'students'), (snapshot) => {
      setStudents(snapshot.docs.map(doc => ({ ...(doc.data() as Student), id: doc.id })));
    });

    const unsubSessions = onSnapshot(collection(activeDb, 'sessions'), (snapshot) => {
      setSessions(snapshot.docs.map(doc => ({ ...(doc.data() as TestSession), id: doc.id })));
    });

    const unsubPackages = onSnapshot(collection(activeDb, 'packages'), (snapshot) => {
      setPackages(snapshot.docs.map(doc => ({ ...(doc.data() as QuestionPackage), id: doc.id })));
    });

    const unsubAdminUsers = onSnapshot(collection(activeDb, 'admin_users'), (snapshot) => {
      setAdminUsers(snapshot.docs.map(doc => ({ ...(doc.data() as AdminUser), id: doc.id })));
    });

    const unsubSettings = onSnapshot(doc(activeDb, 'settings', 'config'), (snapshot) => {
      if (snapshot.exists()) setSettings(snapshot.data() as AppSettings);
    });

    return () => {
      unsubMaster();
      unsubSchools();
      unsubStudents();
      unsubSessions();
      unsubPackages();
      unsubAdminUsers();
      unsubSettings();
    };
  }, [schoolId, role, activeDb]);

  const handleLogin = (selectedRole: UserRole, user: any, selectedSchoolId: string | null, schoolDb?: Firestore) => {
    setSchoolId(selectedSchoolId);
    setRole(selectedRole);
    setCurrentUser(user);
    setActiveDb(schoolDb || db);
    setActiveMenu(selectedRole === 'STUDENT' ? 'tests' : 'dashboard');
    
    // Default setting logic (will be overwritten by snapshot listener if exists in DB)
    if (selectedRole === 'SUPER_ADMIN') {
      setSettings(INITIAL_SETTINGS);
    }
  };

  const handleLogout = () => {
    setRole(null);
    setSchoolId(null);
    setActiveDb(db);
    setCurrentUser(null);
  };

  const handleAddPackage = async (pkg: QuestionPackage) => {
    try {
      if (role === 'SUPER_ADMIN') {
        await setDoc(doc(db, 'master_packages', pkg.id), { ...pkg, isMaster: true });
      } else {
        await setDoc(doc(activeDb, 'packages', pkg.id), { ...pkg, isMaster: false });
      }
    } catch (e) {
      console.error("Error adding package:", e);
    }
  };

  const handleDeletePackage = async (id: string) => {
    try {
      if (role === 'SUPER_ADMIN') {
        await deleteDoc(doc(db, 'master_packages', id));
      } else {
        await deleteDoc(doc(activeDb, 'packages', id));
      }
    } catch (e) {
      console.error("Error deleting package:", e);
    }
  };

  const handleUpdateQuestion = async (packageId: string, updatedQuestion: Question) => {
    try {
      const isMasterPkg = masterPackages.some(p => p.id === packageId);
      const targetDb = isMasterPkg ? db : activeDb;
      const collectionName = isMasterPkg ? 'master_packages' : 'packages';
      
      const pkgRef = doc(targetDb, collectionName, packageId);
      const pkgSnap = await getDoc(pkgRef);
      if (pkgSnap.exists()) {
        const pkg = pkgSnap.data() as QuestionPackage;
        const newQuestions = (pkg.questions || []).map(q => 
          String(q.id) === String(updatedQuestion.id) ? updatedQuestion : q
        );
        await updateDoc(pkgRef, { questions: newQuestions });
      }
    } catch (e) {
      console.error("Error updating question:", e);
    }
  };

  const handleAddQuestion = async (packageId: string, newQuestion: Question) => {
    try {
      const isMasterPkg = masterPackages.some(p => p.id === packageId);
      const targetDb = isMasterPkg ? db : activeDb;
      const collectionName = isMasterPkg ? 'master_packages' : 'packages';
      
      const pkgRef = doc(targetDb, collectionName, packageId);
      const pkgSnap = await getDoc(pkgRef);
      if (pkgSnap.exists()) {
        const pkg = pkgSnap.data() as QuestionPackage;
        await updateDoc(pkgRef, { questions: [...(pkg.questions || []), newQuestion] });
      }
    } catch (e) {
      console.error("Error adding question:", e);
    }
  };

  const handleDeleteQuestion = async (packageId: string, questionId: string) => {
    try {
      const isMasterPkg = masterPackages.some(p => String(p.id) === String(packageId));
      const targetDb = isMasterPkg ? db : activeDb;
      const collectionName = isMasterPkg ? 'master_packages' : 'packages';
      
      const pkgRef = doc(targetDb, collectionName, packageId);
      const pkgSnap = await getDoc(pkgRef);
      
      if (pkgSnap.exists()) {
        const pkg = pkgSnap.data() as QuestionPackage;
        const currentQuestions = pkg.questions || [];
        const updatedQuestions = currentQuestions.filter(q => String(q.id) !== String(questionId));
        await updateDoc(pkgRef, { questions: updatedQuestions });
      }
    } catch (e) {
      console.error("Error deleting question:", e);
    }
  };

  const addSchool = async (school: School) => await setDoc(doc(collection(db, 'schools'), school.id), school);
  const updateSchool = async (school: School) => await updateDoc(doc(db, 'schools', school.id), school as any);
  const deleteSchool = async (id: string) => await deleteDoc(doc(db, 'schools', id));

  // Get current school code
  const currentSchool = schools.find(s => s.id === schoolId);
  const schoolCode = currentSchool?.code || '';

  if (!role) return <LoginForm onLogin={handleLogin} examTitle={settings.examTitle} />;

  if (role === 'STUDENT') {
    return <StudentView student={currentUser} sessions={sessions} packages={packages} schoolName={settings.schoolName} onLogout={handleLogout} />;
  }

  return (
    <Layout role={role} onLogout={handleLogout} activeMenu={activeMenu} setActiveMenu={setActiveMenu} userName={currentUser?.name}>
      {(() => {
        switch (activeMenu) {
          case 'dashboard': return <AdminDashboard isSuperAdmin={role === 'SUPER_ADMIN'} schools={schools} masterPackages={masterPackages} students={students} sessions={sessions} packages={packages} />;
          case 'schools': return <SchoolManagement schools={schools} onAdd={addSchool} onUpdate={updateSchool} onDelete={deleteSchool} />;
          case 'bank': return (
            <QuestionBank 
              packages={role === 'SUPER_ADMIN' ? masterPackages : packages} 
              masterPackages={masterPackages}
              settings={settings}
              role={role}
              onAddPackage={handleAddPackage} 
              onDeletePackage={handleDeletePackage}
              onAddQuestion={handleAddQuestion} 
              onUpdateQuestion={handleUpdateQuestion}
              onDeleteQuestion={handleDeleteQuestion}
            />
          );
          case 'students': return <StudentManagement students={students} settings={settings} schoolCode={schoolCode} onAdd={async (s) => await setDoc(doc(collection(activeDb, 'students'), s.id), s)} onUpdate={async (s) => await updateDoc(doc(activeDb, 'students', s.id), s as any)} onDelete={async (id) => await deleteDoc(doc(activeDb, 'students', id))} />;
          case 'schedule': return <ScheduleManagement sessions={sessions} students={students} packages={packages} schoolId={schoolId!} onAdd={async (s) => await setDoc(doc(collection(activeDb, 'sessions'), s.id), s)} onUpdate={async (s) => await updateDoc(doc(activeDb, 'sessions', s.id), s as any)} onDelete={async (id) => await deleteDoc(doc(activeDb, 'sessions', id))} />;
          case 'activity': return <ActivityMonitor sessions={sessions} />;
          case 'results_tka': return <TestResultsView sessions={sessions} packages={packages} settings={settings} />;
          case 'item_analysis': return <ItemAnalysisView sessions={sessions} packages={packages} settings={settings} />;
          case 'admin_users': return <AdminUserManagement adminUsers={adminUsers} onAdd={async (u) => await setDoc(doc(collection(activeDb, 'admin_users'), u.id), u)} onDelete={async (id) => await deleteDoc(doc(activeDb, 'admin_users', id))} />;
          case 'settings': return <SettingsView settings={settings} isSuperAdmin={role === 'SUPER_ADMIN'} onUpdate={async (s) => await setDoc(doc(activeDb, 'settings', 'config'), s)} />;
          default: return <AdminDashboard students={students} sessions={sessions} packages={packages} />;
        }
      })()}
    </Layout>
  );
};

export default App;
