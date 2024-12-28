# Track Component

## Purpose
Displays detailed information about a single music track, including playback controls and like functionality.

## State Management
- **`track` (object):** Stores track details including:
  - **`title`**: string
  - **`selectedImageThumbnail`**: string (URL)
  - **`fileUrl`**: string
  - **`user`**: `{ accountName: string }`
- **`isLiked` (boolean):** Tracks if the current user has liked the track

## URL Parameters
- **`id`**: Track identifier from URL query parameter

## Authentication
Uses `AuthContext` to access:
- **`userEmail`**: Current user's email for like functionality

## API Integration
### 1. Track Details
- **GET:** `${process.env.REACT_APP_API_BASE_URL}/api/getTrack/${trackId}`
- **Response:** `{ track: TrackObject }`

### 2. Like Status
- **GET:** `${process.env.REACT_APP_API_BASE_URL}/api/getUserLoves?user=${userEmail}`
- **Response:** `{ loves: string[] }`

### 3. Like/Unlike Action
- **PATCH:** `${process.env.REACT_APP_API_BASE_URL}/api/updateUserLoves`
- **Payload:**
  ```json
  {
    "user": "string",
    "videoId": "string",
    "b_isLoving": "boolean"
  }
  ```

## Components Used
- **`BackButton`**: Navigation
- **`PlayButton`**: Track playback control
- **`ThanksGivingPopup`**: Gratitude feature

## Layout Sections
### 1. Header
- **Elements:**
  - Background image
  - Track thumbnail
  - Title and follower count
  - Share and add person buttons

### 2. Description
- **Elements:**
  - Track description text
  - Playback controls
  - Thanks giving feature

### 3. Track Bar
- **Elements:**
  - Thumbnail
  - Title
  - Duration
  - Like button

## Styled Components
- **`MainContainer`**: Gradient background
- **`HeadPart`**: Header section
- **`CoverImage`**: Background image
- **`HeadProfile`**: Profile section
- **`MusicInfo`**: Description section
- **`FeaturedTracks`**: Track bar section

## Responsive Design
### Breakpoints
- **767px:** Mobile layout
  - Adjusts header layout
  - Modifies profile image position
  - Stacks description sections
- **991px:** Tablet adjustments
- **575px:** Small mobile adjustments

## Media Handling
- Supports image thumbnails
- Fallback to default picture
- Background image overlay

## Interactions
- Like/Unlike toggle
- Play/Pause
- Share functionality
- Add person functionality
- Thanks giving feature

## Dependencies
- `react`
- `styled-components`
- `axios`
- `AuthContext`
- Various SVG assets
