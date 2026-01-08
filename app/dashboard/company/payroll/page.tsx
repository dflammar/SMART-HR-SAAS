"use client";

import { useState, useEffect } from "react";
import { auth } from "@/lib/firebase";
import { getUserProfile, getMonthlyPayrollData } from "@/lib/firestore";
import { useRouter } from "next/navigation";
import { Calculator, DollarSign, Clock, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

export default function PayrollPage() {
    const [profile, setProfile] = useState<any>(null);
    const [payrollData, setPayrollData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const router = useRouter();

    useEffect(() => {
        const fetchData = async () => {
            if (auth.currentUser) {
                const userProfile = await getUserProfile(auth.currentUser.uid);
                if (userProfile?.role !== 'company_manager') {
                    router.push("/dashboard/employee");
                    return;
                }
                setProfile(userProfile);
                loadPayroll(userProfile.tenantId!, selectedYear, selectedMonth);
            } else {
                router.push("/login");
            }
        };
        fetchData();
    }, [router]);

    useEffect(() => {
        if (profile?.tenantId) {
            loadPayroll(profile.tenantId, selectedYear, selectedMonth);
        }
    }, [selectedMonth, selectedYear]);

    const loadPayroll = async (tenantId: string, year: number, month: number) => {
        setLoading(true);
        const data = await getMonthlyPayrollData(tenantId, year, month);
        setPayrollData(data);
        setLoading(false);
    };

    const handlePreviousMonth = () => {
        if (selectedMonth === 1) {
            setSelectedMonth(12);
            setSelectedYear(selectedYear - 1);
        } else {
            setSelectedMonth(selectedMonth - 1);
        }
    };

    const handleNextMonth = () => {
        if (selectedMonth === 12) {
            setSelectedMonth(1);
            setSelectedYear(selectedYear + 1);
        } else {
            setSelectedMonth(selectedMonth + 1);
        }
    };

    const monthNames = [
        "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
        "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
    ];

    const totalHours = payrollData.reduce((acc, curr) => acc + curr.hoursWorked, 0);
    const totalSalary = payrollData.reduce((acc, curr) => acc + curr.totalSalary, 0);

    return (
        <div className="min-h-screen bg-slate-50">
            <nav className="bg-primary text-white p-4 shadow-lg">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard/company" className="text-slate-300 hover:text-white transition-colors">
                            <ArrowRight className="h-6 w-6" />
                        </Link>
                        <h1 className="text-xl font-bold">تقرير الرواتب</h1>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto p-6">
                {/* Month Selector */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-3xl font-bold text-slate-900">حساب المستحقات</h2>
                        <p className="text-slate-500 mt-1">مبني على سجلات الحضور والانصراف</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handlePreviousMonth}
                            className="btn-secondary py-2 px-3"
                        >
                            <ChevronRight className="h-5 w-5" />
                        </button>
                        <div className="text-center min-w-[150px]">
                            <p className="text-2xl font-bold text-slate-900">
                                {monthNames[selectedMonth - 1]}
                            </p>
                            <p className="text-sm text-slate-500">{selectedYear}</p>
                        </div>
                        <button
                            onClick={handleNextMonth}
                            className="btn-secondary py-2 px-3"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    <div className="card bg-white">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-green-50 rounded-xl">
                                <DollarSign className="h-6 w-6 text-green-600" />
                            </div>
                            <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">نشط</span>
                        </div>
                        <p className="text-sm text-slate-500">إجمالي الرواتب</p>
                        <p className="text-2xl font-black text-slate-900">{totalSalary.toFixed(2)} ر.س</p>
                    </div>

                    <div className="card bg-white">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-blue-50 rounded-xl">
                                <Clock className="h-6 w-6 text-blue-600" />
                            </div>
                        </div>
                        <p className="text-sm text-slate-500">إجمالي الساعات</p>
                        <p className="text-2xl font-black text-slate-900">{totalHours.toFixed(2)} ساعة</p>
                    </div>

                    <div className="card bg-white">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-purple-50 rounded-xl">
                                <Calculator className="h-6 w-6 text-purple-600" />
                            </div>
                        </div>
                        <p className="text-sm text-slate-500">عدد الموظفين</p>
                        <p className="text-2xl font-black text-slate-900">{payrollData.length} موظف</p>
                    </div>
                </div>

                {/* Payroll Table */}
                <div className="card overflow-hidden !p-0">
                    {loading ? (
                        <div className="p-10 text-center text-slate-400">
                            <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                            جاري التحميل...
                        </div>
                    ) : payrollData.length > 0 ? (
                        <table className="w-full text-right">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="p-4 font-bold text-slate-600">الموظف</th>
                                    <th className="p-4 font-bold text-slate-600">البريد الإلكتروني</th>
                                    <th className="p-4 font-bold text-slate-600">ساعات العمل</th>
                                    <th className="p-4 font-bold text-slate-600">سعر الساعة</th>
                                    <th className="p-4 font-bold text-slate-600">المبلغ المستحق</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {payrollData.map((item, i) => (
                                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center">
                                                    <span className="text-indigo-600 font-bold">
                                                        {item.name[0]}
                                                    </span>
                                                </div>
                                                <span className="font-bold text-slate-900">{item.name}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-slate-600 text-sm">{item.email}</td>
                                        <td className="p-4 text-slate-600">
                                            <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded font-medium">
                                                {item.hoursWorked} س
                                            </span>
                                        </td>
                                        <td className="p-4 text-slate-600">{item.hourlyRate} ر.س</td>
                                        <td className="p-4">
                                            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg font-bold">
                                                {item.totalSalary.toFixed(2)} ر.س
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-slate-100 border-t-2 border-slate-200">
                                <tr>
                                    <td colSpan={2} className="p-4 font-bold text-slate-900">الإجمالي</td>
                                    <td className="p-4">
                                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded font-bold">
                                            {totalHours.toFixed(2)} س
                                        </span>
                                    </td>
                                    <td className="p-4"></td>
                                    <td className="p-4">
                                        <span className="px-3 py-1 bg-indigo-600 text-white rounded-lg font-bold text-lg">
                                            {totalSalary.toFixed(2)} ر.س
                                        </span>
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    ) : (
                        <div className="p-10 text-center text-slate-400">
                            <Calculator className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                            <p className="text-lg font-medium mb-2">لا توجد بيانات متاحة</p>
                            <p className="text-sm">لا توجد سجلات حضور لهذا الشهر</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
