# SlopeSense Mobile Interface Design

## Product Direction

SlopeSense is presented as a calm, trustworthy mountain-oriented experience. The first screen is a focused sign-in surface that uses a deep forest-green brand header, a white content area, restrained borders, and compact one-handed controls. The visual language follows mainstream iOS conventions: clear hierarchy, generous touch targets, readable text, predictable keyboard behavior, and subtle motion rather than decorative animation.

## Screen List

| Screen | Primary content and functionality |
|---|---|
| Login | Brand mark and wordmark, welcome message, email field, password field with visibility toggle, password recovery link, primary login action, divider, Google continuation action, and registration link. |
| Login feedback state | Inline validation and loading feedback after login is pressed. This is implemented as state within the Login screen rather than a separate route for the initial milestone. |

## Layout Specification

The app uses portrait orientation and is optimized for one-handed use. A deep green hero panel occupies roughly the upper quarter of the screen and contains the SlopeSense mountain mark and wordmark. Its lower boundary is a soft, layered wave that transitions into the white form surface. The form content is vertically centered within the remaining space, with a maximum readable width on larger devices and horizontal insets that scale conservatively.

The content order is: “Welcome Back!” heading, supporting copy, email input, password input, right-aligned “Forgot Password?” link, full-width green Login button, a thin divider labeled “OR”, outlined Google button, and a final registration prompt. Inputs and buttons use rounded rectangles with approximately 12–14 px corner radii, a minimum 44 px interactive height, and clear focus/pressed states.

## Key User Flows

1. The user lands on the Login screen and sees the brand header fade in with the form content.
2. The user taps the email field, enters an email address, and advances to the password field with the keyboard’s next action.
3. The user taps the password visibility control to switch between obscured and visible text.
4. The user taps Login. The button enters a short loading state and validation feedback is shown inline when fields are incomplete; no backend authentication is required for this initial UI milestone.
5. The user taps “Forgot Password?” or “Register”. These controls provide press feedback and are wired as clear interaction points for later navigation work.
6. The user taps “Continue with Google”. The button provides the same tactile feedback and remains ready for a future OAuth integration.

## Motion and Interaction

The screen uses a short ease-out entrance: the brand panel and form content fade and translate upward by a small distance. Pressable controls compress subtly to approximately 0.97 scale and reduce opacity during touch. Focused inputs animate their border color and shadow gently. Motion duration remains within the 100–300 ms range so the interface feels responsive and native rather than theatrical.

## Color Choices

| Token | Color | Use |
|---|---|---|
| Forest green | `#006B3C` | Primary action, wordmark accent, links, and main brand surface. |
| Deep evergreen | `#004F2D` | Hero gradient depth and wave contrast. |
| Snow white | `#FFFFFF` | Main content background and input surfaces. |
| Ink | `#111827` | Headings and primary text. |
| Slate | `#6B7280` | Supporting copy and placeholders. |
| Soft border | `#D7DCE1` | Input and secondary button outlines. |
| Google blue | `#4285F4` | Google “G” mark treatment, with the official multicolor mark represented in the UI. |

## Accessibility and Responsiveness

The layout must remain legible on compact phones and avoid clipping when the keyboard is open. Text inputs use semantic labels and appropriate email/password keyboard types. Password visibility is exposed through an accessible button label. Color contrast is maintained between text and surfaces, and the main actions remain reachable without requiring precise taps. On wider devices, the form receives a maximum width rather than stretching edge-to-edge.

## Registration Milestone Addendum

The Register screen adds a compact green header with a back affordance, “Create Account” title, and the same SlopeSense mountain language as Login. The form contains labeled First Name, Last Name, Email, Phone Number, Password, and Confirm Password fields, followed by a full-width Register action and a Login return link. The screen keeps the form dense enough for compact phones while preserving readable labels and 40–44 px touch targets.

The header’s layered wave now moves gently from side to side in a repeating ease-in-out cycle. The front and back wave layers use different travel distances to create a soft parallax effect. This animation is intentionally low amplitude and slow so it adds life without distracting from data entry.
