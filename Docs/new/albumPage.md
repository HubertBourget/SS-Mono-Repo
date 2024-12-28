# Album Component

## Purpose
Displays detailed information about a music album, including track listing and playback controls.

## State Management
- **`album` (object):** Album details including:
  - **`albumName`**: string
  - **`description`**: string
  - **`selectedImageThumbnail`**: string (URL)
  - **`tracksArray`**: Array of tracks:
    ```json
    [
      {
        "_id": "string",
        "title": "string",
        "fileUrl": "string",
        "selectedImageThumbnail": "string",
        "user": { "accountName": "string" }
      }
    ]
    ```

## URL Parameters
- **`id`**: Album identifier from URL query parameter

## API Integration
- **Endpoint:** `${process.env.REACT_APP_API_BASE_URL}/api/getAlbum/${albumId}`
- **Response:**
  ```json
  {
    "album": AlbumObject
  }
  ```

## Layout Sections
### 1. Header Banner
- **Elements:**
  - Background image with overlay
  - Album artwork
  - Album title and follower count
  - Share and add person buttons

### 2. Description Section
- **Elements:**
  - Album description
  - Play/Shuffle controls
  - Thanks giving feature

### 3. Track Listing ("Spot Light")
- **List of tracks includes:**
  - Play button
  - Track thumbnail
  - Title
  - Album name
  - Duration
  - Like button

## Components Used
- **`BackButton`**: Navigation
- **`PlayButton`**: Track playback control
- **`ThanksGivingPopup`**: Gratitude feature

## Responsive Design
### Breakpoints
- **767px:** Mobile layout
  - Adjusts header height (270px)
  - Repositions profile elements
  - Modifies text colors
  - Stacks music info sections
- **991px:** Tablet adjustments
  - Modifies action button positions
- **575px:** Small mobile adjustments
  - Reduces text sizes

## Styling Features
- Gradient background
- Image overlays
- Responsive containers
- Track hover states
- Custom button styling

## Media Handling
- Background image
- Album artwork
- Track thumbnails
- Fallback images

## Track Playback
Each track contains:
- **`id`**: 1 (hardcoded)
- **`songUrl`**: from `track.fileUrl`
- **`songTitle`**: from `track.title`
- **`isVideo`**: false
- **`artistName`**: from `track.user.accountName`
- **`img`**: from `track.selectedImageThumbnail`

## Error Handling
- Empty album state handling
- Image loading fallbacks

## Dependencies
- `react`
- `styled-components`
- `axios`
- `AuthContext`
- Various SVG assets:
  - Share
  - PersonAdd
  - Play
  - Shuffle
  - Thanks
  - TrackLike
