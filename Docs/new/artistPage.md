# Artist Component

## Purpose
Displays an artist's profile page including their bio, featured tracks, discography, and upcoming events.

## State Management
- **`artist` (object):** Artist profile data including:
  - `email`
  - `_id`
  - `artistTitle`
  - `bio`
  - `profileImageUrl`
  - `bannerImageUrl`
- **`featured` (array):** Featured tracks
- **`tab` (number):** Current tab selection (0: Albums, 1: Videos, 2: Audio)
- **`contents` (array):** Content based on selected tab

## URL Parameters
- **`id`**: Artist identifier from URL query parameter

## API Integration
### 1. Artist Profile
- **GET:** `${BASE_URL}/api/getUserProfileById/${artistId}`

### 2. Content Fetching
- **Albums:** `${BASE_URL}/api/getAlbumsByArtist?artistId=${artist.email}`
- **Content:** `${BASE_URL}/api/getAllContent?type=${type}`
- **Featured:** `${BASE_URL}/api/getFeaturedByArtist?artistId=${artist.email}`

## Layout Sections
### 1. Header Banner
- **Elements:**
  - Cover image with overlay
  - Profile picture
  - Artist name and follower count
  - Share and follow buttons

### 2. Bio Section
- **Elements:**
  - Artist biography
  - Play/Shuffle controls
  - Thanks giving feature

### 3. Featured Tracks
- **Track list includes:**
  - Play button
  - Thumbnail
  - Title
  - Duration
  - Like button

### 4. Discography
- **Tab navigation:** Albums/Videos/Audio
- **SwipeComponent:** Content display

### 5. Events
- **Component:** Upcoming events in `SwipeEventComponent`

## Components Used
- **`BackButton`**: Navigation
- **`PlayButton`**: Track playback
- **`ThanksGivingPopup`**: Gratitude feature
- **`SwipeComponent`**: Content display
- **`SwipeEventComponent`**: Events display

## Responsive Design
### Breakpoints
- **1000px:** Adjusts container height
- **767px:** Mobile layout
  - Repositions profile elements
  - Modifies header structure
  - Adjusts music info layout
- **575px:** Small mobile adjustments
  - Text size modifications
  - Button size adjustments

## Styling Features
- Gradient overlays on images
- Responsive image handling
- Flex layouts
- Hover states on tracks
- Custom button styling

## Error Handling
- Console logging for failed requests
- Fallback images for missing media
- Try-catch blocks for API calls

## Data Flow
1. Fetch artist profile on mount.
2. Load events and featured content when artist data arrives.
3. Update content based on tab selection.

## Dependencies
- `react`
- `styled-components`
- `axios`
- `swiper`
- Various SVG assets
