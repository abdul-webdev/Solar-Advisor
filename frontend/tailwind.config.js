/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#102542',
        navy2: '#183B63',
        primary: '#2563EB',
        primarydark: '#1D4ED8',
        lightblue: '#EFF6FF',
        success: '#16A34A',
        appbg: '#F8FAFC',
        ink: '#102542',
        muted: '#64748B',
        line: '#E2E8F0',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(16,37,66,0.06), 0 1px 2px rgba(16,37,66,0.04)',
      },
    },
  },
  plugins: [],
};
