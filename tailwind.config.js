/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: "#1e293b",
                accent: "#4f46e5",
            },
            fontFamily: {
                arabic: ["var(--font-cairo)", "sans-serif"],
            },
        },
    },
    plugins: [],
};
