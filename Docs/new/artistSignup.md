# ArtistSignup Component

## Purpose
Handles new artist registration for the Sacred Sound platform.

## State Management
- **`accountName` (string):** Artist's display name
- **`email` (string):** Artist's email address
- **`password` (string):** Artist's password
- **`error` (string):** Error message display
- **`isArtist` (boolean):** Always true for this component

## API Integration
- **Endpoint:** `${process.env.REACT_APP_API_BASE_URL}/api/signup`
- **Method:** POST
- **Payload:**
  ```json
  {
    "accountName": "string",
    "email": "string",
    "password": "string",
    "isArtist": "boolean"
  }
  ```
- **Success Response:**
  ```json
  {
    "token": "string"
  }
  ```

## Authentication Flow
1. User submits form.
2. API call made to `/api/signup`.
3. **On success:**
   - Token stored in `localStorage`.
   - User redirected to `/library`.
4. **On failure:**
   - Error message displayed to user.

## Form Validation
- All fields are required.
- Email must be in a valid format.
- Password requirements are handled by the backend.

## Styled Components
- **`SignupContainer`:** Full-screen gradient background
- **`Title`:** Main heading
- **`Subtitle`:** Secondary text with login link
- **`Input`:** Form input fields
- **`Button`:** Submit button
- **`ErrorMessage`:** Red error text display

## Navigation
- **Success:** Redirects to `/library`
- **Login Link:** Routes to `/login`

## Responsive Design
- **Container:** 100vh height
- **Inputs:** 100% width
- **Padding:** 20px

## Dependencies
- `react`
- `styled-components`
- `axios`
- `react-router-dom` (`useNavigate`)

## Error Handling
- Displays backend error messages.
- Falls back to a generic error if response structure is unexpected.
