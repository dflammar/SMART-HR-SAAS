"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Clock, Users, Calendar, LogOut } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { getUserProfile, getTenantAttendance } from "@/lib/firestore";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import Link from "next/link";

export default function CompanyDashboard() {
    const [qrValue, setQrValue] = useState("");
    const [timer, setTimer] = useState(60);
    const [profile, setProfile] = useState<any>(null);
    const [attendance, setAttendance] = useState<any[]>([]);
    const router = useRouter();

    useEffect(() => {
        const fetchData = async () => {
            if (auth.currentUser) {
                const userProfile = await getUserProfile(auth.currentUser.uid);
                if (userProfile?.role !== 'company_manager') {
                    router.push("/login");
                    return;
                }
                setProfile(userProfile);

                // Initial fetch
                const logs = await getTenantAttendance(userProfile.tenantId!);
                setAttendance(logs.slice(0, 10)); // Show last 10 logs
            } else {
                router.push("/login");
            }
        };
        fetchData();
    }, [router]);

    // Real-time listener for attendance updates
    useEffect(() => {
        if (!profile?.tenantId) return;

        const q = query(
            collection(db, "attendance"),
            where("tenantId", "==", profile.tenantId)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Sort by timestamp descending
            logs.sort((a: any, b: any) => {
                if (!a.timestamp || !b.timestamp) return 0;
                return b.timestamp.toMillis() - a.timestamp.toMillis();
            });
            setAttendance(logs.slice(0, 10));
        });

        return () => unsubscribe();
    }, [profile]);

    useEffect(() => {
        if (!profile?.tenantId) return;

        const generateQR = () => {
            const payload = {
                t: Date.now(),
                tid: profile.tenantId,
            };
            // Simple encoding (Base64)
            setQrValue(btoa(JSON.stringify(payload)));
            setTimer(60);
        };

        generateQR();
        const interval = setInterval(() => {
            setTimer((prev) => {
                if (prev <= 1) {
                    generateQR();
                    return 60;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [profile]);

    const handleLogout = async () => {
        await signOut(auth);
        router.push("/login");
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <nav className="bg-primary text-white p-4 shadow-lg">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <h1 className="text-xl font-bold">لوحة تحكم الشركة | {profile?.name}</h1>
                    <button onClick={handleLogout} className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors">
                        <span className="text-sm">تسجيل الخروج</span>
                        <LogOut className="h-5 w-5" />
                    </button>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto p-6 flex gap-6">
                {/* Sidebar Navigation */}
                <aside className="w-64 space-y-2">
                    <Link
                        href="/dashboard/company"
                        className="flex items-center gap-3 px-4 py-3 bg-white rounded-lg border-2 border-indigo-600 text-indigo-600 font-semibold shadow-sm"
                    >
                        <Clock className="h-5 w-5" />
                        <span>رمز الحضور QR</span>
                    </Link>
                    <Link
                        href="/dashboard/company/employees"
                        className="flex items-center gap-3 px-4 py-3 bg-white rounded-lg border border-slate-200 text-slate-700 hover:border-indigo-200 hover:bg-indigo-50 transition-colors"
                    >
                        <Users className="h-5 w-5" />
                        <span>إدارة الموظفين</span>
                    </Link>
                    <Link
                        href="/dashboard/company/payroll"
                        className="flex items-center gap-3 px-4 py-3 bg-white rounded-lg border border-slate-200 text-slate-700 hover:border-indigo-200 hover:bg-indigo-50 transition-colors"
                    >
                        <Calendar className="h-5 w-5" />
                        <span>تقرير الرواتب</span>
                    </Link>
                </aside>

                <main className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left: QR Display */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="card text-center space-y-6">
                            <h2 className="text-xl font-bold text-slate-900 border-b pb-4">رمز الحضور (QR Code)</h2>
                            <div className="bg-white p-4 inline-block rounded-2xl border-4 border-indigo-50 shadow-inner">
                                {qrValue ? (
                                    <QRCodeSVG value={qrValue} size={256} />
                                ) : (
                                    <div className="h-[256px] w-[256px] flex items-center justify-center bg-slate-100 rounded-lg">
                                        جاري التحميل...
                                    </div>
                                )}
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-center gap-2 text-indigo-600 font-bold text-2xl">
                                    <Clock className="h-6 w-6" />
                                    <span>{timer} ثانية</span>
                                </div>
                                <p className="text-slate-500 text-sm">يتغير الرمز تلقائياً لضمان الأمان</p>
                            </div>
                            <div className="pt-4">
                                <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold animate-pulse">
                                    • مباشر الآن (Real-time)
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Right: Stats & Logs */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="card flex items-center gap-4 bg-indigo-600 text-white">
                                <Users className="h-10 w-10 opacity-50" />
                                <div>
                                    <p className="text-xs text-indigo-100 uppercase">الموظفون</p>
                                    <p className="text-2xl font-bold">12</p>
                                </div>
                            </div>
                            <div className="card flex items-center gap-4">
                                <Calendar className="h-10 w-10 text-slate-400" />
                                <div>
                                    <p className="text-xs text-slate-500 uppercase">حضور اليوم</p>
                                    <p className="text-2xl font-bold">8</p>
                                </div>
                            </div>
                            <div className="card flex items-center gap-4">
                                <Clock className="h-10 w-10 text-slate-400" />
                                <div>
                                    <p className="text-xs text-slate-500 uppercase">متوسط التأخير</p>
                                    <p className="text-2xl font-bold text-orange-500">15د</p>
                                </div>
                            </div>
                        </div>

                        <div className="card">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold flex items-center gap-2">
                                    <Users className="h-5 w-5 text-indigo-600" />
                                    آخر الحركات المسجلة
                                </h3>
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold animate-pulse">
                                    • مباشر
                                </span>
                            </div>
                            <div className="space-y-4">
                                {attendance.map((log, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 border-b border-slate-50 hover:bg-slate-50 rounded-lg transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-white ${log.type === 'in' ? 'bg-green-500' : 'bg-red-500'}`}>
                                                {log.userName[0]}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-slate-900">{log.userName}</p>
                                                <p className="text-xs text-slate-500">{new Date(log.timestamp?.toDate()).toLocaleTimeString('ar-SA')}</p>
                                            </div>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${log.type === 'in' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                            {log.type === 'in' ? 'دخول' : 'خروج'}
                                        </span>
                                    </div>
                                ))}
                                {attendance.length === 0 && (
                                    <p className="text-center text-slate-400 py-8">لا توجد حركات مسجلة اليوم</p>
                                )}
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
