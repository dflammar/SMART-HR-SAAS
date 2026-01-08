"use client";

import { useEffect } from "react";
import { auth } from "@/lib/firebase";
import { getUserProfile } from "@/lib/firestore";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
    const router = useRouter();

    useEffect(() => {
        const redirectUser = async () => {
            if (!auth.currentUser) {
                router.push("/login");
                return;
            }

            const profile = await getUserProfile(auth.currentUser.uid);

            if (!profile) {
                router.push("/login");
                return;
            }

            // Redirect based on role
            switch (profile.role) {
                case 'super_admin':
                    router.push("/dashboard/admin");
                    break;
                case 'company_manager':
                    router.push("/dashboard/company");
                    break;
                case 'employee':
                    router.push("/dashboard/employee");
                    break;
                default:
                    router.push("/login");
            }
        };

        redirectUser();
    }, [router]);

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="text-center">
                <div className="animate-spin h-12 w-12 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-slate-600">جاري التحميل...</p>
            </div>
        </div>
    );
}
