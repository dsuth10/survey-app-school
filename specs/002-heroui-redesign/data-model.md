# UI Data Model: HeroUI Redesign

## UI State Entities

### Theme Configuration
- **currentTheme**: `String` ('light', 'dark', 'system')
- **isGlassmorphismEnabled**: `Boolean` (Default: true)
- **primaryColor**: `String` (HeroUI Default Blue)

### Component Mapping (Mapping Existing Data to HeroUI)

| Existing Concept | HeroUI Component | Props/Config |
|------------------|------------------|--------------|
| Survey Container | `Card` | `isBlurred`, `variant="flat"` |
| Question Title | `Text` | `h3`, `weight="bold"` |
| Radio Question | `RadioGroup` | `orientation="vertical"` |
| Checkbox Question | `CheckboxGroup` | |
| Text Input | `Input` | `variant="bordered"`, `labelPlacement="outside"` |
| Action Button | `Button` | `color="primary"`, `variant="shadow"` |
| Navigation Bar | `Navbar` | `isBordered`, `isBlurred` |

## Validation Rules (UI Level)
- **Required Fields**: Use HeroUI's `isRequired` and `errorMessage` props for real-time validation feedback.
- **Accessibility**: Ensure every input has a `label` or `aria-label`.

## State Transitions
1. **Initial Load**: Detect system theme -> Set `currentTheme`.
2. **User Interaction**: Update component focus -> Trigger React Aria hooks.
3. **Form Submission**: Validate inputs -> Show HeroUI `Modal` or `Toast` on success/failure.
