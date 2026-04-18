# NEXUS 60-30-10 Color System Guide

## Color Philosophy
The NEXUS platform uses the 60-30-10 color rule for optimal visual hierarchy and user experience:

- **60% Neutral (White)**: Primary backgrounds, main content areas
- **30% Secondary (Off-white/Light Gray)**: Text, surfaces, cards, borders
- **10% Accent (Green)**: Call-to-action buttons, success states, highlights

## Color Palette

### 60% Neutral Colors (White Base)
```css
--color-neutral-white: #FFFFFF    /* Primary backgrounds */
--color-neutral-50: #FEFEFE       /* Subtle variations */
--color-neutral-100: #FDFDFD      /* Light variations */
```

**Usage:**
- Main page backgrounds
- Card backgrounds
- Modal backgrounds
- Primary content areas

### 30% Secondary Colors (Off-white/Light Gray)
```css
--color-secondary-50: #FAFAFA     /* Lightest surfaces */
--color-secondary-100: #F5F5F5    /* Card surfaces */
--color-secondary-200: #EEEEEE    /* Subtle borders */
--color-secondary-300: #E0E0E0    /* Light borders */
--color-secondary-500: #9E9E9E    /* Secondary text */
--color-secondary-600: #757575    /* Body text */
--color-secondary-700: #616161    /* Headings */
--color-secondary-800: #424242    /* Dark text */
--color-secondary-900: #212121    /* Primary text */
```

**Usage:**
- Text content (all weights)
- Navigation elements
- Borders and dividers
- Secondary surfaces
- Form elements

### 10% Accent Colors (Green)
```css
--color-accent-50: #F0FDF4        /* Light backgrounds */
--color-accent-100: #DCFCE7       /* Success backgrounds */
--color-accent-200: #BBF7D0       /* Light success */
--color-accent-500: #22C55E       /* Primary green */
--color-accent-600: #16A34A       /* Primary buttons */
--color-accent-700: #15803D       /* Hover states */
```

**Usage:**
- Primary buttons
- Success indicators
- Active states
- Skill offer badges
- Online status indicators
- Completion states

## Implementation Examples

### Buttons
```jsx
// Primary button (10% Accent)
<button className="bg-accent-600 text-neutral-white hover:bg-accent-700">
  Apply Now
</button>

// Secondary button (30% Secondary)
<button className="bg-secondary-100 text-secondary-700 hover:bg-secondary-200">
  Cancel
</button>
```

### Cards
```jsx
// Card with proper color distribution
<div className="bg-neutral-white border border-secondary-200 rounded-xl p-6">
  <h3 className="text-secondary-900 font-semibold">Card Title</h3>
  <p className="text-secondary-600">Card description text</p>
  <span className="bg-accent-50 text-accent-700 px-3 py-1 rounded-full">
    Success Badge
  </span>
</div>
```

### Navigation
```jsx
// Navigation with proper hierarchy
<nav className="bg-neutral-white border-b border-secondary-200">
  <a className="text-secondary-500 hover:text-secondary-700">Inactive Link</a>
  <a className="text-secondary-900 font-semibold">Active Link</a>
</nav>
```

## Tailwind Class Mapping

### Replace Old Classes With New:
- `bg-blue-600` → `bg-accent-600`
- `text-gray-800` → `text-secondary-800`
- `bg-gray-100` → `bg-secondary-100`
- `border-gray-200` → `border-secondary-200`
- `bg-green-50` → `bg-accent-50`
- `text-green-700` → `text-accent-700`

## Component-Specific Usage

### Skill Cards
- Background: `bg-neutral-white` (60%)
- Text: `text-secondary-600` (30%)
- Offer badges: `bg-accent-50 text-accent-700` (10%)

### Dashboard
- Page background: `bg-neutral-white` (60%)
- Card surfaces: `bg-neutral-white border-secondary-100` (60% + 30%)
- Stats and highlights: `text-accent-600` (10%)

### Forms
- Input backgrounds: `bg-neutral-white` (60%)
- Borders: `border-secondary-200` (30%)
- Focus states: `focus:border-accent-500` (10%)

## Dark Mode Considerations
The color system adapts for dark mode while maintaining the same proportional usage:
- Neutral becomes dark backgrounds
- Secondary becomes light text on dark
- Accent remains consistent for brand recognition
