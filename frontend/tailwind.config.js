/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        sv: {
          // ── Primary brand green (matches smartvet.africa logo) ──────────
          // green-700 (#15803d) = primary CTAs, active nav, selected states
          // green-800 (#166534) = hover on primary buttons
          // green-50 / green-200 = tints and borders in components
          green:        '#16a34a',   // green-600  — secondary active badges
          'green-d':    '#15803d',   // green-700  — PRIMARY buttons & nav
          'green-dd':   '#166534',   // green-800  — hover / headings
          'green-l':    '#dcfce7',   // green-100  — light chips / tints

          // ── Teal — AI / medical accent only ─────────────────────────────
          // Use exclusively for AI diagnosis, transcript, medical icons.
          // NOT for general CTAs — those must use the primary green.
          teal:         '#0d9488',   // teal-600
          'teal-d':     '#0f766e',   // teal-700
          'teal-l':     '#ccfbf1',   // teal-100

          // ── Status / semantic ────────────────────────────────────────────
          red:          '#dc2626',   // red-600   — emergency, errors
          'red-d':      '#b91c1c',   // red-700
          'red-l':      '#fee2e2',   // red-100
          amber:        '#d97706',   // amber-600 — warnings, moderate
          'amber-d':    '#b45309',   // amber-700
          'amber-l':    '#fef3c7',   // amber-100
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
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
