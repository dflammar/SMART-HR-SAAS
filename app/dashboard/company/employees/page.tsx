"use client";

import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { getUserProfile, getEmployeesByTenant, addEmployee, updateEmployee, deleteEmployee } from "@/lib/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import { Users, Plus, Edit2, Trash2, X, Loader2, ArrowRight } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import Link from "next/link";

export default function EmployeesPage() {
    const [profile, setProfile] = useState<any>(null);
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<any>(null);
    const router = useRouter();

    // Form state
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        hourlyRate: "",
    });

    useEffect(() => {
        const fetchData = async () => {
            if (auth.currentUser) {
                const userProfile = await getUserProfile(auth.currentUser.uid);
                if (userProfile?.role !== 'company_manager') {
                    router.push("/login");
                    return;
                }

                // Check subscription status
                if (userProfile.tenantId) {
                    const tenantDoc = await getDoc(doc(db, "tenants", userProfile.tenantId));
                    if (tenantDoc.exists()) {
                        const tenantData = tenantDoc.data();
                        if (!tenantData.isActive) {
                            router.push("/dashboard/company");
                            return;
                        }
                        // Check 30-day expiry
                        if (tenantData.activatedAt) {
                            const activatedAt = tenantData.activatedAt?.toDate?.() || new Date(tenantData.activatedAt);
                            const expiresAt = new Date(activatedAt.getTime() + 30 * 24 * 60 * 60 * 1000);
                            if (new Date() > expiresAt) {
                                router.push("/dashboard/company");
                                return;
                            }
                        } else {
                            router.push("/dashboard/company");
                            return;
                        }
                    } else {
                        router.push("/dashboard/company");
                        return;
                    }
                }

                setProfile(userProfile);
                loadEmployees(userProfile.tenantId!);
            } else {
                router.push("/login");
            }
        };
        fetchData();
    }, [router]);

    const loadEmployees = async (tenantId: string) => {
        const emps = await getEmployeesByTenant(tenantId);
        setEmployees(emps.filter((e: any) => !e.isDeleted));
    };

    const handleOpenModal = (employee?: any) => {
        if (employee) {
            setEditingEmployee(employee);
            setFormData({
                name: employee.name,
                email: employee.email,
                password: "",
                hourlyRate: employee.hourlyRate?.toString() || "",
            });
        } else {
            setEditingEmployee(null);
            setFormData({ name: "", email: "", password: "", hourlyRate: "" });
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingEmployee(null);
        setFormData({ name: "", email: "", password: "", hourlyRate: "" });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (editingEmployee) {
                // Update existing employee
                await updateEmployee(editingEmployee.uid, {
                    name: formData.name,
                    hourlyRate: parseFloat(formData.hourlyRate),
                });
            } else {
                // Create new employee
                const tempAuth = auth;
                const userCredential = await createUserWithEmailAndPassword(
                    tempAuth,
                    formData.email,
                    formData.password
                );

                await addEmployee(profile.tenantId!, {
                    uid: userCredential.user.uid,
                    name: formData.name,
                    email: formData.email,
                    hourlyRate: parseFloat(formData.hourlyRate),
                });
            }

            await loadEmployees(profile.tenantId!);
            handleCloseModal();
        } catch (error: any) {
            alert("خطأ: " + (error.message || "حدث خطأ أثناء العملية"));
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (uid: string) => {
        if (!confirm("هل أنت متأكد من حذف هذا الموظف؟")) return;

        setLoading(true);
        try {
            await deleteEmployee(uid);
            await loadEmployees(profile.tenantId!);
        } catch (error) {
            alert("حدث خطأ أثناء الحذف");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <nav className="bg-primary text-white p-4 shadow-lg">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard/company" className="text-slate-300 hover:text-white transition-colors">
                            <ArrowRight className="h-6 w-6" />
                        </Link>
                        <h1 className="text-xl font-bold">إدارة الموظفين</h1>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto p-6">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-3xl font-bold text-slate-900">قائمة الموظفين</h2>
                        <p className="text-slate-500 mt-1">إدارة فريق العمل وتحديد الرواتب</p>
                    </div>
                    <button
                        onClick={() => handleOpenModal()}
                        className="btn-primary py-3 px-6 shadow-xl shadow-indigo-500/20"
                    >
                        <Plus className="h-5 w-5" />
                        إضافة موظف جديد
                    </button>
                </div>

                {/* Employees Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {employees.map((employee) => (
                        <div key={employee.uid} className="card relative group hover:shadow-lg transition-shadow">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="h-12 w-12 bg-indigo-100 rounded-full flex items-center justify-center">
                                        <span className="text-indigo-600 font-bold text-lg">
                                            {employee.name[0]}
                                        </span>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900">{employee.name}</h3>
                                        <p className="text-sm text-slate-500">{employee.email}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2 mb-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-500">الأجر بالساعة:</span>
                                    <span className="font-bold text-indigo-600">{employee.hourlyRate} ج.م</span>
                                </div>
                            </div>

                            <div className="flex gap-2 pt-4 border-t border-slate-100">
                                <button
                                    onClick={() => handleOpenModal(employee)}
                                    className="flex-1 btn-secondary py-2 text-sm"
                                >
                                    <Edit2 className="h-4 w-4" />
                                    تعديل
                                </button>
                                <button
                                    onClick={() => handleDelete(employee.uid)}
                                    className="flex-1 border border-red-200 text-red-600 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors flex items-center justify-center gap-2 text-sm"
                                >
                                    <Trash2 className="h-4 w-4" />
                                    حذف
                                </button>
                            </div>
                        </div>
                    ))}

                    {employees.length === 0 && (
                        <div className="col-span-full text-center py-16">
                            <Users className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-slate-400 mb-2">لا يوجد موظفين بعد</h3>
                            <p className="text-slate-400 mb-6">ابدأ بإضافة أول موظف في فريقك</p>
                            <button
                                onClick={() => handleOpenModal()}
                                className="btn-primary py-3 px-6"
                            >
                                <Plus className="h-5 w-5" />
                                إضافة موظف
                            </button>
                        </div>
                    )}
                </div>
            </main>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
                        <div className="flex justify-between items-center p-6 border-b border-slate-100">
                            <h3 className="text-xl font-bold text-slate-900">
                                {editingEmployee ? "تعديل بيانات الموظف" : "إضافة موظف جديد"}
                            </h3>
                            <button
                                onClick={handleCloseModal}
                                className="text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    اسم الموظف
                                </label>
                                <input
                                    type="text"
                                    required
                                    className="input-field"
                                    placeholder="محمد أحمد"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    البريد الإلكتروني
                                </label>
                                <input
                                    type="email"
                                    required
                                    disabled={!!editingEmployee}
                                    className="input-field disabled:bg-slate-100 disabled:text-slate-500"
                                    placeholder="employee@company.com"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>

                            {!editingEmployee && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        كلمة المرور
                                    </label>
                                    <input
                                        type="password"
                                        required={!editingEmployee}
                                        className="input-field"
                                        placeholder="••••••••"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    الأجر بالساعة (ج.م)
                                </label>
                                <input
                                    type="number"
                                    required
                                    step="0.01"
                                    min="0"
                                    className="input-field"
                                    placeholder="50"
                                    value={formData.hourlyRate}
                                    onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="flex-1 btn-secondary py-3"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 btn-primary py-3"
                                >
                                    {loading ? (
                                        <Loader2 className="animate-spin h-5 w-5" />
                                    ) : editingEmployee ? (
                                        "حفظ التعديلات"
                                    ) : (
                                        "إضافة الموظف"
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
