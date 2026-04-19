import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          base:   '#111111',
          card:   '#1c1c1e',
          raised: '#2a2a2e',
          border: '#222222',
          dim:    '#161616',
        },
        accent: {
          DEFAULT: '#f97316',
        },
        muted: '#555555',
        sensor: {
          temp:   '#60a5fa',
          motion: '#4ade80',
          error:  '#f87171',
        },
      },
    },
  },
  plugins: [],
}

export default config
