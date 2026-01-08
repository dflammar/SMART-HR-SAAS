"use client";

import { useEffect, useState } from "react";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function SetupAdmin() {
    const [status, setStatus] = useState("Initializing...");
    const router = useRouter();

    useEffect(() => {
        const createAdmin = async () => {
            const email = "h@admin.com";
            const password = "Ammar4455##"; // Hardcoded for setup only

            try {
                setStatus("Attempting to create admin account...");

                // 1. Try to create the user
                try {
                    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                    setStatus("Account created! Setting up profile...");

                    // 2. Set profile in Firestore
                    await setDoc(doc(db, "users", userCredential.user.uid), {
                        uid: userCredential.user.uid,
                        email: email,
                        name: "Super Admin",
                        role: 'super_admin',
                        createdAt: serverTimestamp(),
                    });

                    setStatus("Success! Redirecting to dashboard...");
                    setTimeout(() => router.push("/dashboard/admin"), 1500);

                } catch (createError: any) {
                    if (createError.code === 'auth/email-already-in-use') {
                        setStatus("Account exists. Logging in...");

                        // If user exists, login and ensure role is set
                        const loginCredential = await signInWithEmailAndPassword(auth, email, password);

                        setStatus("Logged in. Updating role...");
                        await setDoc(doc(db, "users", loginCredential.user.uid), {
                            uid: loginCredential.user.uid,
                            email: email,
                            name: "Super Admin",
                            role: 'super_admin',
                            updatedAt: serverTimestamp(), // Only update role
                        }, { merge: true });

                        setStatus("Role updated! Redirecting...");
                        setTimeout(() => router.push("/dashboard/admin"), 1500);
                    } else {
                        throw createError;
                    }
                }

            } catch (error: any) {
                console.error("Setup failed:", error);
                setStatus(`Error: ${error.message}`);
            }
        };

        createAdmin();
    }, [router]);

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-900 text-white p-4">
            <h1 className="text-2xl font-bold mb-4">Admin Setup</h1>
            <div className="p-4 bg-slate-800 rounded-lg border border-slate-700 max-w-md w-full text-center">
                <p className={status.includes("Error") ? "text-red-400" : "text-green-400"}>
                    {status}
                </p>
            </div>
        </div>
    );
}
