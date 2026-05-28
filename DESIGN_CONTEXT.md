# Design Context — Espot

**Last Updated:** May 28, 2026  
**Scope:** Espot marketplace for event spaces in Dominican Republic

---

## Design Context

### Users
- **Marketplace clients** (25-45 years old, middle-upper class): Search, compare, and book event spaces with confidence. They need to verify spaces are real, see authentic reviews, and pay securely.
- **Space owners/hosts**: Publish spaces professionally and manage bookings with ease. They need clean, functional dashboards without clutter.
- **Context**: Dominican Republic—local event culture, preference for clarity over decoration, mobile usage significant but desktop-focused for booking.

### Brand Personality
**Trustworthy • Professional • Local-First**

Espot transmits marketplace confidence (like Airbnb/Booking.com) but designed specifically for Dominican Republic. Not overly playful, not corporate—balanced between approachable and credible. The brand says: "This is real, safe, and made for your celebration."

### Aesthetic Direction
**Minimalist Refined**

- Clean white backgrounds with green (#35C493) accent restraint—meaningful, not decorative
- Typography: Display font (TypoGraphica) for headlines only; Poppins (medium 500, light 300) for UI
- No gradients except for brand accent in hero headline
- Subtle shadows: only where hierarchy demands (cards on hover, modals)
- Whitespace as primary design tool—generous gaps between sections
- Dark overlays on hero only; elsewhere: white/light backgrounds for clarity

### Design Principles

1. **Data over ornament** — Every element must serve information hierarchy. No decorative icons above headings, no icons that don't clarify content.

2. **Marketplace confidence** — Visual weight, legibility, and verification signals (badges, trust icons, real photos) matter more than aesthetic surprises. Convey safety and authenticity.

3. **Mobile-first adaptation** — White backgrounds, 16px minimum input font size (prevents iOS Safari zoom), clear touch targets. Don't hide functionality on small screens—adapt the interface.

4. **Coherent color language** — Brand green (#35C493) is used for: CTAs, icons in active states, hover states, accent in hero. Never decorative. Navy (#03313C) for dark text. No secondary colors except carefully tinted grays.

5. **Motion: state change only** — Animations reveal entrances (fade-in on scroll), hover transitions, loading states. No continuous animations, no bouncing/elastic easing. Exponential easing (ease-out) for natural deceleration.

---

## Technical Foundation

### Stack
- **Framework:** Next.js 16, React 19, TypeScript 5
- **Styling:** Tailwind CSS v4 (utility-first) + CSS variables for theming
- **Colors:** CSS variables in `globals.css` (light-theme, white-theme, host-theme, dark-theme)
- **Typography:** Poppins (Google Fonts) + TypoGraphica (commercial, installed in `/public/fonts/`)

### Themes
| Theme | Use | Background | Text | Context |
|-------|-----|-----------|------|---------|
| `.light-theme` | Homepage hero | #F4F6F5 (light grey) | #03313C (navy) | Marketplace homepage |
| `.white-theme` | Search, dashboard (client) | #FFFFFF (pure white) | #111827 (dark) | Clarity-focused pages |
| `.host-theme` | Host dashboard | #FFFFFF (pure white) | #111827 (dark) | Host operations |
| `.dark-theme` | Reserved (not active) | #0B0F0E | #F0FDF9 | Future: client dashboard dark mode |

### Brand Colors
- **`--brand`:** #35C493 (Verde marca) — Primary CTA, active states, accents
- **`--brand-dark`:** #28A87C — Hover states on brand buttons
- **`--brand-navy`:** #03313C — Dark text, headers, dominates dark overlays
- **`--brand-lime`:** #D4FF58 — Reserved for future use (not in production)

### Typography Scale
| Class | Size | Use |
|-------|------|-----|
| `text-xs` | 12px | Labels, metadata, small UI |
| `text-sm` | 14px | Body copy, descriptions |
| `text-base` | 16px | Primary body text (MINIMUM in inputs) |
| `text-lg` | 18px | Subtitles |
| `text-xl` | 20px | Section headings |
| `text-2xl+` | 24px+ | Page headlines, hero display |

**Critical Rule:** All `<input>` and `<textarea>` MUST have `fontSize: 16px` to prevent auto-zoom on iOS Safari.

---

## Visual Refinements Made (May 28, 2026)

### 1. Hero Section (HeroParallax)
✅ **Changes:**
- Added badge: "+250 espacios verificados" (trust signal—small, green-tinted)
- Enlarged headline typography: `clamp(2.2rem, 6vw, 4rem)` (was 3.5rem max)
- Improved gradient overlay opacity for better text contrast
- Staggered fade-in animations on load (badge → headline → subtitle → search bar)
- Refined subtitle color contrast (opacity 0.50 from 0.45)

### 2. Trust Signals Section (New Component)
✅ **Added:**
- Horizontal section between hero and categories
- Three signals: Lock icon (Secure payments) | Users icon (Verified reviews) | Checkmark (Authentic spaces)
- Subtle border-top/border-bottom separators
- Animated entrance on scroll (staggered per signal)
- Refined spacing: responsive gaps, centered layout

### 3. Category Tiles (HomepageSections)
✅ **Changes:**
- Increased section padding: `py-16 md:py-24` (was py-14 md:py-20)
- Improved grid gaps: `gap-3 md:gap-4` (was gap-2 md:gap-3)
- Refined shadows: `0 2px 6px rgba(0,0,0,0.05)` (was 0 1px 4px)
- Enhanced hover state: 
  - Lift on hover: `translateY(-6px) scale(1.02)` (was -4px, no scale)
  - Hover shadow: `0 12px 32px rgba(53,196,147,0.15)` (brighter, more prominent)
  - Hover background: subtle green tint (#F8FFFE)
- Icon background: bigger and more prominent on hover
- Typography refinement: headline size increased `1.8rem, 5vw, 2.5rem` (was 1.6rem, 4vw, 2.25rem)
- Added subtle subtitle below headline: "Salones, rooftops, restaurantes, villas y mucho más"

### 4. Easing & Motion
✅ **Applied:**
- All animations use exponential easing: `cubic-bezier(0.22, 1, 0.36, 1)` for landing, `ease-out` for natural deceleration
- Transition times: 0.25s for hover interactions (fast feedback), 0.6-0.8s for entrance animations (perceptible but not slow)
- No bounce or elastic easing anywhere

---

## Component Library & Patterns

### Card Hover States
```
Default shadow: 0 2px 6px rgba(0,0,0,0.05)
Hover shadow:   0 12px 32px rgba(53,196,147,0.15)
Border:         Subtle grey → brand green on hover
Background:     #fff → #F8FFFE (subtle tint)
```

### Button Hierarchy
| Type | Style | Use |
|------|-------|-----|
| Primary (`.btn-brand`) | Green bg, white text, subtle lift on hover | Main CTAs |
| Secondary (`.btn-outline`) | Green border, navy text | Alternative actions |
| Tertiary | Text link (color: var(--text-secondary)) | Less prominent paths |

### Spacing System (from Tailwind)
- `p-3` = 12px | `p-4` = 16px | `p-5` = 20px | `p-6` = 24px
- Sections: `py-14` (56px), `py-16` (64px), `py-20` (80px), `py-24` (96px)
- Gaps: `gap-2` = 8px, `gap-3` = 12px, `gap-4` = 16px, `gap-6` = 24px

---

## Anti-Patterns (What NOT to Do)

❌ **Hardcoded colors:** Never use `#35C493` directly—always use `var(--brand)`  
❌ **Gradient text for metrics:** Only use in hero accent, never on data values  
❌ **Nested cards:** Avoid container within container—flatten visual hierarchy  
❌ **Identical card grids:** Vary card sizes, layouts, and emphasis  
❌ **Glassmorphism/blur effects:** Only use dark overlay on video backgrounds; elsewhere use solid colors  
❌ **Input font size < 16px:** Causes iOS Safari zoom—always `fontSize: 16`  
❌ **Animate width/height/padding:** Use `transform: scale()` and `opacity` only; never animate layout properties  
❌ **Monospace typography as "developer feel":** Only for actual code/terminal output, never as UI stylization  

---

## Future Design Intentions

### Dark Mode Client Dashboard (Not Active)
- `.dark-theme` CSS already defined but not in use
- Future: Client dashboard will have dark background (#0B0F0E) with light text
- Green accent remains consistent

### TypoGraphica Installation
- Commercial display font currently loads as fallback to Poppins
- When installed in `/public/fonts/`, CSS `@font-face` will activate in `globals.css`
- Use on headlines only (h1, h2 in hero and sections)
- Never use on body text or small UI

### Accessibility Enhancements
- [ ] Ensure all text meets WCAG AA contrast minimums
- [ ] Test reduced-motion: `@media (prefers-reduced-motion)` should disable staggered animations
- [ ] Focus states on all interactive elements (currently relying on browser defaults)
- [ ] Test with screen readers (especially marketplace structure)

---

## Design Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-05-28 | Add trust badge to hero | Marketplace confidence signal; addresses "Is this real?" concern |
| 2026-05-28 | Enlarge hero headline | Better mobile readability; matches homepage scale expectations |
| 2026-05-28 | Add TrustSignals section | Explicit verification messaging (payments, reviews, authenticity) |
| 2026-05-28 | Increase category padding | Breathing room; reduces visual density; improves mobile touch targets |
| 2026-05-28 | Refine hover shadows | Depth cue without decorative excess; green tint maintains brand consistency |

---

## Implementation Checklist

- [x] HeroParallax updated with badge + animations
- [x] TrustSignals component created
- [x] Homepage includes TrustSignals between hero and categories
- [x] HomepageSections category spacing refined
- [x] Box shadows updated across grid components
- [x] Typography scales refreshed
- [ ] Test on mobile (iOS Safari, Android Chrome)
- [ ] Verify TypoGraphica loads when installed
- [ ] Test reduced-motion preferences
- [ ] Accessibility audit (WCAG AA)

---

## Resources

- **Vision:** `/docs/vision.md` — Market positioning, competitive advantages
- **UX Guidelines:** `/docs/ux-guidelines.md` — Color palettes, theme variables, typography rules
- **Brand Logo:** `/public/logo-green.svg` (dark bg) | `/public/logo-dark.svg` (light bg)
- **Fonts:** Poppins (Google Fonts) + TypoGraphica (commercial, `/public/fonts/typographica.*`)
