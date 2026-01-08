import {
    collection,
    doc,
    setDoc,
    getDoc,
    query,
    where,
    getDocs,
    addDoc,
    serverTimestamp,
    updateDoc,
    increment
} from "firebase/firestore";
import { db } from "./firebase";

// --- Types ---
export interface Tenant {
    id: string;
    name: string;
    isActive: boolean;
    activationCode: string;
    createdAt: any;
}

export interface UserProfile {
    uid: string;
    email: string;
    name: string;
    role: 'super_admin' | 'company_manager' | 'employee';
    tenantId?: string;
    hourlyRate?: number;
}

export interface AttendanceRecord {
    userId: string;
    tenantId: string;
    timestamp: any;
    type: 'in' | 'out';
    userName: string;
}

// --- User Functions ---
export const createUserProfile = async (uid: string, data: Partial<UserProfile>) => {
    await setDoc(doc(db, "users", uid), {
        uid,
        createdAt: serverTimestamp(),
        ...data,
    });
};

export const getUserProfile = async (uid: string) => {
    const userDoc = await getDoc(doc(db, "users", uid));
    return userDoc.exists() ? (userDoc.data() as UserProfile) : null;
};

// --- Tenant Functions ---
export const createTenant = async (tenantId: string, name: string) => {
    await setDoc(doc(db, "tenants", tenantId), {
        id: tenantId,
        name,
        isActive: false, // Must be activated via code
        createdAt: serverTimestamp(),
    });
};

export const activateTenant = async (tenantId: string, code: string) => {
    const codeDoc = await getDoc(doc(db, "activation_codes", code));
    if (codeDoc.exists() && !codeDoc.data().used) {
        // Check if code is expired (if it has expiresAt)
        const codeData = codeDoc.data();
        if (codeData.expiresAt) {
            const expiresAt = codeData.expiresAt?.toDate?.() || new Date(codeData.expiresAt);
            if (new Date() > expiresAt) {
                return false; // Code expired
            }
        }

        // Activate tenant with 30-day subscription
        await updateDoc(doc(db, "tenants", tenantId), {
            isActive: true,
            activatedAt: serverTimestamp(), // Start of 30-day subscription
        });
        await updateDoc(doc(db, "activation_codes", code), {
            used: true,
            usedBy: tenantId,
            usedAt: serverTimestamp(),
        });
        return true;
    }
    return false;
};

// --- Attendance Functions ---
export const markAttendance = async (userId: string, tenantId: string, userName: string, type: 'in' | 'out') => {
    await addDoc(collection(db, "attendance"), {
        userId,
        tenantId,
        userName,
        type,
        timestamp: serverTimestamp(),
    });
};

export const getTenantAttendance = async (tenantId: string) => {
    const q = query(collection(db, "attendance"), where("tenantId", "==", tenantId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// --- Admin Functions ---
export const generateActivationCode = async () => {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

    await setDoc(doc(db, "activation_codes", code), {
        code,
        used: false,
        createdAt: serverTimestamp(),
        expiresAt: expiresAt,
        validDays: 30,
    });
    return code;
};

// Get all activation codes
export const getAllActivationCodes = async () => {
    const querySnapshot = await getDocs(collection(db, "activation_codes"));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Get all registered tenants/companies
export const getAllTenants = async () => {
    const querySnapshot = await getDocs(collection(db, "tenants"));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Check if tenant subscription is expired
export const isTenantExpired = (tenant: any): boolean => {
    if (!tenant.activatedAt) return false;
    const activatedAt = tenant.activatedAt?.toDate?.() || new Date(tenant.activatedAt);
    const expiresAt = new Date(activatedAt.getTime() + 30 * 24 * 60 * 60 * 1000);
    return new Date() > expiresAt;
};

// Renew tenant subscription
export const renewTenant = async (tenantId: string) => {
    await updateDoc(doc(db, "tenants", tenantId), {
        activatedAt: serverTimestamp(),
        isActive: true,
    });
};

// --- Employee Management Functions ---
export const addEmployee = async (tenantId: string, employeeData: {
    name: string;
    email: string;
    hourlyRate: number;
    uid: string;
}) => {
    await setDoc(doc(db, "users", employeeData.uid), {
        uid: employeeData.uid,
        email: employeeData.email,
        name: employeeData.name,
        role: 'employee',
        tenantId,
        hourlyRate: employeeData.hourlyRate,
        createdAt: serverTimestamp(),
    });
};

export const getEmployeesByTenant = async (tenantId: string) => {
    const q = query(
        collection(db, "users"),
        where("tenantId", "==", tenantId),
        where("role", "==", "employee")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const updateEmployee = async (uid: string, data: Partial<UserProfile>) => {
    await updateDoc(doc(db, "users", uid), data);
};

export const deleteEmployee = async (uid: string) => {
    const userDoc = doc(db, "users", uid);
    await updateDoc(userDoc, { isDeleted: true });
};

// --- Enhanced Attendance Functions ---
export const getLastAttendance = async (userId: string, tenantId: string) => {
    const q = query(
        collection(db, "attendance"),
        where("userId", "==", userId),
        where("tenantId", "==", tenantId)
    );
    const querySnapshot = await getDocs(q);
    const records = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as AttendanceRecord }));

    // Sort by timestamp descending
    records.sort((a, b) => {
        if (!a.timestamp || !b.timestamp) return 0;
        return b.timestamp.toMillis() - a.timestamp.toMillis();
    });

    return records[0] || null;
};

export const getTodayAttendance = async (userId: string, tenantId: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const q = query(
        collection(db, "attendance"),
        where("userId", "==", userId),
        where("tenantId", "==", tenantId)
    );
    const querySnapshot = await getDocs(q);
    const records = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as AttendanceRecord }));

    return records.filter(record => {
        if (!record.timestamp) return false;
        const recordDate = record.timestamp.toDate();
        return recordDate >= today;
    });
};

// --- Payroll Functions ---
export const calculateMonthlyHours = async (userId: string, tenantId: string, year: number, month: number) => {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const q = query(
        collection(db, "attendance"),
        where("userId", "==", userId),
        where("tenantId", "==", tenantId)
    );
    const querySnapshot = await getDocs(q);
    const records = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as AttendanceRecord }));

    // Filter by date range
    const monthRecords = records.filter(record => {
        if (!record.timestamp) return false;
        const recordDate = record.timestamp.toDate();
        return recordDate >= startDate && recordDate <= endDate;
    });

    // Sort by timestamp
    monthRecords.sort((a, b) => {
        if (!a.timestamp || !b.timestamp) return 0;
        return a.timestamp.toMillis() - b.timestamp.toMillis();
    });

    // Calculate hours: pair 'in' with 'out'
    let totalHours = 0;
    let checkInTime: Date | null = null;

    for (const record of monthRecords) {
        if (record.type === 'in' && !checkInTime) {
            checkInTime = record.timestamp.toDate();
        } else if (record.type === 'out' && checkInTime) {
            const checkOutTime = record.timestamp.toDate();
            const hours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
            totalHours += hours;
            checkInTime = null;
        }
    }

    return totalHours;
};

export const getMonthlyPayrollData = async (tenantId: string, year: number, month: number) => {
    const employees = await getEmployeesByTenant(tenantId);

    const payrollData = await Promise.all(
        employees.map(async (employee: any) => {
            const hours = await calculateMonthlyHours(employee.uid, tenantId, year, month);
            const salary = hours * (employee.hourlyRate || 0);

            return {
                uid: employee.uid,
                name: employee.name,
                email: employee.email,
                hourlyRate: employee.hourlyRate || 0,
                hoursWorked: Math.round(hours * 100) / 100, // Round to 2 decimals
                totalSalary: Math.round(salary * 100) / 100,
            };
        })
    );

    return payrollData;
};
