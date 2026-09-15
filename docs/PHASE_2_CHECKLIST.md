# Phase 2 acceptance checklist

Status: implemented; automated checks passed; waiting for Karma's browser acceptance. Do not start Phase 3 until Karma confirms this checklist and the Phase 1 checklist pass together.

First complete [Phase 1](./PHASE_1_CHECKLIST.md), then complete every item below at `http://localhost:5173`. Use the same browser address so local recovery remains available.

## A. New shape tools

- [ ] Create a rectangle, circle, triangle, arc, and text shape.
- [ ] Every new shape is selected immediately, shows blue handles, and can be moved, resized, rotated, deleted, and undone.
- [ ] Change a rectangle's width and height independently to create either a rectangle or a square.
- [ ] Change a circle's width and height independently to create either a circle or an ellipse.
- [ ] A triangle rotates and resizes without jumping away from its selection box.
- [ ] An arc appears as a half circle by default. Select it, scroll to **Selected arc**, enter the **Arc start** and **Arc end** degree values, choose **Apply properties**, and confirm its visible sweep changes.

## B. Lines, connected lines, and polygons

- [ ] Choose Line. Click a start point, move the pointer to confirm a dashed preview, and click an end point. The line becomes selected.
- [ ] Start a Line, then press Escape. The dashed preview disappears and no line is saved.
- [ ] Choose Connected line. Click at least three points, then press Enter or double-click the final point. The connected line is saved and selected.
- [ ] Start a Connected line, press Escape (or use the visible **Cancel drawing (Esc)** button), and confirm no partial line is saved.
- [ ] Choose Polygon. Click at least three points, press Enter or double-click the final point, and confirm it closes and fills.
- [ ] Select a line, connected line, or polygon. Move it, resize it, rotate it, and Undo/Redo each change.
- [ ] Use the exact property panel on a path. Changing width/height scales its existing point layout instead of replacing it with a different path.

## C. Exact placement and constraints

- [ ] Select a new Phase 2 shape. Enter exact X, Y, width, height, and rotation values in inches/degrees; click Apply properties.
- [ ] Confirm actual-mm and 1:25 paper-size readouts remain correct after each edit.
- [ ] For a rectangle/circle, enter unlike dimensions such as 24 by 12 inches. Confirm the stored width and height match the entered values.
- [ ] Rotate a rectangle with the rotation handle, then confirm its Rotation field changes after Apply properties.
- [ ] Enter matching start/end angles for an arc. Confirm the form reports an error and does not change the arc.

## D. Snapping

- [ ] With a 1-inch grid, drag a shape so one of its corners or its center nears the corner or center of another shape. The sidebar should say **Object snap** and the matching anchors should align.
- [ ] Draw a line endpoint near a rectangle corner or the vertex of another path. It should snap to that point.
- [ ] Draw or drag in open space. The sidebar should say **Grid snap** and it should snap to the configured physical grid.
- [ ] Hold Alt while drawing/dragging and confirm the sidebar says **Free placement (Alt)** and the pointer bypasses both grid and object-anchor snapping.
- [ ] Zoom in and out, then repeat a nearby-corner snap. The visible snap distance stays practical on screen while saved dimensions remain actual millimeters.

## Verification completed before this checklist

- [x] TypeScript production build passed.
- [x] ESLint passed.
- [x] 20 Node tests passed before this focused follow-up; rerun is required after the reliability changes.
- [x] Isolated headless-browser test passed: live selection/handles, all basic shape tools, line/polyline/polygon completion, and Escape cancellation.

The browser check does not replace Karma's manual confirmation. Report any failure with the shape/tool selected, the clicks or values used, and what appeared. Phase 3 will repeat both Phase 1 and Phase 2 checks before it can be accepted.
