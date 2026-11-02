/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        /* === COULEURS SHADCN/UI === */
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          50: 'var(--color-primary-50)',
          100: 'var(--color-primary-100)',
          500: 'var(--color-primary-500)',
          600: 'var(--color-primary-600)',
          700: 'var(--color-primary-700)',
          900: 'var(--color-primary-900)',
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
        /* === COULEURS NEUTRES MON TOIT === */
        neutral: {
          50: 'var(--color-neutral-50)',
          100: 'var(--color-neutral-100)',
          200: 'var(--color-neutral-200)',
          500: 'var(--color-neutral-500)',
          700: 'var(--color-neutral-700)',
          900: 'var(--color-neutral-900)',
        },
        /* === COULEURS SÉMANTIQUES === */
        semantic: {
          success: 'var(--color-semantic-success)',
          error: 'var(--color-semantic-error)',
          warning: 'var(--color-semantic-warning)',
          info: 'var(--color-semantic-info)',
        },
        
        // Couleurs sémantiques pour messages et états
        terracotta: {
          50: '#fff9f7',
          100: '#fef0eb',
          200: '#fddfd6',
          300: '#fbc4b5',
          400: '#f79f88',
          500: '#f2785c',
          600: '#e55a3d',
          700: '#c94729',
          800: '#a63c24',
          900: '#8a3523',
          950: '#4b190e',
        },
        amber: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          950: '#451a03',
        },
        olive: {
          50: '#f6f7f4',
          100: '#e3e6dd',
          200: '#c7ccbc',
          300: '#a5ad94',
          400: '#868f70',
          500: '#6b7557',
          600: '#535d44',
          700: '#424938',
          800: '#373d30',
          900: '#2f342a',
          950: '#181b15',
        },
        coral: {
          50: '#fff7f5',
          100: '#ffebe8',
          200: '#ffd6cf',
          300: '#ffb8ab',
          400: '#ff9079',
          500: '#ff6b4a',
          600: '#ff4520',
          700: '#e63510',
          800: '#c02d0f',
          900: '#9e2b13',
          950: '#561207',
        },
        cyan: {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
          950: '#083344',
        },
      },
      fontSize: {
        // Tailles selon spécifications Modern Minimalism Premium
        'xs': ['0.75rem', { lineHeight: '1.4', letterSpacing: '0.01em' }],     // 12px - Metadata timestamps
        'sm': ['0.875rem', { lineHeight: '1.5', letterSpacing: '0' }],         // 14px - Labels helper text captions  
        'body': ['1rem', { lineHeight: '1.5', letterSpacing: '0' }],           // 16px - Texte standard BASE
        'body-lg': ['1.125rem', { lineHeight: '1.6', letterSpacing: '0' }],    // 18px - Intro paragraphes descriptions
        'h3': ['1.5rem', { lineHeight: '1.3', letterSpacing: '0' }],           // 24px - Card titles subsections
        'h2': ['2rem', { lineHeight: '1.3', letterSpacing: '0' }],             // 32px - Section headers dashboard
        'h1': ['3rem', { lineHeight: '1.2', letterSpacing: '-0.01em' }],       // 48px - Titres pages principales
        'hero': ['4rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],     // 64px - Hero homepage uniquement
        
        // Tailles Tailwind standard pour compatibilité
        'xs-tailwind': ['0.75rem', { lineHeight: '1.5' }],
        'sm-tailwind': ['0.875rem', { lineHeight: '1.5' }],
        'base-tailwind': ['1rem', { lineHeight: '1.5' }],
        'lg-tailwind': ['1.125rem', { lineHeight: '1.5' }],
        'xl': ['1.25rem', { lineHeight: '1.4' }],
        '2xl': ['1.5rem', { lineHeight: '1.3' }],
        '3xl': ['1.875rem', { lineHeight: '1.2' }],
        '4xl': ['2.25rem', { lineHeight: '1.2' }],
        '5xl': ['3rem', { lineHeight: '1.1' }],
        '6xl': ['3.75rem', { lineHeight: '1' }],
        '7xl': ['4.5rem', { lineHeight: '1' }],
      },
      fontFamily: {
        display: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        body: ['system-ui', '-apple-system', 'sans-serif'],
      },
      spacing: {
        // Système d'espacement 8pt selon design premium
        '1': '4px',     // 4px - micro
        '2': '8px',     // 8px - inline icon+text  
        '3': '12px',    // 12px - petit group
        '4': '16px',    // 16px - elements proches form fields
        '6': '24px',    // 24px - groupes reliés gap grids
        '8': '32px',    // 32px - Card padding MINIMUM
        '12': '48px',   // 48px - Card padding premium section interne
        '16': '64px',   // 64px - Espacement ENTRE SECTIONS standard
        '18': '4.5rem',
        '24': '96px',   // 96px - Hero section padding sections majeures
        '32': '128px',  // 128px - Espacement dramatique rare
        '88': '22rem',
        '128': '32rem',
      },
      animation: {
        'float': 'float 3s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-down': 'slideDown 0.5s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'bounce-subtle': 'bounceSubtle 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        // Animations Carousel Premium
        'carousel-in': 'carouselIn 1200ms cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards',
        'carousel-out': 'carouselOut 800ms cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards',
        'gradient': 'gradient 3s ease infinite',
        'pulse-slow': 'pulseSlow 4s ease-in-out infinite',
        'bounce-slow': 'bounceSlow 3s ease-in-out infinite',
        // Stories-style fill progress
        'fill-progress': 'fillProgress 5s linear forwards',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(255, 86, 51, 0.5), 0 0 10px rgba(255, 86, 51, 0.3)' },
          '100%': { boxShadow: '0 0 20px rgba(255, 86, 51, 0.8), 0 0 30px rgba(255, 86, 51, 0.5)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        // Keyframes Carousel Premium
        carouselIn: {
          '0%': { opacity: '0', transform: 'scale(1.05)', filter: 'grayscale(100%)' },
          '100%': { opacity: '1', transform: 'scale(1)', filter: 'grayscale(0%)' },
        },
        carouselOut: {
          '0%': { opacity: '1', transform: 'scale(1)', filter: 'grayscale(0%)' },
          '100%': { opacity: '0', transform: 'scale(0.98)', filter: 'grayscale(100%)' },
        },
        gradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        pulseSlow: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        bounceSlow: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        // Stories-style fill progress animation
        fillProgress: {
          '0%': { width: '0%' },
          '100%': { width: '100%' },
        },
      },
      borderRadius: {
        // Modernité douce selon design premium
        'md': '12px',    // Boutons inputs STANDARD
        'lg': '16px',    // Cards
        'xl': '24px',    // Modals drawers
        'full': '9999px', // Avatars pills circulaires
        
        // Standard Tailwind pour compatibilité
        'none': '0px',
        'sm': '4px',
        'base': '6px',
        '2xl': '16px',
        '3xl': '24px',
      },
      boxShadow: {
        // Ombres selon spécifications Modern Minimalism Premium
        'sm': '0 1px 2px rgba(0, 0, 0, 0.06)',
        'base': '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
        'md': '0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.06)',
        'lg': '0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)',
        'focus': '0 0 0 3px rgba(255, 108, 47, 0.15)',
        'glow': '0 0 15px rgba(255, 86, 51, 0.5)',
        'glow-lg': '0 0 30px rgba(255, 86, 51, 0.6)',
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      },
    },
  },
  plugins: [],
};
