"use client";

import { useState } from "react";
import { auth } from "@/lib/firebase";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { createTenant, createUserProfile } from "@/lib/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserPlus, Loader2, MessageCircle, HelpCircle } from "lucide-react";

const WHATSAPP_NUMBER = "+201280548656";

export default function SignupPage() {
    const [name, setName] = useState("");
    const [companyName, setCompanyName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            await updateProfile(user, { displayName: name });

            // Create tenant entry for the company
            const tenantId = companyName.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
            await createTenant(tenantId, companyName);

            // Create user profile in Firestore
            await createUserProfile(user.uid, {
                uid: user.uid,
                email,
                name,
                role: 'company_manager',
                tenantId,
            });

            router.push("/activate");
        } catch (err: any) {
            if (err.code === 'auth/email-already-in-use') {
                setError("هذا البريد الإلكتروني مستخدم بالفعل");
            } else if (err.code === 'auth/weak-password') {
                setError("كلمة المرور ضعيفة جداً (6 أحرف على الأقل)");
            } else {
                setError("حدث خطأ أثناء إنشاء الحساب، يرجى المحاولة مرة أخرى");
            }
            setLoading(false);
        }
    };

    const openWhatsApp = () => {
        const message = encodeURIComponent(`مرحباً، أرغب في الحصول على كود تفعيل لنظام ساعة العمل.\nاسم الشركة: ${companyName || 'غير محدد'}`);
        window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, '_blank');
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-indigo-100 p-4">
            <div className="max-w-md w-full space-y-6">
                {/* Main Signup Card */}
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-2xl">
                    <div className="text-center">
                        <div className="mx-auto h-16 w-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-indigo-200">
                            <UserPlus className="text-white h-8 w-8" />
                        </div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">إنشاء حساب جديد</h1>
                        <p className="mt-2 text-slate-500">انضم إلينا وابدأ في إدارة شركتك باحترافية</p>
                    </div>

                    <form className="mt-8 space-y-5" onSubmit={handleSignup}>
                        {error && (
                            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm border border-red-100 font-medium">
                                {error}
                            </div>
                        )}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">اسمك الكامل</label>
                                <input
                                    type="text"
                                    required
                                    className="input-field"
                                    placeholder="أحمد محمد"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">اسم الشركة</label>
                                <input
                                    type="text"
                                    required
                                    className="input-field"
                                    placeholder="شركتك التقنية"
                                    value={companyName}
                                    onChange={(e) => setCompanyName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">البريد الإلكتروني</label>
                                <input
                                    type="email"
                                    required
                                    className="input-field"
                                    placeholder="name@company.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    dir="ltr"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">كلمة المرور</label>
                                <input
                                    type="password"
                                    required
                                    className="input-field"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    dir="ltr"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full py-4 text-lg font-bold shadow-lg shadow-indigo-200 rounded-xl"
                        >
                            {loading ? (
                                <Loader2 className="animate-spin h-5 w-5" />
                            ) : (
                                "إنشاء الحساب"
                            )}
                        </button>

                        <p className="text-center text-slate-500 text-sm">
                            تمتلك حساباً بالفعل؟{" "}
                            <Link href="/login" className="text-indigo-600 font-bold hover:text-indigo-700">
                                تسجيل الدخول
                            </Link>
                        </p>
                    </form>
                </div>

                {/* Help Card - WhatsApp Support */}
                <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-6 rounded-2xl shadow-xl text-white">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                            <HelpCircle className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-lg mb-1">تحتاج إلى مساعدة؟</h3>
                            <p className="text-green-100 text-sm mb-4">
                                تواصل مع الدعم الفني للحصول على كود التفعيل الخاص بشركتك.
                            </p>
                            <button
                                onClick={openWhatsApp}
                                className="w-full py-3 bg-white text-green-600 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-green-50 transition-colors"
                            >
                                <MessageCircle className="h-5 w-5" />
                                تواصل واتساب
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
