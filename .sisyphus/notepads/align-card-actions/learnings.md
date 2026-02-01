# Learnings & Context

## Project Context
- **Tech Stack**: React 19, Tailwind CSS 4, TypeScript 5.9.
- **Card Interaction Pattern**: "Quadrant Grid" - hovering corners reveals action buttons.
- **Reference Implementation**: `TextCard.tsx` is the gold standard.

## Task Specifics
- **ImageCard**: Needs `overflow-hidden` removed from container to prevent button clipping.
- **LinkCard**: Needs central click area for navigation, corners for actions.
- **Common**: 
  - Use `e.stopPropagation()` on all action buttons.
  - Match `TextCard` styles exactly (shadow-md, strokeWidth=2.5, duration-200).
  - Use `pointer-events-none` on overlay container, `pointer-events-auto` on buttons.

## Constraints
- Do NOT modify `TextCard.tsx`.
- Do NOT add new buttons (no Restore for ImageCard).
- No automated tests required (manual verification).

## LinkCard Refactoring Findings
- **Quadrant Grid Implementation**: Successfully aligned LinkCard with the TextCard pattern.
- **Navigation vs Actions**: Wrapped the central content in a single `<a>` tag with `z-10` and `relative` to ensure it's clickable while the overlay (`z-40`) handles corner actions.
- **Pointer Events**: The overlay uses `pointer-events-none` while individual quadrants use `pointer-events-auto`. This allows clicks to pass through to the content in the center but captures them in the corners.
- **Button Placement**: Placing buttons inside the quadrant divs (`group/tr`, `group/br`) allows for clean `group-hover` logic.
- **Cleanup**: Removed duplicate delete buttons and legacy `absolute inset-0` anchor tags.
## ImageCard Refactoring (Quadrant Grid)
- Removed `overflow-hidden` from the outermost container of `ImageCard` to allow quadrant buttons to "pop out" (negative translate).
- Added `rounded-t-lg overflow-hidden` to the image wrapper to ensure the image is clipped correctly while buttons remain visible.
- Aligned the Quadrant Grid DOM structure with `TextCard.tsx`, using `absolute inset-0 z-40 pointer-events-none` for the container and `pointer-events-auto` for the quadrants.
- Updated button icons to use `strokeWidth={2.5}` and added `shadow-md` for better visibility.
- Ensured `e.stopPropagation()` is called on all button actions to prevent unwanted card interactions (like drag or click).
- Used Chinese labels for tooltips/titles to match the project's UI language preference.
