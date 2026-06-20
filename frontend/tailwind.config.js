/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        sv: {
          // River Poultry brand red-orange (logo bird colour)
          red:          '#e8431a',
          'red-d':      '#c43515',
          'red-l':      '#fde8e2',

          // Agricultural green (positive / available / healthy)
          green:        '#5cb830',
          'green-d':    '#3f8f1e',
          'green-dd':   '#2a6012',
          'green-l':    '#d6f0c2',

          // Medical teal (AI / diagnosis panel)
          teal:         '#3dbfb8',
          'teal-d':     '#2a9993',
          'teal-l':     '#d0f4f2',

          // Amber (warnings / mild alerts)
          amber:        '#f0b429',
          'amber-d':    '#d97706',
          'amber-l':    '#fef3c7',

          // Dark olive backgrounds — River Poultry hero palette
          bg:           '#141c0a',
          'bg-card':    '#1d2810',
          'bg-input':   '#263318',
          border:       '#364826',
          'border-l':   '#445e30',

          // Text
          'text-muted': '#7a9460',

          // Semantic aliases used across components
          'page':       '#141c0a',
          'card':       '#1d2810',
          'input':      '#263318',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontWeight: {
        // River Poultry uses heavy headings
        'display': '800',
      },
      borderRadius: {
        // Pill buttons like River Poultry's SHOP NOW
        'pill': '9999px',
      },
      boxShadow: {
        'sv-glow':  '0 0 20px rgba(92,184,48,0.20)',
        'sv-red':   '0 0 20px rgba(232,67,26,0.25)',
        'sv-teal':  '0 0 16px rgba(61,191,184,0.25)',
      },
    },
  },
  plugins: [],
};
