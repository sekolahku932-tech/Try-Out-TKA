
import React, { useState, useEffect } from 'react';
import { UserRole, Student, TestSession, QuestionPackage, AppSettings, Question, AdminUser } from './types';
import { db } from './lib/firebase';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  getDoc
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
import LoginForm from './components/LoginForm';

const INITIAL_SETTINGS: AppSettings = {
  schoolName: 'SMP NEGERI 1 BILATO',
  examTitle: 'TRYOUT TES KEMAMPUAN AKADEMIK',
  academicYear: '2024/2025'
};

const App: React.FC = () => {
  const [role, setRole] = useState<UserRole | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeMenu, setActiveMenu] = useState('dashboard');

  const [students, setStudents] = useState<Student[]>([]);
  const [sessions, setSessions] = useState<TestSession[]>([]);
  const [packages, setPackages] = useState<QuestionPackage[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [settings, setSettings] = useState<AppSettings>(INITIAL_SETTINGS);

  useEffect(() => {
    if (!role) return;

    // Listen to local collections
    const unsubStudents = onSnapshot(collection(db, 'students'), (snapshot) => {
      setStudents(snapshot.docs.map(doc => ({ ...(doc.data() as Student), id: doc.id })));
    });

    const unsubSessions = onSnapshot(collection(db, 'sessions'), (snapshot) => {
      setSessions(snapshot.docs.map(doc => ({ ...(doc.data() as TestSession), id: doc.id })));
    });

    const unsubPackages = onSnapshot(collection(db, 'packages'), (snapshot) => {
      setPackages(snapshot.docs.map(doc => ({ ...(doc.data() as QuestionPackage), id: doc.id })));
    });

    const unsubAdminUsers = onSnapshot(collection(db, 'admin_users'), (snapshot) => {
      setAdminUsers(snapshot.docs.map(doc => ({ ...(doc.data() as AdminUser), id: doc.id })));
    });

    const unsubSettings = onSnapshot(doc(db, 'settings', 'config'), (snapshot) => {
      if (snapshot.exists()) setSettings(snapshot.data() as AppSettings);
    });

    return () => {
      unsubStudents();
      unsubSessions();
      unsubPackages();
      unsubAdminUsers();
      unsubSettings();
    };
  }, [role]);

  const handleLogin = (selectedRole: UserRole, user: any) => {
    setRole(selectedRole);
    setCurrentUser(user);
    setActiveMenu(selectedRole === 'STUDENT' ? 'tests' : 'dashboard');
  };

  const handleLogout = () => {
    setRole(null);
    setCurrentUser(null);
  };

  const handleAddPackage = async (pkg: QuestionPackage) => {
    await setDoc(doc(db, 'packages', pkg.id), pkg);
  };

  const handleDeletePackage = async (id: string) => {
    await deleteDoc(doc(db, 'packages', id));
  };

  const handleUpdateQuestion = async (packageId: string, updatedQuestion: Question) => {
    const pkgRef = doc(db, 'packages', packageId);
    const pkgSnap = await getDoc(pkgRef);
    if (pkgSnap.exists()) {
      const pkg = pkgSnap.data() as QuestionPackage;
      const newQuestions = (pkg.questions || []).map(q => 
        String(q.id) === String(updatedQuestion.id) ? updatedQuestion : q
      );
      await updateDoc(pkgRef, { questions: newQuestions });
    }
  };

  const handleAddQuestion = async (packageId: string, newQuestion: Question) => {
    const pkgRef = doc(db, 'packages', packageId);
    const pkgSnap = await getDoc(pkgRef);
    if (pkgSnap.exists()) {
      const pkg = pkgSnap.data() as QuestionPackage;
      await updateDoc(pkgRef, { questions: [...(pkg.questions || []), newQuestion] });
    }
  };

  const handleDeleteQuestion = async (packageId: string, questionId: string) => {
    const pkgRef = doc(db, 'packages', packageId);
    const pkgSnap = await getDoc(pkgRef);
    if (pkgSnap.exists()) {
      const pkg = pkgSnap.data() as QuestionPackage;
      const updatedQuestions = (pkg.questions || []).filter(q => String(q.id) !== String(questionId));
      await updateDoc(pkgRef, { questions: updatedQuestions });
    }
  };

  if (!role) return <LoginForm onLogin={handleLogin} examTitle={settings.examTitle} />;

  if (role === 'STUDENT') {
    return <StudentView student={currentUser} sessions={sessions} packages={packages} schoolName={settings.schoolName} onLogout={handleLogout} />;
  }

  return (
    <Layout role={role} onLogout={handleLogout} activeMenu={activeMenu} setActiveMenu={setActiveMenu} userName={currentUser?.name}>
      {(() => {
        switch (activeMenu) {
          case 'dashboard': return <AdminDashboard students={students} sessions={sessions} packages={packages} />;
          case 'activity': return <ActivityMonitor sessions={sessions} />;
          case 'students': return <StudentManagement students={students} settings={settings} onAdd={async (s) => await setDoc(doc(db, 'students', s.id), s)} onUpdate={async (s) => await updateDoc(doc(db, 'students', s.id), s as any)} onDelete={async (id) => await deleteDoc(doc(db, 'students', id))} />;
          case 'bank': return (
            <QuestionBank 
              packages={packages} 
              masterPackages={[]} 
              settings={settings}
              role={role}
              onAddPackage={handleAddPackage} 
              onDeletePackage={handleDeletePackage}
              onAddQuestion={handleAddQuestion} 
              onUpdateQuestion={handleUpdateQuestion}
              onDeleteQuestion={handleDeleteQuestion}
            />
          );
          case 'schedule': return <ScheduleManagement sessions={sessions} students={students} packages={packages} onAdd={async (s) => await setDoc(doc(db, 'sessions', s.id), s)} onUpdate={async (s) => await updateDoc(doc(db, 'sessions', s.id), s as any)} onDelete={async (id) => await deleteDoc(doc(db, 'sessions', id))} />;
          case 'results_tka': return <TestResultsView sessions={sessions} packages={packages} settings={settings} />;
          case 'item_analysis': return <ItemAnalysisView sessions={sessions} packages={packages} settings={settings} />;
          case 'admin_users': return <AdminUserManagement adminUsers={adminUsers} onAdd={async (u) => await setDoc(doc(db, 'admin_users', u.id), u)} onDelete={async (id) => await deleteDoc(doc(db, 'admin_users', id))} />;
          case 'settings': return <SettingsView settings={settings} onUpdate={async (s) => await setDoc(doc(db, 'settings', 'config'), s)} />;
          default: return <AdminDashboard students={students} sessions={sessions} packages={packages} />;
        }
      })()}
    </Layout>
  );
};

export default App;
