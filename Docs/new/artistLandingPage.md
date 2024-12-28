# ArtistLandingPage Component

## Purpose
Landing page designed for artists to join the Sacred Sound platform.

## Structure

### 1. Hero Banner Section
- **Elements:**
  - White logo overlay
  - "Join the Collective" headline
  - CTA button linking to artist signup

### 2. Introduction Section
- **Elements:**
  - Platform description text
  - Explainer video

### 3. Cloud Studio Section
- **Features:**
  - Green background panel
  - Three key value propositions:
    1. Revenue streams from content
    2. Intimate listener connections
    3. Professional studio support

### 4. Features Section
- **Headline:** "Let's Create Magic Together"
- **Content:**
  - Three feature cards:
    1. Artist Collective membership
    2. Content publishing
    3. Studio support
  - CTA button for signup

### 5. FAQ Section
- **Component:** Imported `FAQsContainer`

## Navigation
- **Primary CTA:** `/artistSignup`
- **Secondary CTA:** `/signup?artist=true`

## Responsive Breakpoints

### Mobile (768px)
- Stacks all sections vertically
- Reduces text sizes
- Adjusts banner height

### Tablet (1100px)
- Adjusts text sizes

### Desktop (1300px)
- Full layout

## Visual Elements
- **Background Image:** Hosted on Firebase Storage
- **Icons:**
  - `userGroup.png`
  - `musicNote.png`
  - `heart-new.png`
- **Logo:** `logo-white.png`
- **Video:** `Sacred-Sound-Explainer-Video.mp4`

## Styling
- **Font Families:** "Playfair Display" for headlines
- **Brand Colors:**
  - Green: `#A3C4A3` (Cloud Studio section)
  - Dividers: `#D9D9D9`

## Dependencies
- `styled-components`
- `react-router-dom` (useNavigate)
- `FAQsContainer` component
