# ModifySingleTrackComponent

## Purpose
Enables artists to edit individual track metadata and thumbnail.

## State Management
- **`formData` (object):**
  - `title`: string
  - `description`: string
  - `category`: string (default: `'Music video'`)
  - `tags`: string[]
  - `visibility`: string
- **`formError` (string):** Error message display
- **`videoURL` (string):** Track's file URL
- **`videoUrlRetrived` (boolean):** Track URL fetch status
- **`selectedImageSource` (string):** Thumbnail source type
- **`uploadedThumbnailUrl` (string):** Custom thumbnail URL

## URL Parameters
- **`videoId`**: Track identifier from URL

## Authentication
Uses `AuthContext` to access:
- **`userEmail`**: Required for Firebase storage and API calls

## API Integration
### 1. Track Data
- **GET:** `${BASE_URL}/api/getContentById`
- **Params:** `{ videoId }`

### 2. Metadata Updates
- **POST:** `${BASE_URL}/api/updateContentMetaData`
- **Payload:**
  ```json
  {
    "videoId": "string",
    "b_isPreparedForReview": "boolean",
    "title": "string",
    "description": "string",
    "category": "string",
    "tags": ["string"]
  }
  ```

### 3. Thumbnail Updates
- **POST:** `${BASE_URL}/api/updateTrackThumbnail`
- **Payload:**
  ```json
  {
    "videoId": "string",
    "thumbnailUrl": "string"
  }
  ```

### 4. Track Deletion
- **DELETE:** `${BASE_URL}/api/deleteContent`
- **Params:** `{ videoId }`
- **Headers:** `{ 'user-id': userEmail }`

## Firebase Storage
- **Path:** `thumbnails/${userEmail}/${uuid}`
- Handles image upload and URL generation.

## Layout Sections
### 1. Header
- **Elements:**
  - Close button
  - Publish button

### 2. Left Column
- **Elements:**
  - Thumbnail upload/preview
  - Title input
  - Description textarea

### 3. Right Column
- **Elements:**
  - Category select
  - (Future: Additional metadata fields)

## Image Handling
- Drag and drop support
- File input fallback
- Preview generation
- Upload progress handling

## Form Validation
- Required fields: `title`, `description`
- `Category` must be from a predefined list
- Image type validation

## Navigation
- **Close:** Returns to `/library`
- **Publish:** Updates and returns to `/library`
- **Delete:** Removes track and returns to `/library`

## Styled Components
- **`MainDiv`:** Container layout
- **`LeftDiv/RightDiv`:** Two-column structure
- **`CustomForm`:** Form styling
- **`CustomInput`:** Input fields
- **`DescriptionTextArea`:** Multiline input
- **`UploadProfileImageContainer`:** Thumbnail area

## Error Handling
- Form validation errors
- API error messages
- Image upload failures
- Delete confirmation

## Responsive Design
- Uses `vw` units for spacing
- Flexible input widths
- Maintains two-column layout

## Dependencies
- `react`
- `styled-components`
- `firebase/storage`
- `axios`
- `uuid`
- `AuthContext`
- Various icon assets
