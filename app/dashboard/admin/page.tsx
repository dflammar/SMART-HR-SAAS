"use client";

import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { getUserProfile, generateActivationCode, getAllTenants, renewTenant, getEmployeesByTenant, getMonthlyPayrollData } from "@/lib/firestore";
import { useRouter } from "next/navigation";
import { ShieldAlert, Plus, Ticket, Building2, LogOut, Loader2, RefreshCw, AlertTriangle, CheckCircle, Calendar, Users, DollarSign, X, Clock, Eye } from "lucide-react";
import { signOut } from "firebase/auth";
import { getDocs, collection, query, where } from "firebase/firestore";

const ADMIN_EMAIL = "h@admin.com";

export default function AdminDashboard() {
    const [profile, setProfile] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'codes' | 'companies'>('codes');
    const [codes, setCodes] = useState<any[]>([]);
    const [tenants, setTenants] = useState<any[]>([]);
    const [tenantsWithStats, setTenantsWithStats] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [renewingId, setRenewingId] = useState<string | null>(null);
    const router = useRouter();

    // Company Details Modal
    const [selectedCompany, setSelectedCompany] = useState<any>(null);
    const [companyEmployees, setCompanyEmployees] = useState<any[]>([]);
    const [companyPayroll, setCompanyPayroll] = useState<any[]>([]);
    const [loadingDetails, setLoadingDetails] = useState(false);

    useEffect(() => {
        const checkAdmin = async () => {
            if (auth.currentUser) {
                if (auth.currentUser.email?.toLowerCase() !== ADMIN_EMAIL) {
                    await signOut(auth);
                    router.push("/admin-login");
                    return;
                }

                const userProfile = await getUserProfile(auth.currentUser.uid);
                if (userProfile?.role !== 'super_admin') {
                    router.push("/admin-login");
                    return;
                }
                setProfile(userProfile);
                fetchData();
            } else {
                router.push("/admin-login");
            }
        };
        checkAdmin();
    }, [router]);

    const fetchData = async () => {
        setLoading(true);

        // Fetch codes
        const codesSnapshot = await getDocs(collection(db, "activation_codes"));
        const codesData = codesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCodes(codesData);

        // Fetch tenants with employee counts
        const tenantsData = await getAllTenants();
        const tenantsEnriched = await Promise.all(
            tenantsData.map(async (tenant: any) => {
                const employees = await getEmployeesByTenant(tenant.id);
                return {
                    ...tenant,
                    employeeCount: employees.length,
                };
            })
        );
        setTenants(tenantsData);
        setTenantsWithStats(tenantsEnriched);
        setLoading(false);
    };

    const handleViewCompanyDetails = async (tenant: any) => {
        setSelectedCompany(tenant);
        setLoadingDetails(true);

        try {
            // Fetch employees
            const employees = await getEmployeesByTenant(tenant.id);
            setCompanyEmployees(employees);

            // Fetch payroll for current month
            const now = new Date();
            const payroll = await getMonthlyPayrollData(tenant.id, now.getFullYear(), now.getMonth() + 1);
            setCompanyPayroll(payroll);
        } catch (error) {
            console.error("Error fetching company details:", error);
        }

        setLoadingDetails(false);
    };

    const handleGenerate = async () => {
        setLoading(true);
        await generateActivationCode();
        await fetchData();
        setLoading(false);
    };

    const handleRenew = async (tenantId: string) => {
        setRenewingId(tenantId);
        await renewTenant(tenantId);
        await fetchData();
        setRenewingId(null);
    };

    const handleLogout = async () => {
        await signOut(auth);
        router.push("/admin-login");
    };

    const isCodeExpired = (code: any): boolean => {
        if (!code.expiresAt) return false;
        const expiresAt = code.expiresAt?.toDate?.() || new Date(code.expiresAt);
        return new Date() > expiresAt;
    };

    const isTenantExpired = (tenant: any): boolean => {
        if (!tenant.activatedAt) return false;
        const activatedAt = tenant.activatedAt?.toDate?.() || new Date(tenant.activatedAt);
        const expiresAt = new Date(activatedAt.getTime() + 30 * 24 * 60 * 60 * 1000);
        return new Date() > expiresAt;
    };

    const getExpiryDate = (tenant: any): string => {
        if (!tenant.activatedAt) return "غير مفعل";
        const activatedAt = tenant.activatedAt?.toDate?.() || new Date(tenant.activatedAt);
        const expiresAt = new Date(activatedAt.getTime() + 30 * 24 * 60 * 60 * 1000);
        return expiresAt.toLocaleDateString('ar-SA');
    };

    const getDaysRemaining = (tenant: any): number => {
        if (!tenant.activatedAt) return 0;
        const activatedAt = tenant.activatedAt?.toDate?.() || new Date(tenant.activatedAt);
        const expiresAt = new Date(activatedAt.getTime() + 30 * 24 * 60 * 60 * 1000);
        const diff = expiresAt.getTime() - new Date().getTime();
        return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    };

    const totalPayroll = companyPayroll.reduce((sum, emp) => sum + (emp.totalSalary || 0), 0);
    const totalHours = companyPayroll.reduce((sum, emp) => sum + (emp.hoursWorked || 0), 0);

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-slate-950 p-6 flex flex-col">
                <div className="flex items-center gap-3 mb-10">
                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2 rounded-lg">
                        <ShieldAlert className="h-6 w-6 text-white" />
                    </div>
                    <span className="font-black text-xl tracking-tight">المدير العام</span>
                </div>

                <nav className="flex-1 space-y-2">
                    <button
                        onClick={() => setActiveTab('codes')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'codes'
                            ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                            : 'hover:bg-slate-800 text-slate-400'
                            }`}
                    >
                        <Ticket className="h-5 w-5" />
                        <span>أكواد التفعيل</span>
                        <span className="mr-auto text-xs bg-slate-700 px-2 py-0.5 rounded-full">{codes.length}</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('companies')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'companies'
                            ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                            : 'hover:bg-slate-800 text-slate-400'
                            }`}
                    >
                        <Building2 className="h-5 w-5" />
                        <span>الشركات المسجلة</span>
                        <span className="mr-auto text-xs bg-slate-700 px-2 py-0.5 rounded-full">{tenants.length}</span>
                    </button>
                </nav>

                <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-red-400 transition-colors">
                    <LogOut className="h-5 w-5" />
                    <span>تسجيل الخروج</span>
                </button>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-10 overflow-auto">
                {activeTab === 'codes' && (
                    <>
                        <header className="flex justify-between items-center mb-10">
                            <div>
                                <h2 className="text-3xl font-bold">إدارة أكواد التفعيل</h2>
                                <p className="text-slate-400">كل كود صالح لمدة 30 يوم من تاريخ الاستخدام</p>
                            </div>
                            <button
                                onClick={handleGenerate}
                                disabled={loading}
                                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50 flex items-center gap-2"
                            >
                                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : <Plus className="h-5 w-5" />}
                                توليد كود جديد
                            </button>
                        </header>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {codes.length === 0 ? (
                                <div className="col-span-full text-center py-20 text-slate-500">
                                    <Ticket className="h-16 w-16 mx-auto mb-4 opacity-30" />
                                    <p>لا توجد أكواد حتى الآن</p>
                                </div>
                            ) : (
                                codes.map((code, i) => (
                                    <div key={i} className={`bg-slate-800 border rounded-2xl p-6 ${isCodeExpired(code) ? 'border-red-500/30' : code.used ? 'border-yellow-500/30' : 'border-green-500/30'
                                        }`}>
                                        <p className="text-xs text-indigo-400 font-bold mb-1">كود التفعيل</p>
                                        <p className="text-2xl font-mono font-black text-white mb-3">{code.id}</p>
                                        <div className="flex items-center justify-between">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${isCodeExpired(code)
                                                ? 'bg-red-500/20 text-red-400'
                                                : code.used
                                                    ? 'bg-yellow-500/20 text-yellow-400'
                                                    : 'bg-green-500/20 text-green-400'
                                                }`}>
                                                {isCodeExpired(code) ? 'منتهي' : code.used ? 'مستخدم' : 'صالح'}
                                            </span>
                                            <span className="text-xs text-slate-500">30 يوم</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </>
                )}

                {activeTab === 'companies' && (
                    <>
                        <header className="flex justify-between items-center mb-10">
                            <div>
                                <h2 className="text-3xl font-bold">الشركات المسجلة</h2>
                                <p className="text-slate-400">اضغط على "عرض التفاصيل" لمشاهدة الموظفين والرواتب</p>
                            </div>
                            <button onClick={fetchData} className="text-slate-400 hover:text-white flex items-center gap-2">
                                <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                                تحديث
                            </button>
                        </header>

                        {tenantsWithStats.length === 0 ? (
                            <div className="text-center py-20 text-slate-500">
                                <Building2 className="h-16 w-16 mx-auto mb-4 opacity-30" />
                                <p>لا توجد شركات مسجلة</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {tenantsWithStats.map((tenant, i) => {
                                    const expired = isTenantExpired(tenant);
                                    const daysRemaining = getDaysRemaining(tenant);

                                    return (
                                        <div key={i} className={`bg-slate-800 border rounded-2xl p-6 ${expired ? 'border-red-500/30' : 'border-slate-700'
                                            }`}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${expired ? 'bg-red-500/20' : 'bg-indigo-500/20'
                                                        }`}>
                                                        <Building2 className={`h-7 w-7 ${expired ? 'text-red-400' : 'text-indigo-400'}`} />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-xl">{tenant.name || tenant.id}</h3>
                                                        <p className="text-slate-400 text-sm">{tenant.id}</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-8">
                                                    {/* Employee Count */}
                                                    <div className="text-center">
                                                        <div className="flex items-center gap-2 text-slate-400 mb-1">
                                                            <Users className="h-4 w-4" />
                                                            <span className="text-xs">الموظفين</span>
                                                        </div>
                                                        <p className="text-2xl font-bold text-white">{tenant.employeeCount || 0}</p>
                                                    </div>

                                                    {/* Days Remaining */}
                                                    <div className="text-center">
                                                        <p className="text-xs text-slate-400 mb-1">المتبقي</p>
                                                        <p className={`text-2xl font-bold ${expired ? 'text-red-400' : daysRemaining <= 7 ? 'text-yellow-400' : 'text-green-400'
                                                            }`}>
                                                            {expired ? '0' : daysRemaining} يوم
                                                        </p>
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleViewCompanyDetails(tenant)}
                                                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm flex items-center gap-2"
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                            عرض التفاصيل
                                                        </button>
                                                        <button
                                                            onClick={() => handleRenew(tenant.id)}
                                                            disabled={renewingId === tenant.id}
                                                            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold text-sm flex items-center gap-2"
                                                        >
                                                            {renewingId === tenant.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
                                                            تجديد
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}
            </main>

            {/* Company Details Modal */}
            {selectedCompany && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-slate-700 flex items-center justify-between">
                            <div>
                                <h3 className="text-2xl font-bold">{selectedCompany.name || selectedCompany.id}</h3>
                                <p className="text-slate-400">تفاصيل الشركة والموظفين</p>
                            </div>
                            <button onClick={() => setSelectedCompany(null)} className="text-slate-400 hover:text-white">
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        {loadingDetails ? (
                            <div className="p-20 text-center">
                                <Loader2 className="h-10 w-10 animate-spin mx-auto text-indigo-400" />
                                <p className="mt-4 text-slate-400">جاري تحميل البيانات...</p>
                            </div>
                        ) : (
                            <div className="p-6 overflow-auto max-h-[calc(90vh-100px)]">
                                {/* Stats Cards */}
                                <div className="grid grid-cols-3 gap-4 mb-8">
                                    <div className="bg-slate-700/50 rounded-xl p-4">
                                        <div className="flex items-center gap-3 mb-2">
                                            <Users className="h-5 w-5 text-indigo-400" />
                                            <span className="text-slate-400 text-sm">عدد الموظفين</span>
                                        </div>
                                        <p className="text-3xl font-bold">{companyEmployees.length}</p>
                                    </div>
                                    <div className="bg-slate-700/50 rounded-xl p-4">
                                        <div className="flex items-center gap-3 mb-2">
                                            <Clock className="h-5 w-5 text-green-400" />
                                            <span className="text-slate-400 text-sm">إجمالي الساعات (هذا الشهر)</span>
                                        </div>
                                        <p className="text-3xl font-bold">{totalHours.toFixed(1)}</p>
                                    </div>
                                    <div className="bg-slate-700/50 rounded-xl p-4">
                                        <div className="flex items-center gap-3 mb-2">
                                            <DollarSign className="h-5 w-5 text-yellow-400" />
                                            <span className="text-slate-400 text-sm">إجمالي الرواتب (هذا الشهر)</span>
                                        </div>
                                        <p className="text-3xl font-bold">{totalPayroll.toFixed(2)} ج.م</p>
                                    </div>
                                </div>

                                {/* Employees Table */}
                                <h4 className="font-bold text-lg mb-4 flex items-center gap-2">
                                    <Users className="h-5 w-5 text-indigo-400" />
                                    قائمة الموظفين والرواتب
                                </h4>

                                {companyPayroll.length === 0 ? (
                                    <div className="text-center py-10 text-slate-500">
                                        <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                                        <p>لا يوجد موظفين في هذه الشركة</p>
                                    </div>
                                ) : (
                                    <div className="bg-slate-900 rounded-xl overflow-hidden">
                                        <table className="w-full">
                                            <thead className="bg-slate-800">
                                                <tr>
                                                    <th className="text-right py-3 px-4 text-slate-400 font-medium">الموظف</th>
                                                    <th className="text-right py-3 px-4 text-slate-400 font-medium">البريد</th>
                                                    <th className="text-center py-3 px-4 text-slate-400 font-medium">سعر الساعة</th>
                                                    <th className="text-center py-3 px-4 text-slate-400 font-medium">ساعات العمل</th>
                                                    <th className="text-center py-3 px-4 text-slate-400 font-medium">الراتب</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {companyPayroll.map((emp, i) => (
                                                    <tr key={i} className="border-t border-slate-800">
                                                        <td className="py-3 px-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 bg-indigo-500/20 rounded-full flex items-center justify-center text-indigo-400 font-bold text-sm">
                                                                    {emp.name?.charAt(0) || '?'}
                                                                </div>
                                                                <span className="font-medium">{emp.name}</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-4 text-slate-400 text-sm" dir="ltr">{emp.email}</td>
                                                        <td className="py-3 px-4 text-center">{emp.hourlyRate} ج.م</td>
                                                        <td className="py-3 px-4 text-center text-green-400">{emp.hoursWorked?.toFixed(1) || 0}</td>
                                                        <td className="py-3 px-4 text-center font-bold text-yellow-400">{emp.totalSalary?.toFixed(2) || 0} ج.م</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot className="bg-slate-800">
                                                <tr>
                                                    <td colSpan={3} className="py-3 px-4 font-bold">الإجمالي</td>
                                                    <td className="py-3 px-4 text-center font-bold text-green-400">{totalHours.toFixed(1)}</td>
                                                    <td className="py-3 px-4 text-center font-bold text-yellow-400">{totalPayroll.toFixed(2)} ج.م</td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
