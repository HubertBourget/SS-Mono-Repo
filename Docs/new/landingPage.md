# LandingPage Component

A responsive landing page component for the Sacred Sound platform that includes:

- **Hero banner** with call-to-action
- **Feature highlights section**
- **Community section** with video
- **User personas section**
- **Email registration form**

## Component Details

### @component

#### State Variables
- **`email`**: Stores the user's email input value

#### Ref Variables
- **`registerFormRef`**: Reference to the registration form for smooth scrolling

### Hooks
- **`useState`**: Manages email input state
- **`useRef`**: Creates reference for scroll functionality

### Functions
1. **`scrollToRegisterForm()`**: Smoothly scrolls to the registration form section.
2. **`handleSubmit(e)`**: Handles form submission, sends email to waitlist API.

## Styled Components

1. **`MainContainer`**: Root container
2. **`Banner`**: Hero section container
3. **`FeatureSection`**: Features highlight area
4. **`CommunitySection`**: Community content section
5. **`UserSection`**: User personas section
6. **`RegisterForm`**: Email registration form

## API Endpoints

- **POST** `${process.env.REACT_APP_API_BASE_URL}/api/storeEmailOnWaitlist`
  - Stores user email in waitlist database.

## Responsive Design

Includes mobile-responsive design with breakpoints at:
- **768px**: Major layout changes for mobile devices
- **880px**: Text size adjustments
- **1100px**: Content width adjustments
- **500px**: Form width adjustments
