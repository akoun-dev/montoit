import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    screens: {
      'xs': '480px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
    extend: {
      fontFamily: {
        'poppins': ['Poppins', 'sans-serif'],
        'inter': ['Inter', 'sans-serif'],
        'sans': ['Inter', 'system-ui', 'sans-serif'],
      },
    colors: {
      border: "hsl(var(--border))",
      input: "hsl(var(--input))",
      ring: "hsl(var(--ring))",
      background: "hsl(var(--background))",
      foreground: "hsl(var(--foreground))",
      // Palette immobilière professionnelle
      primary: {
        50: "hsl(var(--primary-50))",
        100: "hsl(var(--primary-100))",
        DEFAULT: "hsl(var(--primary))",
        500: "hsl(var(--primary-500))",
        700: "hsl(var(--primary-700))",
        900: "hsl(var(--primary-900))",
        foreground: "hsl(var(--primary-foreground))",
        glow: "hsl(var(--primary-glow))",
      },
      secondary: {
        50: "hsl(var(--secondary-50))",
        100: "hsl(var(--secondary-100))",
        DEFAULT: "hsl(var(--secondary))",
        500: "hsl(var(--secondary-500))",
        700: "hsl(var(--secondary-700))",
        900: "hsl(var(--secondary-900))",
        foreground: "hsl(var(--secondary-foreground))",
      },
      // Statut avec nouvelle couleur "negotiation"
      negotiation: {
        DEFAULT: "hsl(var(--status-warning))",
        foreground: "hsl(var(--status-warning-foreground))",
      },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
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
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        "status-success": "hsl(var(--status-success))",
        "status-success-foreground": "hsl(var(--status-success-foreground))",
        "status-warning": "hsl(var(--status-warning))",
        "status-warning-foreground": "hsl(var(--status-warning-foreground))",
        "status-danger": "hsl(var(--status-danger))",
        "status-danger-foreground": "hsl(var(--status-danger-foreground))",
        "status-info": "hsl(var(--status-info))",
        "status-info-foreground": "hsl(var(--status-info-foreground))",
        "status-neutral": "hsl(var(--status-neutral))",
        "status-neutral-foreground": "hsl(var(--status-neutral-foreground))",

        // CÔTE D'IVOIRE CULTURAL PALETTE
        "ivory-orange": "hsl(var(--ivory-orange))",
        "ivory-white": "hsl(var(--ivory-white))",
        "ivory-green": "hsl(var(--ivory-green))",
        "ivory-coast-gold": "hsl(var(--ivory-coast-gold))",
        "lagoon-blue": "hsl(var(--lagoon-blue))",
        "tropical-green": "hsl(var(--tropical-green))",
        "terracotta": "hsl(var(--terracotta))",
        "bogolan-brown": "hsl(var(--bogolan-brown))",
        "sand-light": "hsl(var(--sand-light))",
        "sand": "hsl(var(--sand))",
        "sand-dark": "hsl(var(--sand-dark))",
        "sunset-orange": "hsl(var(--sunset-orange))",
        "tropical-teal": "hsl(var(--tropical-teal))",

        // Property Status Colors
        "status-available": "hsl(var(--status-available))",
        "status-pending": "hsl(var(--status-pending))",
        "status-rented": "hsl(var(--status-rented))",
        "status-negotiating": "hsl(var(--status-negotiating))",
      },
      backgroundImage: {
        'gradient-primary': 'var(--gradient-primary)',
        'gradient-secondary': 'var(--gradient-secondary)',
        'gradient-hero': 'var(--gradient-hero)',
        'gradient-card': 'var(--gradient-card)',
        'gradient-mesh': 'var(--gradient-mesh)',
        'gradient-section-primary': 'var(--gradient-section-primary)',
        'gradient-section-secondary': 'var(--gradient-section-secondary)',
        // Cultural Gradients
        'gradient-lagoon': 'var(--gradient-lagoon)',
        'gradient-sunset': 'var(--gradient-sunset)',
        'gradient-forest': 'var(--gradient-forest)',
        'gradient-kente': 'var(--gradient-kente)',
      },
      boxShadow: {
        'primary': 'var(--shadow-primary)',
        'card': 'var(--shadow-card)',
        'soft': 'var(--shadow-soft)',
        'glass': 'var(--shadow-glass)',
        'elevated': 'var(--shadow-elevated)',
        // Elevation System
        'elevation-1': 'var(--elevation-1)',
        'elevation-2': 'var(--elevation-2)',
        'elevation-3': 'var(--elevation-3)',
        'elevation-4': 'var(--elevation-4)',
        'elevation-5': 'var(--elevation-5)',
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
        // Enhanced Transition Timing
        'fast': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'normal': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'slow': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      transitionDuration: {
        'fast': 'var(--transition-fast)',
        'normal': 'var(--transition-normal)',
        'slow': 'var(--transition-slow)',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        // Enhanced Border Radius System
        'xs': 'var(--radius-xs)',
        '4': 'var(--radius-sm)',
        '12': 'var(--radius-md)',
        '16': 'var(--radius-lg)',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-20px)" },
        },
        "float-slow": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-30px)" },
        },
        "float-fast": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-15px)" },
        },
        "float-delayed": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-30px)" },
        },
        "pulse-slow": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        "pulse-fast": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.8" },
        },
        "shimmer": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        "shine": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        "badge-appear": {
          "0%": { opacity: "0", transform: "scale(0.8)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "gradient-shift": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        "gradient": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-slow": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-fast": {
          "0%": { opacity: "0", transform: "translateY(5px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-out": {
          "0%": { opacity: "1", transform: "translateY(0)" },
          "100%": { opacity: "0", transform: "translateY(10px)" },
        },
        "scale-in": {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "scale-out": {
          "0%": { transform: "scale(1)", opacity: "1" },
          "100%": { transform: "scale(0.95)", opacity: "0" },
        },
        "slide-in-right": {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" },
        },
        "slide-up": {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
      animation: {
        "badge-appear": "badge-appear 0.3s ease-out",
        "pulse-soft": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "float": "float 6s ease-in-out infinite",
        "float-slow": "float-slow 8s ease-in-out infinite",
        "float-fast": "float-fast 4s ease-in-out infinite",
        "float-delayed": "float-delayed 8s ease-in-out infinite 1s",
        "pulse-slow": "pulse-slow 3s ease-in-out infinite",
        "pulse-fast": "pulse-fast 1s ease-in-out infinite",
        "shimmer": "shimmer 2s infinite",
        "shine": "shine 2s ease-in-out infinite",
        "gradient-shift": "gradient-shift 15s ease infinite",
        "fade-in": "fade-in 0.3s ease-out",
        "fade-in-slow": "fade-in-slow 0.6s ease-out",
        "fade-in-fast": "fade-in-fast 0.15s ease-out",
        "fade-out": "fade-out 0.3s ease-out",
        "scale-in": "scale-in 0.2s ease-out",
        "scale-out": "scale-out 0.2s ease-out",
        "slide-in-right": "slide-in-right 0.3s ease-out",
        "slide-up": "slide-up 0.4s ease-out",
        "gradient": "gradient 3s ease infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
