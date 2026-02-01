# Plan: Align Card Corner Hover Actions (Quadrant Grid)

## TL;DR

> **Quick Summary**: Align the interactive corner-hover logic (Quadrant Grid) of `ImageCard` and `LinkCard` with the gold standard established in `TextCard`. This involves restructuring the DOM to use a 4-quadrant detection layer and fixing button clipping/interaction issues.
> 
> **Deliverables**:
> - Updated `src/sidepanel/components/cards/ImageCard.tsx`
> - Updated `src/sidepanel/components/cards/LinkCard.tsx`
> 
> **Estimated Effort**: Short
> **Parallel Execution**: YES (Cards can be updated independently)
> **Critical Path**: Refactor ImageCard → Refactor LinkCard → Manual Verification

---

## Context

### Original Request
鼠标悬浮在内容卡片上并移动时会出现删除图标，目前图片和链接卡片实现效果差或几乎没有，需要与文本卡片对齐。

### Interview Summary
**Key Discussions**:
- **TextCard Reference**: Its quadrant implementation is the target pattern.
- **ImageCard Fix**: Remove `overflow-hidden` from the container (which clips buttons) and align styles. No "Restore" button needed.
- **LinkCard Fix**: Centralize link navigation to the content area with hover feedback; reserve corners for action buttons. Remove duplicate buttons and fix `group-hover` logic.
- **Testing**: Manual verification only (no automated tests).

### Metis Review
**Identified Gaps** (addressed):
- **Event Propagation**: Use `e.stopPropagation()` on all quadrant buttons to prevent triggering card click/drag.
- **Animation Consistency**: Match TextCard's transition classes (`opacity-0 group-hover:opacity-100 transition-all duration-200`) exactly.
- **Interaction Layer**: Use `pointer-events-none` on the quadrant overlay container and `pointer-events-auto` on the buttons themselves.
- **Z-Index**: Ensure quadrants are on top of content but don't block interaction when hidden.

---

## Work Objectives

### Core Objective
Ensure all card types (`Text`, `Image`, `Link`) share an identical "Corner Hover" interaction experience.

### Concrete Deliverables
- `src/sidepanel/components/cards/ImageCard.tsx` (Quadrant alignment + overflow fix)
- `src/sidepanel/components/cards/LinkCard.tsx` (Quadrant alignment + navigation refactor)

### Definition of Done
- [x] Hovering corners of `ImageCard` reveals Copy/Delete buttons.
- [x] Hovering corners of `LinkCard` reveals Copy/Delete buttons.
- [x] Click center of `LinkCard` navigates to URL; click corners triggers buttons.
- [x] No buttons are clipped by card boundaries.
- [x] Button styles (colors, shadows, stroke widths) are identical across all cards.

### Must Have
- `e.stopPropagation()` on all action buttons.
- Central navigation area for `LinkCard` with `hover:bg-slate-50` feedback.
- Removal of `overflow-hidden` from card containers where it clips buttons.

### Must NOT Have (Guardrails)
- NO changes to `TextCard.tsx`.
- NO new buttons or functionality beyond existing Restore/Copy/Delete.
- NO automated tests (as requested).
- NO mobile-specific tap-to-reveal logic (Out of scope).

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: NO (Manual only)
- **User wants tests**: NO
- **QA approach**: Manual verification via Playwright browser automation (Agent executed)

### Automated Verification (Agent Executable)

Each task includes an automated check using the `playwright` skill to confirm visual and functional alignment.

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
├── Task 1: Refactor ImageCard.tsx
└── Task 2: Refactor LinkCard.tsx

Wave 3 (Integration):
└── Task 3: Final Manual Verification
```

---

## TODOs

- [x] 1. Refactor ImageCard.tsx to align with Quadrant Grid pattern
- [x] 2. Refactor LinkCard.tsx to align with Quadrant Grid pattern
- [x] 3. Final Consistency Verification

  **What to do**:
  - Compare all three card types in a single view.
  - Verify that the reveal animation timing, button shadows, and icon weights are 1:1 identical.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]

  **Acceptance Criteria**:
  - [ ] All card action buttons appear identical in style and behavior.

---

## Success Criteria

### Verification Commands
```bash
# Verify that TextCard remains unchanged
git status src/sidepanel/components/cards/TextCard.tsx # Expected: No changes
```

### Final Checklist
- [x] Quadrant grid pattern unified across all 3 cards.
- [x] LinkCard has clear central clickable area with hover feedback.
- [x] ImageCard buttons are not clipped.
- [x] All buttons have event propagation stopped.
