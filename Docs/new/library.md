# Library Component

## Purpose
Displays personalized video recommendations across three categories:
- **Music Video**
- **Meditation**
- **Studio Recording**

## State Management
- **`recommendations_MusicVideo` (array):** Music video recommendations
- **`recommendations_Meditation` (array):** Meditation video recommendations
- **`recommendations_StudioRecording` (array):** Studio recording recommendations
- **`error` (string):** Error message display

## Authentication
Uses `AuthContext` to access:
- **`userEmail`**: Current user's email
- **`loading`**: Authentication loading state

## API Integration
### Recommendation Endpoints
- **Base:** `${process.env.REACT_APP_API_BASE_URL}/api/`
- **Scenarios:**
  - `getItemToUserRecommendations_Scenario_MusicVideo/${userEmail}`
  - `getItemToUserRecommendations_Scenario_Meditation/${userEmail}`
  - `getItemToUserRecommendations_Scenario_StudioRecording/${userEmail}`
- **Response:**
  ```json
  {
    "recommId": "string",
    "recomms": [
      { "id": "string" }
    ]
  }
  ```

### Video Metadata Endpoint
- `/api/getVideoMetaDataFromObjectId/${id}`
- **Returns:** Video details for each recommendation.

## Data Flow
1. Component mounts and authentication loads.
2. Fetches recommendations for each scenario.
3. For each recommendation, fetches video metadata.
4. Combines `recommId` with video data.
5. Updates respective state arrays.

## Components Used
- **`SwipeComponent`:** Displays video recommendations in swipeable format.

## Error Handling
- Displays error message if API calls fail.
- Filters out null responses from failed metadata fetches.
- Handles unmounted component state.

## Loading States
- Displays loading message during authentication.
- Handles empty recommendation states.

## Styled Components
- **`MainContainer`:** Full viewport gradient background.
- **`Main`:** Content layout container.

## Responsive Design
### Breakpoints
- **1440px:** Adjusts padding.
- **991px:** Mobile layout adjustments.

## Cleanup
- Uses cleanup function in `useEffect` to prevent memory leaks.
- Tracks mounted state for async operations.

## Dependencies
- `react`
- `styled-components`
- `axios`
- `SwipeComponent`
- `AuthContext`
