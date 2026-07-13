/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      "colors": {
              "secondary": "#c8c6c8",
              "status-critical": "#EF4444",
              "tertiary-fixed": "#e4e1e5",
              "inverse-primary": "#5d5f5f",
              "surface-container-high": "#2a2a2a",
              "secondary-fixed-dim": "#c8c6c8",
              "primary-container": "#e2e2e2",
              "primary-fixed-dim": "#c6c6c7",
              "surface-variant": "#353535",
              "surface-container": "#1f1f1f",
              "on-tertiary": "#303033",
              "on-primary-container": "#636565",
              "status-warning": "#FFB800",
              "on-primary": "#2f3131",
              "text-main": "#FAFAFA",
              "surface": "#131313",
              "on-error-container": "#ffdad6",
              "on-tertiary-fixed-variant": "#47464a",
              "on-tertiary-container": "#656467",
              "outline-variant": "#444748",
              "error-container": "#93000a",
              "text-dim": "#64748B",
              "on-secondary-fixed-variant": "#474649",
              "primary-fixed": "#e2e2e2",
              "inverse-on-surface": "#303030",
              "on-primary-fixed": "#1a1c1c",
              "on-surface-variant": "#c4c7c8",
              "surface-container-highest": "#353535",
              "surface-container-lowest": "#0e0e0e",
              "panel-border": "#27272A",
              "inverse-surface": "#e2e2e2",
              "secondary-fixed": "#e5e1e4",
              "on-surface": "#e2e2e2",
              "surface-bright": "#393939",
              "on-primary-fixed-variant": "#454747",
              "tertiary-fixed-dim": "#c8c6c9",
              "primary": "#ffffff",
              "on-secondary-container": "#b7b4b7",
              "on-secondary": "#313032",
              "error": "#ffb4ab",
              "on-tertiary-fixed": "#1b1b1e",
              "surface-container-low": "#1b1b1b",
              "on-background": "#e2e2e2",
              "surface-tint": "#c6c6c7",
              "secondary-container": "#474649",
              "tertiary": "#ffffff",
              "text-muted": "#A1A1AA",
              "background": "#131313",
              "outline": "#8e9192",
              "on-error": "#690005",
              "tertiary-container": "#e4e1e5",
              "on-secondary-fixed": "#1c1b1d",
              "surface-dim": "#131313"
      },
      "borderRadius": {
              "DEFAULT": "0.125rem",
              "lg": "0.25rem",
              "xl": "0.5rem",
              "full": "0.75rem"
      },
      "spacing": {
              "margin-desktop": "24px",
              "lg": "24px",
              "gutter": "24px",
              "xs": "4px",
              "xl": "32px",
              "margin-mobile": "16px",
              "sm": "8px",
              "unit": "4px",
              "md": "16px"
      },
      "fontFamily": {
              "display-lg": [
                      "Oswald"
              ],
              "headline-md": [
                      "IBM Plex Sans"
              ],
              "body-base": [
                      "IBM Plex Sans"
              ],
              "label-caps": [
                      "JetBrains Mono"
              ],
              "stat-lg-mobile": [
                      "JetBrains Mono"
              ],
              "stat-lg": [
                      "JetBrains Mono"
              ],
              "body-bold": [
                      "IBM Plex Sans"
              ]
      },
      "fontSize": {
              "display-lg": [
                      "24px",
                      {
                              "lineHeight": "32px",
                              "letterSpacing": "-0.01em",
                              "fontWeight": "700"
                      }
              ],
              "headline-md": [
                      "18px",
                      {
                              "lineHeight": "24px",
                              "letterSpacing": "-0.01em",
                              "fontWeight": "600"
                      }
              ],
              "body-base": [
                      "12px",
                      {
                              "lineHeight": "18px",
                              "letterSpacing": "0",
                              "fontWeight": "400"
                      }
              ],
              "label-caps": [
                      "11px",
                      {
                              "lineHeight": "16px",
                              "letterSpacing": "0.05em",
                              "fontWeight": "600"
                      }
              ],
              "stat-lg-mobile": [
                      "12px",
                      {
                              "lineHeight": "18px",
                              "letterSpacing": "0",
                              "fontWeight": "600"
                      }
              ],
              "stat-lg": [
                      "14px",
                      {
                              "lineHeight": "20px",
                              "letterSpacing": "0",
                              "fontWeight": "600"
                      }
              ],
              "body-bold": [
                      "12px",
                      {
                              "lineHeight": "18px",
                              "letterSpacing": "0",
                              "fontWeight": "600"
                      }
              ]
      }
    },
  },
  plugins: [],
}
