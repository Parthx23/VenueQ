# Design System: Teal Obsidian

### 1. Overview & Creative North Star
**Creative North Star: "The Intelligent Concierge"**
Teal Obsidian is a design system built for high-stakes, real-time environments where clarity is paramount but aesthetic sophistication is mandatory. It rejects the generic "SaaS dashboard" look in favor of an editorial, mission-critical interface. By combining a deep, authoritative teal with warm, paper-like neutrals, the system creates a sense of "Precision Warmth." It uses a bento-style information architecture and intentional density to provide a cockpit-like experience that feels both powerful and approachable.

### 2. Colors
The palette is rooted in a rich "Obsidian Teal" (#01696f) and anchored by a range of sophisticated architectural greys.

*   **Primary & Functional:** The primary teal is used for action and identity. Tertiary tones (warm sienna) are reserved for status alerts and secondary highlights.
*   **The "No-Line" Rule:** Sectioning is achieved through color-blocking and background shifts. Avoid 1px solid borders across the full width of containers. Instead, use background transitions between `surface-container` and `surface-container-low` to define layout areas.
*   **Surface Hierarchy & Nesting:** Use `surface-container-lowest` (#ffffff) for card interiors to make data "pop," while using `surface-container` (#eeede8) for the global navigation or background canvas.
*   **The "Glass & Gradient" Rule:** Floating action bars and mobile navigations must use `glass-panel` styling: `rgba(244, 242, 238, 0.7)` with a `16px` backdrop blur to maintain context of the content beneath.
*   **Signature Textures:** Implement 5% opacity primary color gradients as overlays in alert banners to create a "scanning" or "live" visual effect.

### 3. Typography
The system uses a high-contrast pairing of **Manrope** for structural headings and **Inter** for data-heavy body text.

*   **Typography Scale (Calibrated):**
    *   **Display/Hero:** 1.5rem (24px) Manrope Bold — Used for welcome headers.
    *   **Sub-Headline:** 1.25rem (20px) Manrope ExtraBold — Used for secondary sections.
    *   **Data Points:** 1.125rem (18px) Manrope Bold — Used for key metrics (e.g., Gate/Section).
    *   **Body Standard:** 0.875rem (14px) Inter — Primary reading size.
    *   **Caption/Label:** 0.75rem (12px) Inter Bold All-Caps — Used for metadata and category tags.
    *   **Micro-Nav:** 10px Inter ExtraBold — Used for mobile bottom navigation labels.

The typographic rhythm relies on heavy tracking-tight (negative letter spacing) for headings to give them an "editorial" punch, contrasted with wide tracking for all-caps labels.

### 4. Elevation & Depth
Teal Obsidian favors **Tonal Layering** over physical shadows to represent hierarchy.

*   **The Layering Principle:** Depth is created by placing light elements (`surface-container-lowest`) on top of darker backgrounds (`surface-container`).
*   **Ambient Shadows:** When shadows are required for elevation (e.g., floating cards), use the `shadow-sm` profile: a very subtle, wide-spread shadow with low opacity (approx. 6% black) to prevent the UI from feeling "heavy."
*   **The "Ghost Border" Fallback:** Use `outline-variant` (#bfc8ca) at 30% opacity for card boundaries. This provides a "suggestion" of a container without creating a rigid grid line.
*   **Glassmorphism:** Apply a `-webkit-backdrop-filter: blur(16px)` to any element that floats over scrollable content.

### 5. Components
*   **Bento Buttons:** Large, square or rectangular buttons with `0.5rem` (xl) rounded corners. They should feature a centered icon in a circular `surface-container` housing.
*   **Live Alerts:** Full-width banners using `primary-container` with a 40% opacity. Include a subtle horizontal gradient to signify "Live" status.
*   **Status Indicators:** Use 4px wide vertical accent bars on the left side of list items to indicate category (e.g., Teal for Primary, Sienna for Secondary).
*   **Bottom Nav:** Mobile navigation uses a high-blur glass effect with active states highlighted by a `primary/10` background pill shape.

### 6. Do's and Don'ts
*   **Do:** Use uppercase labels with increased letter spacing for all category headings.
*   **Do:** Mix font weights (e.g., Black for titles, Medium for body) to create a clear scan-path.
*   **Don't:** Use pure black (#000000) for text; use `on-surface` (#28251d) to maintain the "warm paper" feel.
*   **Don't:** Apply heavy shadows; if a component doesn't stand out through color contrast, reconsider its placement in the surface hierarchy.
*   **Do:** Ensure all interactive elements have a minimum touch target of 44px, even if the visual representation is smaller.