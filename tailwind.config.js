/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                dark: {
                    50: '#f9fafb',
                    100: '#f3f4f6',
                    200: '#e5e7eb',
                    300: '#d1d5db',
                    400: '#9ca3af',
                    500: '#6b7280',
                    600: '#4b5563',
                    700: '#374151',
                    800: '#1f2937',
                    850: '#17202f',
                    900: '#111827',
                    950: '#07101a',
                },
                accent: {
                    green: '#00e5a0',
                    red: '#ff4d6d',
                    blue: '#3b82f6',
                    yellow: '#f59e0b',
                    purple: '#a78bfa',
                },
            },
            backgroundColor: {
                'base': 'var(--color-bg-base)',
                'secondary': 'var(--color-bg-secondary)',
                'tertiary': 'var(--color-bg-tertiary)',
            },
            textColor: {
                'primary': 'var(--color-text-primary)',
                'secondary': 'var(--color-text-secondary)',
                'tertiary': 'var(--color-text-tertiary)',
            },
            borderColor: {
                'DEFAULT': 'var(--color-border)',
                'secondary': 'var(--color-border-secondary)',
            },
        },
    },
    plugins: [],
}
