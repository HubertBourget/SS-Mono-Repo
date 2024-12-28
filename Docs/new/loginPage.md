# Login Component

## Purpose
Handles user authentication for accessing the Sacred Sound platform.

## State Management
- **`email` (string):** User's email input
- **`password` (string):** User's password input
- **`error` (string):** Error message display

## Authentication Flow
1. User submits credentials.
2. API call to login endpoint.
3. **On success:**
   - Store access token in `localStorage`.
   - Redirect to library.
4. **On failure:**
   - Display error message.

## API Integration
- **Endpoint:** `${process.env.REACT_APP_API_BASE_URL}/api/login`
- **Method:** POST
- **Payload:**
  ```json
  {
    "email": "string",
    "password": "string"
  }
  ```
- **Success Response:**
  ```json
  {
    "accessToken": "string"
  }
  ```

## Local Storage
- **Key:** `sacredSound_accessToken`
- **Value:** JWT token from server

## Navigation
- **Success:** Redirects to `/library`
- **Forgot Password:** Links to `/forgot`
- **Sign Up:** Links to `/signup`

## Form Validation
- **Email:** Required, must be in email format.
- **Password:** Required.

## Layout Sections
### 1. Header
- Welcome title
- Subtitle

### 2. Form
- Email input
- Password input
- Login button

### 3. Links
- Forgot password
- Sign up

## Styled Components
- **`LoginContainer`:** Full-screen gradient background
- **`Title`:** Main heading
- **`Subtitle`:** Secondary text
- **`Input`:** Form fields
- **`Button`:** Submit button
- **`ErrorMessage`:** Error display

## Error Handling
- Invalid credentials
- Network errors
- Empty fields

## Responsive Design
- Full viewport height
- Centered content
- Flexible input widths
- Consistent padding (20px)

## Console Logging
- Form submission
- Email/password changes
- API response
- Token storage
- Navigation events

## Dependencies
- `react`
- `styled-components`
- `react-router-dom` (`useNavigate`)
- `process.env` for API URL
