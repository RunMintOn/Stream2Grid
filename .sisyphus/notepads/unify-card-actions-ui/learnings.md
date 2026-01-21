# UI Upgrade: TextCard Actions

## Changes
- Upgraded `Delete` and `Version Restore` buttons in `TextCard.tsx` to match "Flexoki" design spec.
- Replaced complex "Sliding Label" version toggle with a clean, icon-only button.
- Standardized button positioning to "hang" off the corners using `translate-x/y-1/4`.
- Applied specific color palette:
  - Delete: `#e05f65` (hover `#af3029`)
  - Restore: `#4385be` (hover `#205ea6`)
  - Icons: `#fffcf0`

## Learnings
- **Corner Hanging**: Using `translate-x-1/4 -translate-y-1/4` creates a nice "hanging" effect for action buttons on cards, making them feel like distinct interactive elements rather than internal content.
- **Group Hover**: Relying on `group-hover` on the parent card allows for clean, clutter-free UI that only reveals actions when needed.
- **Z-Index**: `z-30` was necessary to ensure buttons sit above other card content (like the edit overlay).
- **Simplification**: Removing the "Sliding Label" animation simplified the DOM and CSS significantly while maintaining functionality.

## Quadrant-Activated UI Pattern
- **Problem**: Multiple floating buttons (Restore, Delete, Copy) on a small card can be distracting and hard to target if they all appear on card hover.
- **Solution**: Divide the card into a 2x2 invisible grid.
  - Each quadrant activates only its specific corner button.
  - Uses `group/{quadrant}` and `group-hover/{quadrant}` for granular control.
  - Grid cells must be `pointer-events-auto` to capture hover, but this blocks clicks to underlying content.
  - **Workaround**: Pass `onDoubleClick` to grid cells to preserve "Double Click to Edit" functionality.
  - **Z-Index Stacking**:
    - Grid: `z-20`
    - Buttons: `z-30` (inside grid cells or siblings)
    - Interactive Content (Links, Actions): `z-30` (must be lifted above grid)
