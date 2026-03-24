/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#00fff2',
        'primary-dim': 'rgba(0, 255, 242, 0.25)',
        'primary-glow': 'rgba(0, 255, 242, 0.5)',
        amber: '#ff9500',
        'amber-dim': 'rgba(255, 149, 0, 0.25)',
        danger: '#ff3d3d',
        'danger-dim': 'rgba(255, 61, 61, 0.25)',
        'bg-deep': '#030308',
        'bg-panel': '#0a0a12',
        'bg-panel-hover': '#12121a',
        border: '#1a1a2e',
        text: '#e0e0e0',
        'text-dim': '#808090',
      },
      fontFamily: {
        orbitron: ['Orbitron', 'sans-serif'],
        mono: ['Share Tech Mono', 'monospace'],
      },
      boxShadow: {
        'glow-primary': '0 0 20px rgba(0, 255, 242, 0.5), 0 0 40px rgba(0, 255, 242, 0.25)',
        'glow-amber': '0 0 20px rgba(255, 149, 0, 0.5), 0 0 40px rgba(255, 149, 0, 0.25)',
        'glow-danger': '0 0 20px rgba(255, 61, 61, 0.5), 0 0 40px rgba(255, 61, 61, 0.25)',
      },
    },
  },
  plugins: [],
}