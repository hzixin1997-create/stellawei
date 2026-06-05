/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // 新克制配色
        'sw-bg': '#FFFFFF',
        'sw-cream': '#FAF7F2',
        'sw-surface': '#F5F3EF',
        'sw-text': '#1A1A2E',
        'sw-text-secondary': '#6B6B7B',
        'sw-accent': '#6B46C1',
        'sw-accent-soft': '#EDE9F6',
        'sw-gold': '#C9A84C',
        'sw-gold-soft': '#FDF6E3',
        stellawei: {
          purple: '#6B46C1',
          'purple-dark': '#553C9A',
          'purple-light': '#9F7AEA',
          gold: '#D4AF37',
          'gold-light': '#F4D03F',
          cream: '#FAF7F0',
          'cream-dark': '#F0E6D3',
        },
        // 保留chuhai别名以兼容旧代码
        chuhai: {
          purple: '#6B46C1',
          'purple-dark': '#553C9A',
          'purple-light': '#9F7AEA',
          gold: '#D4AF37',
          'gold-light': '#F4D03F',
          cream: '#FAF7F0',
          'cream-dark': '#F0E6D3',
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        serif: ['Playfair Display', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'stellawei-gradient': 'linear-gradient(135deg, #6B46C1 0%, #9F7AEA 50%, #D4AF37 100%)',
        'chuhai-gradient': 'linear-gradient(135deg, #6B46C1 0%, #9F7AEA 50%, #D4AF37 100%)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}
