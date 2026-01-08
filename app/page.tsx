import Link from "next/link";
import { ArrowLeft, Clock, ShieldCheck, QrCode, Calculator } from "lucide-react";

export default function Home() {
    return (
        <div className="min-h-screen bg-slate-50">
            {/* Hero Section */}
            <header className="bg-white border-b">
                <nav className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="bg-indigo-600 p-2 rounded-lg text-white">
                            <Clock className="h-6 w-6" />
                        </div>
                        <span className="text-2xl font-black text-slate-900">ساعة العمل</span>
                    </div>
                    <div className="flex gap-4">
                        <Link href="/login" className="btn-secondary">تسجيل الدخول</Link>
                        <Link href="/signup" className="btn-primary">ابدأ مجاناً</Link>
                    </div>
                </nav>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-20 text-center">
                <h1 className="text-6xl font-black text-slate-900 leading-tight mb-6">
                    إدارة الحضور والانصراف <br />
                    <span className="text-indigo-600">بلمسة واحدة من هاتفك</span>
                </h1>
                <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-10">
                    نظام متكامل يتيح للشركات تتبع حضور الموظفين عبر رموز QR الديناميكية،
                    مع لوحات تحكم ذكية وتقارير رواتب تلقائية.
                </p>

                <div className="flex justify-center gap-4 mb-20">
                    <Link href="/signup" className="btn-primary py-4 px-10 text-xl rounded-full">
                        ابدأ رحلتك الآن
                        <ArrowLeft className="h-6 w-6" />
                    </Link>
                </div>

                {/* Features */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="card bg-white hover:border-indigo-200 transition-colors">
                        <div className="h-12 w-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 mx-auto mb-4">
                            <QrCode className="h-6 w-6" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">كود QR متجدد</h3>
                        <p className="text-slate-500 text-sm">رمز مشفر يتجدد كل 60 ثانية لضمان حضور الموظف الفعلي في مقر العمل.</p>
                    </div>
                    <div className="card bg-white hover:border-indigo-200 transition-colors">
                        <div className="h-12 w-12 bg-green-50 rounded-xl flex items-center justify-center text-green-600 mx-auto mb-4">
                            <ShieldCheck className="h-6 w-6" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">أمان عالي</h3>
                        <p className="text-slate-500 text-sm">نظام تفعيل خاص بكل شركة وحماية من التلاعب بالموقع الجغرافي أو الأجهزة.</p>
                    </div>
                    <div className="card bg-white hover:border-indigo-200 transition-colors">
                        <div className="h-12 w-12 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600 mx-auto mb-4">
                            <Calculator className="h-6 w-6" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">حساب الرواتب</h3>
                        <p className="text-slate-500 text-sm">تقارير شهرية مفصلة لساعات عمل كل موظف مع حساب الرواتب المستحقة تلقائياً.</p>
                    </div>
                </div>
            </main>

            <footer className="bg-slate-900 text-slate-400 py-10 text-center border-t border-slate-800">
                <p>© 2026 ساعة العمل - جميع الحقوق محفوظة</p>
            </footer>
        </div>
    );
}
