"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Clock, Users, Calendar, LogOut, AlertTriangle, MessageCircle, TrendingUp, DollarSign, UserCheck, Sparkles } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { getUserProfile, getTenantAttendance, getEmployeesByTenant } from "@/lib/firestore";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { collection, query, where, onSnapshot, doc, getDoc } from "firebase/firestore";
import Link from "next/link";

const WHATSAPP_NUMBER = "+201280548656";

export default function CompanyDashboard() {
    const [qrValue, setQrValue] = useState("");
    const [timer, setTimer] = useState(60);
    const [profile, setProfile] = useState<any>(null);
    const [tenant, setTenant] = useState<any>(null);
    const [attendance, setAttendance] = useState<any[]>([]);
    const [subscriptionStatus, setSubscriptionStatus] = useState<'loading' | 'active' | 'inactive' | 'expired'>('loading');
    const [daysRemaining, setDaysRemaining] = useState(0);
    const router = useRouter();

    // Today's stats
    const [todayStats, setTodayStats] = useState({
        attendanceCount: 0,
        totalHours: 0,
        totalPayments: 0,
        activeEmployees: 0,
    });

    useEffect(() => {
        const fetchData = async () => {
            if (auth.currentUser) {
                const userProfile = await getUserProfile(auth.currentUser.uid);
                if (userProfile?.role !== 'company_manager') {
                    router.push("/login");
                    return;
                }
                setProfile(userProfile);

                if (userProfile.tenantId) {
                    const tenantDoc = await getDoc(doc(db, "tenants", userProfile.tenantId));
                    if (tenantDoc.exists()) {
                        const tenantData = tenantDoc.data();
                        setTenant(tenantData);

                        if (!tenantData.isActive) {
                            setSubscriptionStatus('inactive');
                            return;
                        }

                        if (tenantData.activatedAt) {
                            const activatedAt = tenantData.activatedAt?.toDate?.() || new Date(tenantData.activatedAt);
                            const expiresAt = new Date(activatedAt.getTime() + 30 * 24 * 60 * 60 * 1000);
                            const now = new Date();

                            if (now > expiresAt) {
                                setSubscriptionStatus('expired');
                                setDaysRemaining(0);
                                return;
                            } else {
                                const diff = expiresAt.getTime() - now.getTime();
                                setDaysRemaining(Math.ceil(diff / (1000 * 60 * 60 * 24)));
                                setSubscriptionStatus('active');
                            }
                        } else {
                            setSubscriptionStatus('inactive');
                            return;
                        }

                        // Fetch initial data
                        await fetchTodayStats(userProfile.tenantId);
                        const logs = await getTenantAttendance(userProfile.tenantId);
                        setAttendance(logs.slice(0, 10));
                    } else {
                        setSubscriptionStatus('inactive');
                    }
                } else {
                    setSubscriptionStatus('inactive');
                }
            } else {
                router.push("/login");
            }
        };
        fetchData();
    }, [router]);

    const fetchTodayStats = async (tenantId: string) => {
        // Get today's attendance records
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const logs = await getTenantAttendance(tenantId);
        const todayLogs = logs.filter((log: any) => {
            if (!log.timestamp) return false;
            const logDate = log.timestamp?.toDate?.() || new Date(log.timestamp);
            return logDate >= today;
        });

        // Get employees for payment calculation
        const employees = await getEmployeesByTenant(tenantId);
        const employeeMap = new Map(employees.map((e: any) => [e.uid, e]));

        // Calculate hours per employee today
        const hoursPerEmployee: { [key: string]: number } = {};
        const sortedLogs = [...todayLogs].sort((a: any, b: any) => {
            const timeA = a.timestamp?.toMillis?.() || 0;
            const timeB = b.timestamp?.toMillis?.() || 0;
            return timeA - timeB;
        });

        const checkIns: { [key: string]: Date } = {};

        for (const log of sortedLogs) {
            if (log.type === 'in') {
                checkIns[log.userId] = log.timestamp?.toDate?.() || new Date();
            } else if (log.type === 'out' && checkIns[log.userId]) {
                const checkInTime = checkIns[log.userId];
                const checkOutTime = log.timestamp?.toDate?.() || new Date();
                const hours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
                hoursPerEmployee[log.userId] = (hoursPerEmployee[log.userId] || 0) + hours;
                delete checkIns[log.userId];
            }
        }

        // Add ongoing hours for still checked-in employees
        const now = new Date();
        for (const [userId, checkInTime] of Object.entries(checkIns)) {
            const hours = (now.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
            hoursPerEmployee[userId] = (hoursPerEmployee[userId] || 0) + hours;
        }

        // Calculate totals
        let totalHours = 0;
        let totalPayments = 0;

        for (const [userId, hours] of Object.entries(hoursPerEmployee)) {
            totalHours += hours;
            const employee = employeeMap.get(userId);
            if (employee?.hourlyRate) {
                totalPayments += hours * employee.hourlyRate;
            }
        }

        // Unique employees who attended today
        const uniqueAttendees = new Set(todayLogs.map((l: any) => l.userId));

        setTodayStats({
            attendanceCount: todayLogs.length,
            totalHours: Math.round(totalHours * 10) / 10,
            totalPayments: Math.round(totalPayments * 100) / 100,
            activeEmployees: uniqueAttendees.size,
        });
    };

    // Real-time listener
    useEffect(() => {
        if (!profile?.tenantId || subscriptionStatus !== 'active') return;

        const q = query(
            collection(db, "attendance"),
            where("tenantId", "==", profile.tenantId)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            logs.sort((a: any, b: any) => {
                if (!a.timestamp || !b.timestamp) return 0;
                return b.timestamp.toMillis() - a.timestamp.toMillis();
            });
            setAttendance(logs.slice(0, 10));

            // Refresh today's stats
            fetchTodayStats(profile.tenantId);
        });

        return () => unsubscribe();
    }, [profile, subscriptionStatus]);

    // QR Code generation
    useEffect(() => {
        if (!profile?.tenantId || subscriptionStatus !== 'active') return;

        const generateQR = () => {
            const payload = { t: Date.now(), tid: profile.tenantId };
            // Unicode-safe Base64 encoding
            const jsonStr = JSON.stringify(payload);
            const encoded = btoa(unescape(encodeURIComponent(jsonStr)));
            setQrValue(encoded);
            setTimer(60);
        };

        generateQR();
        const interval = setInterval(generateQR, 60000);
        const countdown = setInterval(() => setTimer((t) => t - 1), 1000);

        return () => {
            clearInterval(interval);
            clearInterval(countdown);
        };
    }, [profile, subscriptionStatus]);

    const handleLogout = async () => {
        await signOut(auth);
        router.push("/login");
    };

    const openWhatsApp = () => {
        const message = encodeURIComponent(`مرحباً، أرغب في الحصول على كود تفعيل جديد لنظام ساعة العمل.\nاسم الشركة: ${tenant?.name || profile?.name || 'غير محدد'}`);
        window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, '_blank');
    };

    // Loading
    if (subscriptionStatus === 'loading') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-white text-lg">جاري التحميل...</p>
                </div>
            </div>
        );
    }

    // Inactive or Expired
    if (subscriptionStatus === 'inactive' || subscriptionStatus === 'expired') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-900/20 to-slate-900 flex items-center justify-center p-4">
                <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl max-w-md w-full p-8 text-center">
                    <div className="w-24 h-24 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-red-500/30">
                        <AlertTriangle className="h-12 w-12 text-white" />
                    </div>

                    <h1 className="text-3xl font-black text-white mb-3">
                        {subscriptionStatus === 'expired' ? 'انتهى اشتراكك!' : 'الحساب غير مفعّل'}
                    </h1>

                    <p className="text-slate-300 mb-8 leading-relaxed">
                        {subscriptionStatus === 'expired'
                            ? 'لقد مرّ 30 يوماً على اشتراكك. للاستمرار في استخدام النظام، يرجى التواصل معنا للحصول على كود تجديد.'
                            : 'يرجى الحصول على كود تفعيل لتتمكن من استخدام النظام.'
                        }
                    </p>

                    <div className="space-y-4">
                        <button
                            onClick={openWhatsApp}
                            className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold rounded-2xl flex items-center justify-center gap-3 shadow-lg shadow-green-500/30 transition-all"
                        >
                            <MessageCircle className="h-6 w-6" />
                            تواصل عبر واتساب للتجديد
                        </button>

                        <Link
                            href="/activate"
                            className="block w-full py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl text-center border border-white/20 transition-all"
                        >
                            لديّ كود تفعيل
                        </Link>

                        <button
                            onClick={handleLogout}
                            className="w-full py-3 text-slate-400 hover:text-white font-medium transition-colors"
                        >
                            تسجيل الخروج
                        </button>
                    </div>

                    <div className="mt-8 pt-6 border-t border-white/10">
                        <p className="text-sm text-slate-400">للتواصل والدعم الفني:</p>
                        <p className="text-xl font-bold text-green-400 mt-1" dir="ltr">{WHATSAPP_NUMBER}</p>
                    </div>
                </div>
            </div>
        );
    }

    // Active - Main Dashboard
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900/50 to-slate-900">
            {/* Header */}
            <header className="bg-white/5 backdrop-blur-xl border-b border-white/10 px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
                            <Sparkles className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-white">ساعة العمل</h1>
                            <p className="text-slate-400 text-sm">{tenant?.name || profile?.name}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {daysRemaining <= 7 && (
                            <div className="bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 px-4 py-2 rounded-xl text-sm font-bold">
                                ⚠️ متبقي {daysRemaining} يوم
                            </div>
                        )}
                        <button onClick={handleLogout} className="text-slate-400 hover:text-red-400 transition-colors">
                            <LogOut className="h-6 w-6" />
                        </button>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto p-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-xl border border-blue-500/30 rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-blue-500/30 rounded-xl flex items-center justify-center">
                                <UserCheck className="h-5 w-5 text-blue-400" />
                            </div>
                            <span className="text-blue-300 text-sm font-medium">الحضور اليوم</span>
                        </div>
                        <p className="text-4xl font-black text-white">{todayStats.activeEmployees}</p>
                        <p className="text-blue-400 text-sm mt-1">موظف حضر</p>
                    </div>

                    <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-xl border border-green-500/30 rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-green-500/30 rounded-xl flex items-center justify-center">
                                <TrendingUp className="h-5 w-5 text-green-400" />
                            </div>
                            <span className="text-green-300 text-sm font-medium">التسجيلات</span>
                        </div>
                        <p className="text-4xl font-black text-white">{todayStats.attendanceCount}</p>
                        <p className="text-green-400 text-sm mt-1">حركة حضور/انصراف</p>
                    </div>

                    <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-xl border border-purple-500/30 rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-purple-500/30 rounded-xl flex items-center justify-center">
                                <Clock className="h-5 w-5 text-purple-400" />
                            </div>
                            <span className="text-purple-300 text-sm font-medium">إجمالي الساعات</span>
                        </div>
                        <p className="text-4xl font-black text-white">{todayStats.totalHours}</p>
                        <p className="text-purple-400 text-sm mt-1">ساعة عمل اليوم</p>
                    </div>

                    <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 backdrop-blur-xl border border-yellow-500/30 rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-yellow-500/30 rounded-xl flex items-center justify-center">
                                <DollarSign className="h-5 w-5 text-yellow-400" />
                            </div>
                            <span className="text-yellow-300 text-sm font-medium">المدفوعات</span>
                        </div>
                        <p className="text-4xl font-black text-white">{todayStats.totalPayments.toFixed(0)}</p>
                        <p className="text-yellow-400 text-sm mt-1">جنيه مصري</p>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid lg:grid-cols-3 gap-6">
                    {/* QR Code - Takes 2 columns */}
                    <div className="lg:col-span-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-white">رمز الحضور</h2>
                                <p className="text-slate-400">اعرض هذا الرمز للموظفين لتسجيل الحضور</p>
                            </div>
                            <div className="flex items-center gap-2 bg-indigo-500/20 text-indigo-400 px-4 py-2 rounded-full text-sm font-bold">
                                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse"></div>
                                يتجدد خلال {timer} ث
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row items-center gap-8">
                            <div className="bg-white p-6 rounded-3xl shadow-2xl">
                                {qrValue && <QRCodeSVG value={qrValue} size={220} />}
                            </div>
                            <div className="flex-1 text-center md:text-right">
                                <div className="inline-block bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-6 py-3 rounded-2xl font-bold mb-4">
                                    📱 وجّه الكاميرا هنا
                                </div>
                                <p className="text-slate-300 leading-relaxed">
                                    يقوم الموظف بمسح هذا الرمز من تطبيقه لتسجيل الحضور أو الانصراف تلقائياً
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-white text-lg">آخر الحركات</h3>
                            <span className="flex items-center gap-1 text-green-400 text-sm">
                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                مباشر
                            </span>
                        </div>
                        <div className="space-y-3 max-h-80 overflow-auto">
                            {attendance.length === 0 ? (
                                <div className="text-center py-10">
                                    <Users className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                                    <p className="text-slate-500">لا توجد حركات بعد</p>
                                </div>
                            ) : (
                                attendance.map((log, i) => (
                                    <div key={i} className="flex items-center justify-between py-3 px-4 bg-white/5 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${log.type === 'in' ? 'bg-green-500/30' : 'bg-red-500/30'
                                                }`}>
                                                {log.userName?.charAt(0) || '?'}
                                            </div>
                                            <span className="font-medium text-white">{log.userName}</span>
                                        </div>
                                        <span className={`text-sm font-bold px-3 py-1 rounded-full ${log.type === 'in'
                                            ? 'bg-green-500/20 text-green-400'
                                            : 'bg-red-500/20 text-red-400'
                                            }`}>
                                            {log.type === 'in' ? '← حضور' : '→ انصراف'}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Quick Links */}
                <div className="grid md:grid-cols-2 gap-4 mt-6">
                    <Link
                        href="/dashboard/company/employees"
                        className="bg-white/5 hover:bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-6 flex items-center gap-4 transition-all group"
                    >
                        <div className="w-14 h-14 bg-indigo-500/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Users className="h-7 w-7 text-indigo-400" />
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-lg">إدارة الموظفين</h3>
                            <p className="text-slate-400 text-sm">إضافة وتعديل بيانات الموظفين</p>
                        </div>
                    </Link>

                    <Link
                        href="/dashboard/company/payroll"
                        className="bg-white/5 hover:bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-6 flex items-center gap-4 transition-all group"
                    >
                        <div className="w-14 h-14 bg-green-500/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            <DollarSign className="h-7 w-7 text-green-400" />
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-lg">تقارير الرواتب</h3>
                            <p className="text-slate-400 text-sm">حساب رواتب الموظفين الشهرية</p>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
}
