import plugin from 'tailwindcss/plugin'

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './src/app/**/*.{js,ts,jsx,tsx}',
        './src/components/**/*.{js,ts,jsx,tsx}',
        './src/hooks/**/*.{js,ts,jsx,tsx}',
    ],
    theme: {
        extend: {
            // any custom colors, spacing, etc.
        },
    },
    plugins: [
        // add any official or 3rd‑party plugins here
        plugin(({ addVariant }) => {
            addVariant('dark', 'html.dark &')
        })
    ],
}
