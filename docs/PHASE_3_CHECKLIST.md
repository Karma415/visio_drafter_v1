# Phase 3 acceptance checklist — wall foundation

Status: implemented; automated checks passed; waiting for Karma's browser acceptance. Complete the Phase 1 and Phase 2 checklists again before accepting this phase.

Automated verification: 21 Node tests passed, ESLint passed, TypeScript production build passed, and the isolated browser smoke test passed wall creation/properties plus the existing canvas workflow.

Phase 3 intentionally establishes wall data and reliable two-point drawing only. It does not yet claim to provide building-code advice, location/year-specific construction recommendations, hatches/patterns, doors, windows, or furniture.

## A. Create and edit walls

- [ ] Choose **Wall**. Click a start point and a second point. Confirm a thick interior-room-partition wall is created and selected.
- [ ] Confirm the endpoints snap to the grid and nearby corners/vertices. Hold Alt while placing an endpoint and confirm free placement still works.
- [ ] Start a second wall near the middle of an existing wall from one side. Confirm its endpoint stops at the nearest visible face of that wall, rather than drawing through its centerline, and the sidebar says **Wall join snap**. Repeat by dragging a completed wall endpoint near another wall's face.
- [ ] Select the wall and drag it. Confirm its visible centerline and endpoints follow the same object/grid snapping feedback as other shapes.
- [ ] In **Selected wall**, change the Wall assembly to each listed category. Confirm the saved choice remains after selecting another shape and reselecting the wall.
- [ ] Change **Wall thickness — actual inches**, click **Apply properties**, and confirm the rendered wall becomes thicker or thinner while its centerline remains in place.
- [ ] Change **Wall length — actual inches**, click **Apply properties**, and confirm the wall’s first endpoint and direction stay in place while the second endpoint moves to the exact new length. Change **Rotation — degrees**, Apply properties, and confirm the wall rotates around its first endpoint. Repeat after setting a new wall length.
- [ ] After applying a wall assembly and thickness, choose **Wall** again. Confirm the next wall starts with the same assembly, color, and thickness.
- [ ] Create one wall of each assembly type. Confirm the categories remain visually distinguishable: masonry joint marks, concrete stipple, double-line separation walls, corridor dash marks, and a solid interior partition. Confirm the selection outline stays clear when a wall is selected.
- [ ] Enter a fraction such as `4 1/2` for wall thickness. Confirm the metric and paper-size readouts remain valid.

## B. Existing behavior regression check

- [ ] Recheck Phase 1 selection, deletion, undo/redo, local recovery, and inch/mm/cm readouts.
- [ ] Recheck all Phase 2 shapes, line/polyline/polygon completion, Escape cancellation, double-click completion, arc properties, and grid/object/Alt snapping.
- [ ] Download a drawing containing a wall, open it again through the app, and confirm the wall assembly and thickness remain intact.

## C. Temporary tape measure

- [ ] Choose **Measure**. Click two open-space points and confirm a red measurement line and label appear. Confirm it becomes selected after the second click.
- [ ] Confirm the label shows both the current metric display unit and actual inches.
- [ ] Set the document display unit to centimeters, repeat the measurement, and confirm the metric label changes to cm while the inches value remains available.
- [ ] Measure from the visible face of one wall to the visible face of another. Confirm each endpoint reports **Wall join snap** when it reaches a wall face.
- [ ] Hold Alt while placing a measurement endpoint and confirm free placement is used.
- [ ] Press Escape while choosing the second point, or click **Clear measurement (Esc)** before the second click. Confirm the unfinished measurement disappears.
- [ ] Select a completed measurement and use Delete, Backspace, or **Delete selected**. Confirm it is removed and Undo restores it.
- [ ] Download and reopen the drawing. Confirm completed measurements persist with their line and label.

## Safety boundary

- [ ] Confirm no cloud login, sharing, networking, external service, credential, or browser permission was added.
- [ ] Treat wall labels and default thicknesses as editable drafting starting points only. They are not construction instructions, code compliance advice, or a substitute for a licensed professional.
- [ ] Treat wall patterns as a visual shorthand and use the Wall assembly label as the authoritative category. A pattern does not prove concealed material or construction conditions.
