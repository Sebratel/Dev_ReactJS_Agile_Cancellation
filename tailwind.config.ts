import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: 'hsl(var(--card))',
        primary: 'hsl(var(--primary))',
        success: 'hsl(var(--success))',
        warning: 'hsl(var(--warning))',
        danger: 'hsl(var(--danger))',
        neutral: 'hsl(var(--neutral))',
        border: 'hsl(var(--border))',
        muted: 'hsl(var(--muted))',
        'login-surface': 'hsl(var(--login-surface))',
        'login-ink': 'hsl(var(--login-ink))',
        'login-muted': 'hsl(var(--login-muted))',
        'login-faint': 'hsl(var(--login-faint))',
        'login-line': 'hsl(var(--login-line))',
        'login-dark': 'hsl(var(--login-dark))',
      },
      fontFamily: {
        sans: ['"DM Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        // Escala de elevação — Level 1 (superfície) ao Level 4 (modal)
        card: '0 1px 2px rgba(17, 17, 17, 0.04), 0 4px 16px rgba(17, 17, 17, 0.05)',
        'card-hover':
          '0 2px 4px rgba(17, 17, 17, 0.05), 0 8px 24px rgba(17, 17, 17, 0.08)',
        floating:
          '0 4px 12px rgba(17, 17, 17, 0.08), 0 12px 32px rgba(17, 17, 17, 0.1)',
        modal:
          '0 8px 24px rgba(17, 17, 17, 0.1), 0 24px 64px rgba(17, 17, 17, 0.14)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-out': {
          from: { opacity: '1' },
          to: { opacity: '0' },
        },
        'dialog-in': {
          from: {
            opacity: '0',
            transform: 'translate(-50%, -50%) scale(0.96)',
          },
          to: { opacity: '1', transform: 'translate(-50%, -50%) scale(1)' },
        },
        'dialog-out': {
          from: { opacity: '1', transform: 'translate(-50%, -50%) scale(1)' },
          to: { opacity: '0', transform: 'translate(-50%, -50%) scale(0.96)' },
        },
        'drawer-in-left': {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'translateX(0)' },
        },
        'drawer-out-left': {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-100%)' },
        },
        'highlight-pulse': {
          '0%': { backgroundColor: 'hsl(var(--primary) / 0.12)' },
          '100%': { backgroundColor: 'transparent' },
        },
        'rise-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'rise-in-md': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'grow-x': {
          from: { transform: 'scaleX(0)' },
          to: { transform: 'scaleX(1)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-out',
        'fade-out': 'fade-out 120ms ease-in',
        'dialog-in': 'dialog-in 180ms cubic-bezier(0.16, 1, 0.3, 1)',
        'dialog-out': 'dialog-out 120ms ease-in',
        'drawer-in-left': 'drawer-in-left 250ms cubic-bezier(0.16, 1, 0.3, 1)',
        'drawer-out-left': 'drawer-out-left 200ms ease-in',
        'highlight-pulse': 'highlight-pulse 1.2s ease-out',
        'rise-in': 'rise-in 200ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'rise-in-md': 'rise-in-md 280ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'scale-in': 'scale-in 180ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'grow-x': 'grow-x 600ms cubic-bezier(0.16, 1, 0.3, 1) both',
      },
    },
  },
  plugins: [],
};

export default config;
