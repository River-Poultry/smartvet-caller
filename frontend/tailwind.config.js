/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        sv: {
          // SmartVet emergency red
          red:          '#dc2626',
          'red-d':      '#b91c1c',
          'red-l':      '#fee2e2',

          // SmartVet primary green — matches smartvet.africa exactly
          green:        '#16a34a',   // green-600  (buttons, active states)
          'green-d':    '#15803d',   // green-700  (hover)
          'green-dd':   '#166534',   // green-800  (headings, sidebar)
          'green-l':    '#dcfce7',   // green-100  (light chips, tints)

          // Medical teal (AI / diagnosis)
          teal:         '#0d9488',   // teal-600
          'teal-d':     '#0f766e',   // teal-700
          'teal-l':     '#ccfbf1',   // teal-100

          // Amber (warnings)
          amber:        '#d97706',   // amber-600
          'amber-d':    '#b45309',   // amber-700
          'amber-l':    '#fef3c7',   // amber-100

          // Backgrounds — driven by CSS vars at runtime, these are dark-mode fallbacks
          bg:           '#0f172a',   // slate-900
          'bg-card':    '#1e293b',   // slate-800
          'bg-input':   '#334155',   // slate-700
          border:       '#475569',   // slate-600
          'border-l':   '#64748b',   // slate-500

          // Text
          'text-muted': '#94a3b8',   // slate-400 — WCAG AA on slate-900

          // Semantic aliases
          page:         '#0f172a',
          card:         '#1e293b',
          input:        '#334155',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontWeight: {
        display: '800',
      },
      borderRadius: {
        pill: '9999px',
      },
      boxShadow: {
        'sv-glow': '0 0 20px rgba(22,163,74,0.25)',
        'sv-red':  '0 0 20px rgba(220,38,38,0.25)',
        'sv-teal': '0 0 16px rgba(13,148,136,0.25)',
      },
    },
  },
  plugins: [],
};
