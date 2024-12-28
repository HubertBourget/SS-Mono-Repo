# ModifyAlbum Component

## Purpose
Enables artists to edit existing album metadata and track order.

## State Management
- **`albumData` (object):**
  - `albumName`: string
  - `description`: string
  - `title`: string
  - `visibility`: `'public' | 'private'`
  - `albumImageUrl`: string
  - `albumOrder`: Array of tracks:
    ```json
    [
      { "id": "string", "title": "string" }
    ]
    ```
- **`formError` (string):** Error message display
- **`uploadedAlbumCover` (File):** New album cover file
- **`previewAlbumCover` (string):** URL for cover preview

## URL Parameters
- **`albumId`**: Album identifier from URL

## Authentication
Uses `AuthContext` to access:
- **`userEmail`**: Required for Firebase storage paths

## API Integration
### 1. Album Data
- **GET:** `${BASE_URL}/api/getAlbumById`
- **Params:** `{ albumId }`

### 2. Track Metadata
- **GET:** `${BASE_URL}/api/getVideoMetadataFromVideoId/${videoId}`

### 3. Album Updates
- **POST:** `${BASE_URL}/api/updateAlbumMetaData`
- **Payload:**
  ```json
  {
    "albumId": "string",
    "title": "string",
    "description": "string",
    "visibility": "string",
    "albumImageUrl": "string",
    "albumOrder": ["string"]
  }
  ```

## Firebase Storage
- **Path:** `albumCovers/${userEmail}/${uuid}`
- Handles image upload and URL generation.

## Layout Sections
### 1. Header
- **Elements:**
  - Close button
  - Save button

### 2. Album Details (Left Column)
- **Elements:**
  - Title input
  - Cover image upload
  - Description textarea
  - Visibility select

### 3. Track List (Right Column)
- **Elements:**
  - Draggable track list
  - Track components with:
    - Drag handle
    - Title
    - Edit button
    - (Commented out delete button)

## Drag and Drop
Uses `react-beautiful-dnd` for:
- Track reordering
- Immediate UI updates
- Backend sync after reorder

## Error Handling
- Form validation
- API error messages
- Image upload failures
- Track metadata fetch failures

## Navigation
- **Close:** Returns to previous page
- **Save:** Updates and returns to `/library`
- **Track Edit:** Routes to `/modifyTrack/${trackId}`

## Styled Components
- **`SaveButton`:** Primary action
- **`CloseButton`:** Secondary action
- **`AlbumCoverInput`:** Image upload container
- **`TrackComponent`:** Individual track row
- **`TrackContainer`:** Track list styling
- **`EditCoverButton`:** Cover image overlay

## Responsive Design
- Uses `vh`/`vw` units for spacing
- Flexible input widths
- Maintains two-column layout

## Image Handling
- Supports image preview
- Maintains aspect ratio
- Handles upload state

## Dependencies
- `react`
- `styled-components`
- `react-beautiful-dnd`
- `firebase/storage`
- `axios`
- `uuid`
- `AuthContext`
- Various icon assets
