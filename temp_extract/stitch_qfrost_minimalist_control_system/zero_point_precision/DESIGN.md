---
name: Zero-Point Precision
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#393939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1b1b1b'
  surface-container: '#1f1f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353535'
  on-surface: '#e2e2e2'
  on-surface-variant: '#c4c7c8'
  inverse-surface: '#e2e2e2'
  inverse-on-surface: '#303030'
  outline: '#8e9192'
  outline-variant: '#444748'
  surface-tint: '#c6c6c7'
  primary: '#ffffff'
  on-primary: '#2f3131'
  primary-container: '#e2e2e2'
  on-primary-container: '#636565'
  inverse-primary: '#5d5f5f'
  secondary: '#c8c6c8'
  on-secondary: '#313032'
  secondary-container: '#474649'
  on-secondary-container: '#b7b4b7'
  tertiary: '#ffffff'
  on-tertiary: '#303033'
  tertiary-container: '#e4e1e5'
  on-tertiary-container: '#656467'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e2e2e2'
  primary-fixed-dim: '#c6c6c7'
  on-primary-fixed: '#1a1c1c'
  on-primary-fixed-variant: '#454747'
  secondary-fixed: '#e5e1e4'
  secondary-fixed-dim: '#c8c6c8'
  on-secondary-fixed: '#1c1b1d'
  on-secondary-fixed-variant: '#474649'
  tertiary-fixed: '#e4e1e5'
  tertiary-fixed-dim: '#c8c6c9'
  on-tertiary-fixed: '#1b1b1e'
  on-tertiary-fixed-variant: '#47464a'
  background: '#131313'
  on-background: '#e2e2e2'
  surface-variant: '#353535'
  text-main: '#FAFAFA'
  text-muted: '#A1A1AA'
  text-dim: '#64748B'
  status-critical: '#EF4444'
  status-warning: '#FFB800'
  panel-border: '#27272A'
typography:
  display-lg:
    fontFamily: Oswald
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: IBM Plex Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-base:
    fontFamily: IBM Plex Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: '0'
  body-bold:
    fontFamily: IBM Plex Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: '0'
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  stat-lg:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: '0'
  stat-lg-mobile:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: '0'
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 24px
---

## Brand & Style

The design system for this cryogenic control studio is built upon the concept of "Absolute Zero"—a state of total thermal and visual stillness. It evokes the feeling of a high-stakes quantum laboratory where precision is the only currency. The aesthetic is **Industrial Minimalism**: a clinical, high-density environment that prioritizes signal over noise. 

The interface functions as a "High-Precision Tool," avoiding any decorative "UI slob" like glows, soft shadows, or rounded aesthetics. Instead, it utilizes razor-sharp edges, hairline dividers, and a strict monochrome palette to focus the operator's attention on real-time telemetry and hardware state. It is professional, cold, and unyielding, designed for experts who require a sub-nanosecond understanding of their system.

## Colors

The palette is rooted in a "Void" philosophy. The background is a true absolute black (`#000000`), representing the lightless interior of a cryostat.

- **Primary (Polar White):** Used exclusively for high-signal interactions and active states. It demands immediate focus.
- **Secondary (Zinc Black):** Used for bento-style panel surfaces to provide a subtle structural lift from the background void without introducing glow.
- **Neutral (Void):** The base canvas.
- **Semantic Colors:** Reserved strictly for functional status. Red (`#EF4444`) indicates coherence collapse or failure. Yellow-Orange (`#FFB800`) indicates thermal warnings or safety budget violations. Standard "Optimal" states are represented by a pulsing White rather than Green to maintain the monochromatic precision.

## Typography

Typography is used as a mechanical engineering element. We utilize three distinct families:

1. **Oswald (Display):** Used for branding and high-level system headers. Its condensed, tall nature mimics industrial engraving.
2. **IBM Plex Sans (UI):** The workhorse for labels, settings, and general interface text. It provides high legibility at small sizes.
3. **JetBrains Mono (Data):** Used for all numerical telemetry, code snippets, and timestamps. Monospacing is mandatory for data so that shifting values do not cause layout jitter.

**Rule:** All uppercase labels below 12px must use `0.05em` tracking to ensure readability on high-DPI displays.

## Layout & Spacing

This design system uses a **Fixed Grid HUD** model. The interface is composed of modular "Bento" panels stacked over a central 3D viewport.

- **Desktop:** A three-column structure. Left (320px) for code and configuration; Right (260px) for real-time telemetry; Center for the primary visual simulation.
- **Spacing Rhythm:** Based on a strict 4px unit. 16px is the standard internal padding for containers.
- **Dividers:** 1px hairline borders (`#27272A`) are preferred over margins to separate data points, maximizing information density without sacrificing clarity.
- **Breakpoints:** Below 1280px, the sidebar telemetry collapses into a bottom-drawer or vertical stack to preserve the integrity of the monospaced data readouts.

## Elevation & Depth

Hierarchy is achieved through **Tonal Layering** and **Structural Framing**, not shadows.

- **Base Layer:** Pure Black (`#000000`).
- **Surface Layer:** Dark Zinc (`#09090B`) panels.
- **Framing:** Every panel must be framed with a 1px border (`#27272A`). This creates a "physical" sense of containment.
- **Interactions:** Hover states on buttons or interactive rows should utilize a subtle fill increase (e.g., 5% white overlay) or a border color shift to Zinc-700 (`#3F3F46`). 
- **Shadows:** Only a single, sharp, low-opacity black shadow is permitted for floating menus to separate them from the bento panels beneath.

## Shapes

The shape language is rigid and technical. We use **Soft (0.25rem)** roundedness for buttons and control inputs to provide just enough distinction from the strictly sharp-edged layout grid. 

- **Panels:** Use `rounded-sm` (4px) to maintain a professional, machined appearance.
- **Indicators:** Status LEDs and toggle pips are the only circular elements permitted, providing a clear visual distinction between "functional state" and "structural container."

## Components

- **Buttons:** 
    - *Primary:* Solid White background, Black text. Sharp 4px corners. No gradients.
    - *Secondary:* Transparent with 1px border (`#27272A`), White text.
- **Telemetry Cards:** Must include a `label-caps` header followed by a `stat-lg` value. Use hairline dividers to separate multiple metrics within a single card.
- **Control Toggles:** Segmented bars are preferred over checkboxes. The active segment becomes solid White (Primary style), while inactive segments remain part of the panel background.
- **Input Fields:** Dark background (`#000000`) with a 1px border. Focus state is indicated by the border turning solid White.
- **Data Viz:** Charts must use a 1px grid background (`#27272A`). Lines should be stark White or Semantic Red/Yellow. Avoid fills; use line weights and stippling for area distinction.
- **Status LEDs:** Small 8px circles. "Standby" pulses slowly in White; "Fault" is a solid, high-intensity Red.