"use client";

import { useState, useEffect } from "react";
import { auth } from "@/lib/firebase";
import { getUserProfile, activateTenant } from "@/lib/firestore";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2, CheckCircle2 } from "lucide-react";

export default function ActivatePage() {
    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [userProfile, setUserProfile] = useState<any>(null);
    const router = useRouter();

    useEffect(() => {
        const checkUser = async () => {
            if (auth.currentUser) {
                const profile = await getUserProfile(auth.currentUser.uid);
                setUserProfile(profile);
            }
        };
        checkUser();
    }, []);

    const handleActivate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userProfile?.tenantId) return;

        setLoading(true);
        setError("");
        try {
            const success = await activateTenant(userProfile.tenantId, code.toUpperCase());
            if (success) {
                setSuccess(true);
                setTimeout(() => {
                    router.push("/dashboard/company");
                }, 2000);
            } else {
                setError("كود التفعيل غير صحيح أو مستخدم مسبقاً");
                setLoading(false);
            }
        } catch (err: any) {
            setError("حدث خطأ أثناء التفعيل");
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl border border-slate-200 shadow-xl">
                <div className="text-center">
                    <div className="mx-auto h-12 w-12 bg-indigo-600 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-indigo-200">
                        <KeyRound className="text-white h-6 w-6" />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">حماية التفعيل</h1>
                    <p className="mt-2 text-slate-500">ادخل كود التفعيل لتشغيل حساب شركتك</p>
                </div>

                {success ? (
                    <div className="text-center space-y-4 py-8">
                        <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto animate-bounce" />
                        <h2 className="text-xl font-bold text-slate-900">تم التفعيل بنجاح!</h2>
                        <p className="text-slate-500">يتم تحويلك الآن إلى لوحة التحكم...</p>
                    </div>
                ) : (
                    <form className="mt-8 space-y-6" onSubmit={handleActivate}>
                        {error && (
                            <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm border border-red-100">
                                {error}
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">كود التفعيل (8 رموز)</label>
                            <input
                                type="text"
                                required
                                className="input-field uppercase tracking-widest text-center text-2xl font-mono"
                                placeholder="XXXX-XXXX"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full py-3 text-lg font-semibold shadow-lg shadow-indigo-100"
                        >
                            {loading ? (
                                <Loader2 className="animate-spin h-5 w-5" />
                            ) : (
                                "تفعيل الحساب الآن"
                            )}
                        </button>

                        <div className="p-4 bg-indigo-50 rounded-lg text-indigo-700 text-sm">
                            <p className="font-semibold mb-1">تحتاج إلى مساعدة؟</p>
                            <p>تواصل مع الدعم الفني للحصول على كود التفعيل الخاص بشركتك.</p>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
