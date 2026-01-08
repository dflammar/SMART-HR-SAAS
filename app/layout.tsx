import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";

const cairo = Cairo({
    subsets: ["arabic"],
    variable: "--font-cairo",
    weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
    title: "ساعة العمل | نظام الحضور والانصراف",
    description: "نظام حضضور وانصراف متقدم للشركات",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="ar" dir="rtl">
            <body
                className={`${cairo.variable} font-arabic antialiased`}
            >
                {children}
            </body>
        </html>
    );
}
