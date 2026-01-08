"use client";

import { useState, useEffect } from "react";
import { BrowserMultiFormatReader } from "@zxing/library";
import { Camera, CheckCircle2, XCircle, LogOut, Clock, Loader2 } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { getUserProfile, markAttendance, getLastAttendance, getTodayAttendance } from "@/lib/firestore";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";

export default function EmployeeDashboard() {
    const [scanning, setScanning] = useState(false);
    const [profile, setProfile] = useState<any>(null);
    const [status, setStatus] = useState<{ type: 'success' | 'error' | 'idle', message: string }>({ type: 'idle', message: "" });
    const [currentStatus, setCurrentStatus] = useState<'in' | 'out' | null>(null);
    const [todayHours, setTodayHours] = useState(0);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const fetchProfile = async () => {
            if (auth.currentUser) {
                const userProfile = await getUserProfile(auth.currentUser.uid);
                if (!userProfile || userProfile.role !== 'employee') {
                    router.push("/login");
                    return;
                }
                setProfile(userProfile);
                await updateAttendanceStatus(userProfile);
                setLoading(false);
            } else {
                router.push("/login");
            }
        };
        fetchProfile();
    }, [router]);

    const updateAttendanceStatus = async (userProfile: any) => {
        // Get last attendance
        const lastRecord = await getLastAttendance(userProfile.uid, userProfile.tenantId);
        setCurrentStatus(lastRecord?.type === 'in' ? 'in' : 'out');

        // Calculate today's hours
        const records = await getTodayAttendance(userProfile.uid, userProfile.tenantId);
        let hours = 0;
        let checkInTime: Date | null = null;

        const sorted = [...records].sort((a, b) => {
            if (!a.timestamp || !b.timestamp) return 0;
            return a.timestamp.toMillis() - b.timestamp.toMillis();
        });

        for (const record of sorted) {
            if (record.type === 'in' && !checkInTime) {
                checkInTime = record.timestamp.toDate();
            } else if (record.type === 'out' && checkInTime) {
                hours += (record.timestamp.toDate().getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
                checkInTime = null;
            }
        }

        if (checkInTime) {
            hours += (new Date().getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
        }

        setTodayHours(hours);
    };

    const startScanner = async () => {
        setScanning(true);
        setStatus({ type: 'idle', message: "" });
        const codeReader = new BrowserMultiFormatReader();

        try {
            const videoElement = document.getElementById('scanner-video') as HTMLVideoElement;
            await codeReader.decodeFromVideoDevice(undefined, videoElement, (result) => {
                if (result) {
                    codeReader.reset();
                    handleScanSuccess(result.getText());
                }
            });
        } catch (err) {
            setStatus({ type: 'error', message: "تعذر فتح الكاميرا - تأكد من السماح بالوصول" });
            setScanning(false);
        }
    };

    const stopScanner = () => {
        setScanning(false);
    };

    const handleScanSuccess = async (qrData: string) => {
        setScanning(false);
        try {
            const payload = JSON.parse(atob(qrData));
            const diff = (Date.now() - payload.t) / 1000;

            if (diff > 90 || payload.tid !== profile.tenantId) {
                setStatus({ type: 'error', message: "❌ الكود منتهي أو غير صالح لهذه الشركة" });
                return;
            }

            const nextType = currentStatus === 'in' ? 'out' : 'in';
            await markAttendance(profile.uid, profile.tenantId, profile.name, nextType);

            setStatus({
                type: 'success',
                message: nextType === 'in' ? "✅ تم تسجيل الحضور بنجاح!" : "✅ تم تسجيل الانصراف بنجاح!"
            });

            await updateAttendanceStatus(profile);
        } catch (err) {
            setStatus({ type: 'error', message: "❌ رمز QR غير صالح" });
        }
    };

    const handleLogout = async () => {
        await signOut(auth);
        router.push("/login");
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-100 flex items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-200 flex flex-col">
            {/* Simple Header */}
            <nav className="bg-white shadow-sm p-4 flex justify-between items-center">
                <div>
                    <h1 className="text-xl font-black text-slate-900">مرحباً، {profile?.name}</h1>
                </div>
                <button
                    onClick={handleLogout}
                    className="text-slate-400 hover:text-red-500 transition-colors"
                >
                    <LogOut className="h-6 w-6" />
                </button>
            </nav>

            {/* Main Content - Simple & Centered */}
            <main className="flex-1 flex flex-col items-center justify-center p-6 space-y-8">

                {/* Current Status */}
                <div className={`px-8 py-4 rounded-2xl text-center ${currentStatus === 'in'
                        ? 'bg-green-100 border-2 border-green-300'
                        : 'bg-slate-200 border-2 border-slate-300'
                    }`}>
                    <p className="text-sm text-slate-600 mb-1">الحالة الآن</p>
                    <p className={`text-2xl font-black ${currentStatus === 'in' ? 'text-green-600' : 'text-slate-600'}`}>
                        {currentStatus === 'in' ? '● متواجد' : '○ غير متواجد'}
                    </p>
                </div>

                {/* Hours Today */}
                <div className="bg-white rounded-3xl shadow-xl p-8 text-center w-full max-w-sm">
                    <Clock className="h-12 w-12 text-indigo-500 mx-auto mb-4" />
                    <p className="text-slate-500 mb-2">ساعات العمل اليوم</p>
                    <p className="text-5xl font-black text-slate-900">
                        {todayHours.toFixed(1)}
                    </p>
                    <p className="text-slate-400 mt-1">ساعة</p>
                </div>

                {/* Scanner Section */}
                {scanning ? (
                    <div className="w-full max-w-sm">
                        <div className="bg-black rounded-3xl overflow-hidden shadow-2xl">
                            <video id="scanner-video" className="w-full aspect-square object-cover" />
                        </div>
                        <button
                            onClick={stopScanner}
                            className="w-full mt-4 py-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-2xl transition-colors"
                        >
                            إلغاء
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={startScanner}
                        className={`w-full max-w-sm py-6 rounded-3xl font-black text-xl flex items-center justify-center gap-3 shadow-2xl transition-all ${currentStatus === 'in'
                                ? 'bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white shadow-red-500/30'
                                : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-green-500/30'
                            }`}
                    >
                        <Camera className="h-8 w-8" />
                        {currentStatus === 'in' ? 'تسجيل انصراف' : 'تسجيل حضور'}
                    </button>
                )}

                {/* Status Message */}
                {status.type !== 'idle' && (
                    <div className={`w-full max-w-sm p-4 rounded-2xl text-center font-bold ${status.type === 'success'
                            ? 'bg-green-100 text-green-700 border border-green-300'
                            : 'bg-red-100 text-red-700 border border-red-300'
                        }`}>
                        {status.type === 'success' ? (
                            <CheckCircle2 className="h-6 w-6 mx-auto mb-2" />
                        ) : (
                            <XCircle className="h-6 w-6 mx-auto mb-2" />
                        )}
                        {status.message}
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="p-4 text-center text-slate-400 text-sm">
                نظام ساعة العمل
            </footer>
        </div>
    );
}
