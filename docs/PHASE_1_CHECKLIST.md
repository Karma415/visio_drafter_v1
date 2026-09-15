# Phase 1 acceptance checklist

Status: implemented; automated checks passed; waiting for Karma's browser acceptance. Do not start Phase 2 until Karma confirms Phase 1.

No drawing existed to migrate. Start with a small test drawing. Use the same app URL throughout so browser recovery is consistent. The sidebar scrolls independently; the canvas fills the remaining window.

## A. Layout and existing tools

- [ ] App loads with tools/settings on the left and a visible canvas/grid.
- [ ] Resize the window: canvas fills the available area, sidebar remains usable, and page does not scroll.
- [ ] Create a rectangle, circle/ellipse, and text shape. Each appears once and is selected after placement.
- [ ] Select another shape; click the empty background to clear selection.
- [ ] Drag a shape: it snaps without moving the entire stage.
- [ ] Drag the background to pan. Grid covers the visible canvas throughout the movement.
- [ ] Zoom in/out around the pointer; content stays under that pointer and the grid remains aligned.
- [ ] Resize rectangle, ellipse and text. Ellipse does not jump because of its center-based renderer.
- [ ] Switch to a drawing tool: selection handles hide and shapes are not draggable until Select mode returns.
- [ ] Reset view returns to the starting view. This does not change dimensions or delete shapes.

## B. Physical units and precise inputs

- [ ] Select a rectangle. Enter width `120` and height `12`, then Apply dimensions.
- [ ] Actual readout is 3,048 mm × 304.8 mm; paper readout is 121.92 mm × 12.192 mm at 1:25.
- [ ] Change width to `16`: actual width is 406.4 mm, paper width is 16.256 mm.
- [ ] Change width to `12 3/8`: actual width is 314.325 mm, paper width is 12.573 mm.
- [ ] Switch readouts to centimeters: that width is 31.4325 cm actual and 1.2573 cm on paper.
- [ ] Zoom and pan: the numeric actual/paper dimensions do not change.
- [ ] Negative/zero widths and `1/0` are rejected visibly; the previous shape remains intact.
- [ ] Select a different shape: dimension fields reflect that shape, not the previous one.

## C. Grid settings

- [ ] Enter snap spacing `1/8` and Apply setup. Snap readout becomes 0.125 inches.
- [ ] Move a shape: its actual X/Y values land on multiples of 0.125 inches (within displayed rounding).
- [ ] Zoom out: some visible grid lines are omitted to avoid clutter, but the snap spacing remains 0.125 inches.
- [ ] Return snap spacing to `1`; dragging/resizing follows that increment.
- [ ] Apply an exact width of `12 3/8` with a 1-inch grid: it stays exact until you deliberately grid-resize it.
- [ ] Invalid/zero grid spacing shows an error without breaking the canvas.

## D. Text and keyboard safety

- [ ] Select a text shape and click Edit Text. A dialog appears above the canvas.
- [ ] Type two lines and Save. The canvas updates.
- [ ] Reopen and Cancel: original content is preserved.
- [ ] Reopen and press Escape: original content is preserved.
- [ ] Backspace/Delete in the text editor edits text and does not delete the shape.
- [ ] Backspace/Delete in dimension/name/grid inputs also does not delete shapes.
- [ ] Save empty text, then Undo: previous text returns.
- [ ] A selected shape can still be deleted with Delete when focus is on the canvas.
- [ ] Edit Text is absent for rectangles/ellipses and outside Select mode.

## E. Undo/redo

- [ ] Undo and Redo shape creation, movement, resizing, dimension application and text edits.
- [ ] Undo shape deletion restores it.
- [ ] Ctrl+Z / Ctrl+Shift+Z work outside input fields; native text undo remains available inside fields.
- [ ] Undo, then make another edit: the abandoned redo branch is cleared.
- [ ] Drawing-name/grid/readout settings can also be undone and redone.

## F. Save, open and recovery

- [ ] Name the drawing, Apply setup, and wait for “Saved in this browser.”
- [ ] Refresh at the same URL: shapes, text, dimensions, grid, name and readout unit return.
- [ ] Selection/zoom/history may reset; they are intentionally not saved as document data.
- [ ] Download drawing to an E-drive folder. It has a `.karma.json` filename.
- [ ] Change the canvas, then Open the downloaded file. A confirmation appears before replacement.
- [ ] Cancel the import: current drawing remains unchanged.
- [ ] Confirm import: original geometry, text and setup return. Undo restores the drawing from before the import.
- [ ] Open an unrelated/invalid JSON file: an error appears and current drawing is unchanged.
- [ ] If you use another browser or another localhost port, open the downloaded file there; recovery does not transfer between origins automatically.
- [ ] Optional: open two tabs at the same URL and edit one. The other tab should warn and pause recovery rather than silently overwrite it.

## Automated checks completed

- TypeScript and Vite production build passed.
- ESLint passed.
- 14 Node tests passed: scale conversions, input rejection, zoom/grid math, ellipse bounds, file roundtrip, import validation, allowlisted decoding, recovery fallback, unreadable recovery protection, transactional updates/history, text state, missing-current fallback, storage quota failure, bounded undo history.
- npm dependency audit: zero known vulnerabilities at check time, including development dependencies.

The original browser-control runtime could not initialize. Follow-up verification now uses installed headless Chrome with an isolated profile on E: and a private debugging pipe (`tests/browser-selection.mjs`). It checks placement, background deselection, reselection, eight visible resize handles, actual handle dragging, selection during a slight drag, unchanged stage position while dragging a shape, text Save/Cancel/Escape, input-safe Backspace, canvas focus transfer, Delete/Backspace, undo, and the Delete selected button. A screenshot was inspected to confirm visible text handles and the selection panel.

Karma's manual boxes remain unchecked until confirmed. Physical paper calibration and PDF output belong to Phase 7, not this phase.

## Selection repair follow-up

- Shapes now select on mouse/touch press and drag start, not only completed click/tap. Slight mouse movement must not leave the previously edited shape selected.
- Pointer interaction focuses the canvas so an earlier dimension input does not keep intercepting Delete/Backspace.
- Handles are explicitly 12 screen pixels with a 2-pixel blue border. Rectangles and ellipses also show a blue selected outline; outlines do not change measured dimensions.
- The sticky selection panel shows selection status, Edit Text for text, and Delete selected. Actions appear above the dimension fields.
- This remains Phase 1 grid snapping. Shape-to-shape snapping is still scheduled for Phase 2.

Focused retest: at `http://localhost:5173`, refresh after local recovery says saved; create/select each shape; check handles; select text and save/cancel an edit; focus a width field then click a shape and test Delete/Backspace; undo the deletion.

Report failures with the section/item, what you entered/clicked, and what appeared. Phase 2 will repeat this checklist and add its own tests.
