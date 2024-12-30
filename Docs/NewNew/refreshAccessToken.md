# Refresh Access Token API

## Endpoint
`POST /api/refreshToken`

## Description
This endpoint is used to refresh the user's access token. It allows users to obtain a new access token using a valid refresh token

## Request Body
- `refreshToken` (string, required): The refresh token issued during the initial authentication process.

### Example
json
{
"refreshToken": "your-refresh-token-here"
}

## Response
- **Success (200)**: Returns a new access token and, optionally, a new refresh token.
  - Example:
    ```json
    {
      "accessToken": "new-access-token",
      "refreshToken": "new-refresh-token" // Optional, if issued
    }
    ```

- **Error (401)**: Indicates that the refresh token is invalid or expired.
  - Example:
    ```json
    {
      "message": "Invalid or expired refresh token"
    }
    ```

- **Error (500)**: Indicates a server-side error occurred while processing the request.
  - Example:
    ```json
    {
      "message": "Error refreshing access token"
    }
    ```

## Implementation Details
- The endpoint verifies the provided refresh token against stored tokens in the database.
- If valid, a new access token is generated using JWT, signed with a secret key.
- Optionally, a new refresh token may be issued, replacing the old one in the database.
- The access token is typically short-lived, while the refresh token has a longer expiration period.

## Security Considerations
- Ensure that refresh tokens are stored securely and transmitted over HTTPS to prevent interception.
- Regularly rotate secret keys used for signing tokens to enhance security.