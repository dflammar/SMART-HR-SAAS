"use client";

import { useState } from "react";
import { auth, db } from "@/lib/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { ShieldAlert, Eye, EyeOff, Loader2 } from "lucide-react";

const ADMIN_EMAIL = "h@admin.com";
const ADMIN_PASSWORD = "Ammar4455##";

export default function AdminLogin() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        // Strict admin check
        if (email.toLowerCase() !== ADMIN_EMAIL) {
            setError("هذه الصفحة مخصصة للمدير العام فقط");
            setLoading(false);
            return;
        }

        try {
            // Try to sign in
            const userCredential = await signInWithEmailAndPassword(auth, email, password);

            // Verify or create admin profile
            const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));

            if (!userDoc.exists()) {
                // Create admin profile if first time
                await setDoc(doc(db, "users", userCredential.user.uid), {
                    uid: userCredential.user.uid,
                    email: ADMIN_EMAIL,
                    name: "المدير العام",
                    role: 'super_admin',
                    createdAt: serverTimestamp(),
                });
            } else if (userDoc.data()?.role !== 'super_admin') {
                // Ensure role is super_admin
                await setDoc(doc(db, "users", userCredential.user.uid), {
                    role: 'super_admin',
                }, { merge: true });
            }

            router.push("/dashboard/admin");
        } catch (err: any) {
            if (err.code === 'auth/user-not-found') {
                // First time setup - create the admin account
                try {
                    const newUser = await createUserWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
                    await setDoc(doc(db, "users", newUser.user.uid), {
                        uid: newUser.user.uid,
                        email: ADMIN_EMAIL,
                        name: "المدير العام",
                        role: 'super_admin',
                        createdAt: serverTimestamp(),
                    });
                    router.push("/dashboard/admin");
                } catch (createErr: any) {
                    setError("فشل في إنشاء الحساب: " + createErr.message);
                }
            } else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
                setError("كلمة المرور غير صحيحة");
            } else {
                setError("خطأ في تسجيل الدخول: " + err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-2xl mb-4">
                        <ShieldAlert className="h-10 w-10 text-white" />
                    </div>
                    <h1 className="text-3xl font-black text-white mb-2">لوحة المدير العام</h1>
                    <p className="text-slate-400">الوصول المقيد - للمسؤولين فقط</p>
                </div>

                {/* Login Form */}
                <form onSubmit={handleLogin} className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 shadow-2xl">
                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm text-center">
                            {error}
                        </div>
                    )}

                    <div className="space-y-5">
                        <div>
                            <label className="block text-slate-300 text-sm font-medium mb-2">
                                البريد الإلكتروني
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                                placeholder="أدخل بريدك الإلكتروني"
                                required
                                dir="ltr"
                            />
                        </div>

                        <div>
                            <label className="block text-slate-300 text-sm font-medium mb-2">
                                كلمة المرور
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                                    placeholder="أدخل كلمة المرور"
                                    required
                                    dir="ltr"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                                >
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full mt-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-5 w-5 animate-spin" />
                                جاري التحقق...
                            </>
                        ) : (
                            "تسجيل الدخول"
                        )}
                    </button>
                </form>

                <p className="text-center text-slate-500 text-sm mt-6">
                    © 2026 نظام ساعة العمل - لوحة الإدارة المركزية
                </p>
            </div>
        </div>
    );
}
