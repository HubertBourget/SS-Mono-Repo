# Track Details Component Documentation

## Overview
The Track Details component is a comprehensive form interface for managing music track metadata in the Sacred Sound platform. It provides a rich set of fields for capturing various aspects of musical content, from basic information to spiritual and cultural metadata.

## Component Structure

### Layout
- Header Section: Contains the title and save button
- Main Content: Two-column layout
  - Left Column: Basic information and cover image
  - Right Column: Detailed metadata and classifications

### Required Fields (*)
1. Name
2. Category
3. Vocals
4. Genre
5. Featured Instruments
6. Language

## Field Specifications

### Basic Information (Left Column)

#### Cover Image Upload
- Component: Card
- Features:
  - Drag and drop support
  - Recommended size: 3000x3000px
  - Hover state with upload icon

#### Name Field (*)
- Type: Input
- Validation: Required
- Purpose: Track title
- Constraints: Single value

#### Description Field
- Type: Textarea
- Min height: 120px
- Purpose: Detailed track description
- Constraints: Single value

#### Category Field (*)
- Type: Select
- Options: 8 predefined categories
  - Studio Production
  - Music Video
  - Meditation
  - DJ Set
  - Behind the Scenes
  - Concert
  - Live Recording
  - Video Lesson

#### Tags Field
- Type: Custom input with badge display
- Validation:
  - Must start with #
  - Only letters, numbers, and underscores allowed
  - Maximum 5 tags
- Features:
  - Real-time validation
  - Tag removal
  - Tag counter (x/5)
  - Error messaging

### Detailed Metadata (Right Column)

#### Vocals Section (*)
- Type: Checkbox group
- Options:
  - Instrumental (exclusive)
  - Male
  - Female
  - Choir
  - Circle
- Logic: Instrumental selection disables other options

#### Genre Field (*)
- Type: CreatableSelect
- Features: 
  - Custom entry allowed
  - Single selection
- Predefined options: 10 genres including
  - Shamanic
  - Medicine Songs
  - Kirtan
  - Mantra
  - Bhajan
  - Others...

#### Featured Instruments Field (*)
- Type: CreatableSelect
- Features:
  - Multiple selection
  - Custom entry allowed
- Options: 15 instruments including
  - Harmonium
  - Guitar
  - Drums
  - Flute
  - Others...

#### Primary Instrument Field
- Type: CreatableSelect
- Features:
  - Single selection
  - Custom entry allowed
- Uses same options as Featured Instruments

#### Language Field (*)
- Type: CreatableSelect
- Features:
  - Multiple selection
  - Custom entry allowed
- Options: 10 languages including
  - Sanskrit
  - Arabic
  - Portuguese
  - Others...

#### Spiritual/Cultural Fields
All following fields use CreatableSelect with multiple selection and custom entry:

##### Intention Field
- 10 predefined options including:
  - Heart Opening
  - Healing
  - Grounding
  - Others...

##### Deity Field
- 10 predefined options including:
  - Ganesha
  - Shiva
  - Krishna
  - Others...

##### Tradition Field
- 10 predefined options including:
  - Buddhism
  - Hinduism
  - Sufism
  - Others...

## UI Components Used

### shadcn/ui Components
- Button
- Input
- Textarea
- Card
- Badge
- Checkbox
- Calendar
- Label
- Popover

### Third-party Components
- react-select
  - Select
  - CreatableSelect

### Icons (from lucide-react)
- Upload
- AlertCircle
- CalendarIcon

## State Management

### Main State Object (`trackDetails`)
Contains all form fields with appropriate typing:
- Primitive types for single-value fields
- Arrays for multiple-selection fields
- Nested object for vocals configuration
- Date object for release date