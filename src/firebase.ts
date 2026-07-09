import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  getDoc,
  doc, 
  setDoc, 
  addDoc,
  query, 
  where, 
  deleteDoc,
  updateDoc
} from 'firebase/firestore';
import { ActiveUser, StepLog, DepartmentInfo } from './types';
import { INITIAL_DEPARTMENTS, INITIAL_STEP_LOGS } from './mockData';

// Config from firebase-applet-config.json for gen-lang-client-0055681731
const firebaseConfig = {
  apiKey: "AIzaSyC9Gf0tKOy_vb92jy-EZQKkcp4r2vIPoeY",
  authDomain: "gen-lang-client-0055681731.firebaseapp.com",
  projectId: "gen-lang-client-0055681731",
  storageBucket: "gen-lang-client-0055681731.firebasestorage.app",
  messagingSenderId: "816572719530",
  appId: "1:816572719530:web:430b0880114e4aafab0bd3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Seed initial system data into firestore if empty (especially logs and standard test accounts)
export async function seedInitialDataIfNecessary() {
  try {
    const usersSnapshot = await getDocs(collection(db, 'users'));
    if (usersSnapshot.empty) {
      console.log('Seeding initial users and step logs to Firestore with 6-digit employee IDs & birthdate passwords...');
      
      // Default users to seed
      const seedUsers = [
        {
          employeeId: '100201',
          email: 'sarochar.p@thairathgroup.com',
          name: 'คุณสโรชา (โบว์)',
          nickname: 'โบว์',
          departmentId: 'editorial_online',
          weekTarget: 60000,
          totalTickets: 8,
          password: '120342' // Born 12 March 2542 (Example birthdate format DDMMYY using Buddhist Era)
        },
        {
          employeeId: '100202',
          email: 'worapong.b@thairathgroup.com',
          name: 'คุณวรพงษ์ (เบ)',
          nickname: 'เบ',
          departmentId: 'prod_tech_tech',
          weekTarget: 60000,
          totalTickets: 5,
          password: '240845' // Born 24 August 2545
        },
        {
          employeeId: '100203',
          email: 'somsak.k@thairathgroup.com',
          name: 'คุณสมศักดิ์ (เข้ม)',
          nickname: 'เข้ม',
          departmentId: 'sales_operation',
          weekTarget: 70000,
          totalTickets: 12,
          password: '150538' // Born 15 May 2538
        }
      ];

      for (const u of seedUsers) {
        await setDoc(doc(db, 'users', u.employeeId), {
          employeeId: u.employeeId,
          email: u.email,
          name: u.name,
          nickname: u.nickname,
          departmentId: u.departmentId,
          weekTarget: u.weekTarget,
          totalTickets: u.totalTickets,
          password: u.password
        });
      }

      // Seed baseline step logs for these users
      // Bowen (100201) - Editorial
      const boLogs = [
        { id: 'bo-1', userEmail: '100201', date: '2026-05-24', steps: 9500, week: 2, imageName: 'watch_face.png', submittedAt: '2026-05-24T18:00:00Z' },
        { id: 'bo-2', userEmail: '100201', date: '2026-05-25', steps: 8800, week: 2, imageName: 'health_synced.png', submittedAt: '2026-05-25T19:00:00Z' },
        { id: 'bo-3', userEmail: '100201', date: '2026-05-26', steps: 11000, week: 2, imageName: 'running_track.png', submittedAt: '2026-05-26T20:10:00Z' },
        { id: 'bo-4', userEmail: '100201', date: '2026-05-27', steps: 7200, week: 2, imageName: 'pedometer.png', submittedAt: '2026-05-27T17:30:00Z' }
      ];

      // Somsak (100203) - Transport
      const somsakLogs = [
        { id: 'sk-1', userEmail: '100203', date: '2026-05-24', steps: 12000, week: 2, imageName: 'fitbit_today.png', submittedAt: '2026-05-24T21:00:00Z' },
        { id: 'sk-2', userEmail: '100203', date: '2026-05-25', steps: 11500, week: 2, imageName: 'walk_logs.png', submittedAt: '2026-05-25T20:45:00Z' },
        { id: 'sk-3', userEmail: '100203', date: '2026-05-26', steps: 13200, week: 2, imageName: 'garmin_export.png', submittedAt: '2026-05-26T22:00:00Z' },
        { id: 'sk-4', userEmail: '100203', date: '2026-05-27', steps: 10500, week: 2, imageName: 'steps_counted.png', submittedAt: '2026-05-27T18:00:00Z' }
      ];

      // Worapong (100202) - IT (Our previous mock defaults)
      const worapongLogs = INITIAL_STEP_LOGS.map(log => ({
        ...log,
        userEmail: '100202'
      }));

      const allLogsToSeed = [...boLogs, ...somsakLogs, ...worapongLogs];
      for (const log of allLogsToSeed) {
        await setDoc(doc(db, 'step_logs', log.id), log);
      }

      console.log('Firebase system database storage seeded successfully with 6-digit IDs!');
    }
  } catch (err) {
    console.error('Error seeding initial Firestore databases:', err);
  }
}

// User Profile Operations
export async function getUserProfile(idOrEmail: string): Promise<ActiveUser | null> {
  try {
    const cleanId = idOrEmail.trim().toLowerCase();
    
    // First try direct document lookup (could be employeeId or email depending on how it was saved)
    let docRef = doc(db, 'users', cleanId);
    let docSnap = await getDoc(docRef);
    
    // If not found, try querying by employeeId
    if (!docSnap.exists() && cleanId.length === 6) {
      const q = query(collection(db, 'users'), where('employeeId', '==', cleanId));
      const qSnap = await getDocs(q);
      if (!qSnap.empty) {
        docSnap = qSnap.docs[0];
      }
    }

    // Still not found, try querying by email
    if (!docSnap.exists() && cleanId.includes('@')) {
      const q = query(collection(db, 'users'), where('email', '==', cleanId));
      const qSnap = await getDocs(q);
      if (!qSnap.empty) {
        docSnap = qSnap.docs[0];
      }
    }

    if (docSnap && docSnap.exists()) {
      const data = docSnap.data();
      return {
        name: data.name,
        nickname: data.nickname,
        departmentId: data.departmentId,
        weekTarget: Number(data.weekTarget) || 60000,
        totalTickets: Number(data.totalTickets) || 0,
        email: data.email || '',
        employeeId: data.employeeId || ''
      };
    }
    return null;
  } catch (err) {
    console.error('Error getting user profile:', err);
    return null;
  }
}

export async function createUserOrUpdateProfile(idOrEmail: string, profile: ActiveUser, passwordText?: string) {
  try {
    const cleanId = (profile.employeeId || idOrEmail).trim().toLowerCase();
    const docRef = doc(db, 'users', cleanId);
    const current = await getDoc(docRef);
    const existingData = current.exists() ? current.data() : {};
    
    const payload: any = {
      employeeId: profile.employeeId || existingData.employeeId || cleanId,
      email: profile.email || existingData.email || '',
      name: profile.name,
      nickname: profile.nickname,
      departmentId: profile.departmentId,
      weekTarget: Number(profile.weekTarget) || 60000,
      totalTickets: Number(profile.totalTickets) || Number(existingData.totalTickets) || 0,
    };
    if (passwordText) {
      payload.password = passwordText;
    } else if (!existingData.password) {
      payload.password = 'password123'; // fallback default
    }

    await setDoc(docRef, payload, { merge: true });
  } catch (err) {
    console.error('Error creating/updating user profile:', err);
  }
}

// Fetch logs for specific logged-in user
export async function fetchUserLogs(email: string): Promise<StepLog[]> {
  try {
    const q = query(collection(db, 'step_logs'), where('userEmail', '==', email.toLowerCase()));
    const snapshot = await getDocs(q);
    const logs: StepLog[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      logs.push({
        id: data.id || doc.id,
        date: data.date,
        steps: Number(data.steps),
        week: Number(data.week),
        weekOfMonth: data.weekOfMonth ? Number(data.weekOfMonth) : undefined,
        imageName: data.imageName,
        imagePreview: data.imagePreview,
        submittedAt: data.submittedAt
      });
    });
    // Sort chronologically descending
    return logs.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  } catch (err) {
    console.error('Error fetching logs from Firestore:', err);
    return [];
  }
}

// Save step log to Firestore
export async function saveUserLog(email: string, log: StepLog) {
  try {
    const payload = {
      ...log,
      userEmail: email.toLowerCase()
    };
    await setDoc(doc(db, 'step_logs', log.id), payload);
  } catch (err) {
    console.error('Error saving step log to Firestore:', err);
  }
}

// Delete step log from Firestore
export async function deleteUserLog(logId: string) {
  try {
    await deleteDoc(doc(db, 'step_logs', logId));
  } catch (err) {
    console.error('Error deleting step log from Firestore:', err);
  }
}

// Load all logs in Firestore to dynamically calculate department-wide team steps!
export async function calculateFirestoreLeaderboard(currentWeek: number): Promise<DepartmentInfo[]> {
  try {
    // Read all users
    const usersSnap = await getDocs(collection(db, 'users'));
    const userMap = new Map<string, { departmentId: string }>();
    usersSnap.forEach((doc) => {
      const data = doc.data();
      userMap.set(data.email?.toLowerCase() || '', {
        departmentId: data.departmentId
      });
    });

    // Read all logs for currentWeek
    const logsSnap = await getDocs(collection(db, 'step_logs'));
    const deptWorkMap = new Map<string, { totalSteps: number, uniqueUsers: Set<string> }>();

    // Initialise all departments
    INITIAL_DEPARTMENTS.forEach(dept => {
      deptWorkMap.set(dept.id, {
        totalSteps: 0,
        uniqueUsers: new Set<string>()
      });
    });

    logsSnap.forEach((doc) => {
      const data = doc.data();
      // Filter out log if not on active week
      if (Number(data.week) !== currentWeek) return;

      const userEmail = (data.userEmail || '').toLowerCase();
      const userInfo = userMap.get(userEmail);
      if (userInfo) {
        const deptId = userInfo.departmentId;
        const currentData = deptWorkMap.get(deptId);
        if (currentData) {
          currentData.totalSteps += Number(data.steps);
          currentData.uniqueUsers.add(userEmail);
        }
      }
    });

    // Compile into updated DepartmentInfo array
    return INITIAL_DEPARTMENTS.map(dept => {
      const scoreData = deptWorkMap.get(dept.id);
      if (!scoreData) return dept;

      // Real calculation
      const teamSize = 15; // Simulated & physical combined team size
      const baselineAvgDaily = dept.averageStepsPerPerson;
      
      // Calculate daily average steps from active logs in firestore
      const totalSteps = scoreData.totalSteps;
      const registeredParticipantsCount = scoreData.uniqueUsers.size;

      // Dynamic contribution spread across 7 days
      const customUsersStepsDaily = totalSteps / 7;

      let computedAverageSteps = baselineAvgDaily;
      let computedParticipation = dept.participationRate;

      if (registeredParticipantsCount > 0) {
        // We combine the baseline steps of other team members with real user steps
        const totalSimulatedTeamDaily = (baselineAvgDaily * (teamSize - registeredParticipantsCount)) + customUsersStepsDaily;
        computedAverageSteps = Math.round(totalSimulatedTeamDaily / teamSize);
        computedParticipation = Math.min(100, dept.participationRate + (registeredParticipantsCount * 3));
      }

      return {
        ...dept,
        averageStepsPerPerson: computedAverageSteps,
        participationRate: computedParticipation
      };
    });

  } catch (err) {
    console.error('Error fetching dynamic leaderboard data:', err);
    return INITIAL_DEPARTMENTS;
  }
}

// Admin Operations - Fetch all registered employee profiles
export async function fetchAllUsers(): Promise<any[]> {
  try {
    const snap = await getDocs(collection(db, 'users'));
    const users: any[] = [];
    snap.forEach((doc) => {
      const data = doc.data();
      users.push({
        id: doc.id,
        employeeId: data.employeeId || doc.id,
        email: data.email || '',
        name: data.name || '',
        nickname: data.nickname || '',
        departmentId: data.departmentId || 'ceo',
        weekTarget: data.weekTarget || 60000,
        totalTickets: data.totalTickets || 0,
        age: data.age || 30,
        password: data.password || ''
      });
    });
    return users;
  } catch (err) {
    console.error('Error fetching all users for admin:', err);
    return [];
  }
}

// Admin Operations - Fetch all logs submitted by all employees
export async function fetchAllStepLogs(): Promise<any[]> {
  try {
    const snap = await getDocs(collection(db, 'step_logs'));
    const logs: any[] = [];
    snap.forEach((doc) => {
      const data = doc.data();
      logs.push({
        id: data.id || doc.id,
        userEmail: data.userEmail || '',
        date: data.date || '',
        steps: Number(data.steps) || 0,
        week: Number(data.week) || 2,
        weekOfMonth: data.weekOfMonth ? Number(data.weekOfMonth) : undefined,
        imageName: data.imageName || '',
        imagePreview: data.imagePreview || '',
        submittedAt: data.submittedAt || new Date().toISOString()
      });
    });
    // Sort by submission date descending
    return logs.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  } catch (err) {
    console.error('Error fetching all step logs for admin:', err);
    return [];
  }
}

