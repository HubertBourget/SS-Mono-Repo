# Upload Component

## Purpose
Handles file uploads for audio/video content with album creation capabilities.

## Props
- **`viewState`**: Controls component view (`'initial'`, `'albumCreation'`, `'fileDetail'`)
- **`onStateChange`**: Function to update view state
- **`albumTitle`**: Album title string
- **`albumDescription`**: Album description string
- **`visibility`**: Album visibility setting
- **`onAlbumDataChange`**: Function to update album metadata
- **`albumId`**: Unique album identifier
- **`publishClicked`**: Boolean for publish trigger
- **`handlePublishHandled`**: Function to reset publish state
- **`onAllUpdatesComplete`**: Callback for completion
- **`onTrackDetailChange`**: Function to update track details
- **`fileUploadsArray`**: Array of files being uploaded
- **`setFileUploadsArray`**: Function to update files array
- **`trackDetails`**: Track metadata
- **`updateFileProgress`**: Function to update progress UI

## State Management
- **`uploadProgress`** (object): Tracks upload progress per file
- **`fileUploadStatus`** (object): Tracks upload status per file
- **`albumOrderUpdated`** (boolean): Tracks album order changes
- **`createAlbum`** (boolean): Toggle for album creation
- **`albumCover`** (string/null): Album cover image URL

## Firebase Integration
### Storage Paths
- **Uploads:** `Uploads/${userEmail}/${videoId}`
- **Album Pictures:** `AlbumPictures/${userEmail}/${fileUploadName}`

## API Endpoints
### Content Upload
1. **POST:** `${BASE_URL}/upload/video`
2. **POST:** `${BASE_URL}/api/postContentMetaData`
3. **POST:** `${BASE_URL}/api/updatePartialContentMetaData`

### Album Management
1. **POST:** `${BASE_URL}/api/postNewAlbum`
2. **POST:** `${BASE_URL}/api/postAlbumImage`
3. **POST:** `${BASE_URL}/api/updateReviewStatus`

## Views
### 1. Initial Upload View
- Drag & drop zone
- File type guidelines
- Album creation checkbox

### 2. Album Creation View
- Album details form
- Cover image upload
- Track listing with drag-to-reorder

### 3. File Detail View
- Individual track details forms
- Progress indicators

## File Handling
### Supported Types
- **Audio:** WAV, FLAC, AIFF
- **Video:** MP4
### Requirements
- **Audio:** 16-bit depth min, 44.1 kHz sample rate min
- **Video:** Highest resolution recommended

## Drag and Drop
- Uses `react-beautiful-dnd` for track reordering
- Maintains album order in parent component

## Error Handling
- Upload failures
- Invalid file types
- API call failures
- Progress tracking

## Responsive Design
### Breakpoints
- **768px:** Mobile layout
  - Stack layout elements
  - Adjust dropzone size
  - Modify guidelines display

## Cleanup
- Handles component unmount
- Cancels ongoing uploads
- Removes temporary files

## Dependencies
- `react`
- `firebase/storage`
- `styled-components`
- `react-beautiful-dnd`
- `axios`
- `uuid`
- `AuthContext`
