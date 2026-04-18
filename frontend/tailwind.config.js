/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        'inter': ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // NEXUS Design System Colors
        green: {
          900: '#0D3B22',
          800: '#145A32', 
          700: '#1E8449',
          500: '#27AE60',
          400: '#2ECC71',
          100: '#D5F5E3',
          50: '#F0FBF5',
        },
        
        gray: {
          900: '#1A1A2E',
          700: '#2C2C54',
          500: '#6B7280',
          300: '#D1D5DB',
          100: '#F3F4F6',
        },
        
        white: '#FFFFFF',
        
        // Semantic colors
        success: '#27AE60',
        warning: '#F39C12',
        danger: '#E74C3C',
        info: '#2980B9',
        
        // Keep legacy colors for backward compatibility
        neutral: {
          white: '#FFFFFF',
          50: '#FEFEFE',
          100: '#FDFDFD',
        },
        
        secondary: {
          50: '#FAFAFA',
          100: '#F5F5F5',
          200: '#EEEEEE',
          300: '#E0E0E0',
          400: '#BDBDBD',
          500: '#9E9E9E',
          600: '#757575',
          700: '#616161',
          800: '#424242',
          900: '#212121',
        },
        
        accent: {
          50: '#ECFDF5',
          100: '#D1FAE5',
          200: '#A7F3D0',
          300: '#6EE7B7',
          400: '#34D399',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
          800: '#065F46',
          900: '#064E3B',
        },
      },
      letterSpacing: {
        tighter: '-0.02em',
        tight: '-0.01em',
      },
    },
  },
  plugins: [],
}
