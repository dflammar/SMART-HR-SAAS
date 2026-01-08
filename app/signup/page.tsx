"use client";

import { useState } from "react";
import { auth } from "@/lib/firebase";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { createTenant, createUserProfile } from "@/lib/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserPlus, Loader2 } from "lucide-react";

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
            const tenantId = companyName.toLowerCase().replace(/\s+/g, '-');
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
            setError("حدث خطأ أثناء إنشاء الحساب، يرجى المحاولة مرة أخرى");
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl border border-slate-200 shadow-xl">
                <div className="text-center">
                    <div className="mx-auto h-12 w-12 bg-indigo-600 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-indigo-200">
                        <UserPlus className="text-white h-6 w-6" />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">إنشاء حساب جديد</h1>
                    <p className="mt-2 text-slate-500">انضم إلينا وابدأ في إدارة شركتك باحترافية</p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSignup}>
                    {error && (
                        <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm border border-red-100">
                            {error}
                        </div>
                    )}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">اسمك الكامل</label>
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
                            <label className="block text-sm font-medium text-slate-700 mb-1">اسم الشركة</label>
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
                            <label className="block text-sm font-medium text-slate-700 mb-1">البريد الإلكتروني</label>
                            <input
                                type="email"
                                required
                                className="input-field"
                                placeholder="name@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">كلمة المرور</label>
                            <input
                                type="password"
                                required
                                className="input-field"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary w-full py-3 text-lg font-semibold shadow-lg shadow-indigo-100"
                    >
                        {loading ? (
                            <Loader2 className="animate-spin h-5 w-5" />
                        ) : (
                            "إنشاء الحساب"
                        )}
                    </button>

                    <p className="text-center text-slate-500 text-sm">
                        تمتلك حساباً بالفعل؟{" "}
                        <Link href="/login" className="text-indigo-600 font-semibold hover:text-indigo-700">
                            تسجيل الدخول
                        </Link>
                    </p>
                </form>
            </div>
        </div>
    );
}
