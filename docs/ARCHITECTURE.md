# Drafting architecture

Priority order: security, maintainable code, then delivery speed. Phase 1 is local-only.

## Ownership

| Area | Responsibility |
| --- | --- |
| `src/App.tsx` | Compose the editor; no geometry, file parsing, or event algorithms |
| `src/domain/document.ts` | Versioned document types, limits, actual-mm contract, and Phase 2 shape types |
| `src/domain/units.ts` | Inch parsing, conversion, metric/paper formatting |
| `src/domain/geometry.ts` | Pure geometry, world coordinates, path normalization, resizing, and snapping |
| `src/domain/validation.ts` | Validate and rebuild imported documents from allowed fields |
| `src/services/drawingFiles.ts` | Validated file encoding, decoding, download and open |
| `src/services/recovery.ts` | Current/previous local recovery copies |
| `src/store/useDrawingStore.ts` | Drawing mutations and bounded document history |
| `src/store/useEditorStore.ts` | Temporary tool, selection, dialog and viewport state |
| `src/hooks` | Browser lifecycle: recovery and keyboard routing |
| `src/components/canvas` | Konva rendering and adapter events |
| `src/components/editor` | HTML settings, properties, files and text editor |
| `tests/phase1.test.mjs` | Unit/geometry/import/recovery/state tests using Node 24 |

`src/store/useCanvasStore.ts` remains only as a legacy module alias. It does not create a second store. Its old action API has been replaced by the documented drawing store. No active application code imports it.

## Dimensional contract

- Every shape x/y/width/height is actual millimeters, including ellipse bounds.
- Ellipses are stored with top-left bounds. The canvas adapter converts those to center/radii.
- Inch input converts once on commit: inches × 25.4. Fractions are parsed, never evaluated.
- At 1:25, paper mm = actual mm / 25; paper cm = paper mm / 10.
- Display rounding does not change stored geometry.
- Numeric dimension entry preserves precise size. Dragging/resizing intentionally uses the snap grid.
- A coarser visible grid at distant zoom does not change the snap increment.
- Pixels per mm and pan belong only to editor state. The screen is not calibrated to physical paper.
- Pixel-only files have no known physical scale and are rejected. Karma confirmed no existing drawing to preserve for this migration.

## Mutation and persistence rules

All persistent changes go through drawing-store actions. Validate changes before adding history. Keep up to 50 previous documents; do not record every intermediate drag movement. Future phases should extend these actions, rather than mutate Konva nodes as the source of truth.

Recovery saves only drawing documents, not selection, viewport, or undo history. It keeps a previous valid copy and reports storage errors. Damaged data pauses recovery. A storage change from another tab also pauses recovery to reduce overwrite risk; this is not a multi-user synchronization system.

Imports are validated before the user confirms replacing the current drawing. File replacement is undoable. No cloud synchronization or authentication is implemented.

## Extension rules

1. Extend domain types and pure geometry before adding renderers for Phase 2/3 shapes.
2. Put wall assemblies and furniture parameters in dedicated domain modules.
3. Keep drawing state separate from transient UI state.
4. Reuse shared parsing, snapping, validation and editor components.
5. Keep imported data untrusted. Never spread raw imported objects into state.
6. Test conversions, geometry and persistence invariants. Verify browser interactions separately.
7. Preserve this structure; do not put new subsystems back in App.tsx.

## Phase 2 shape rules

- `rectangle`, `square`, `circle`, `ellipse`, `triangle`, `arc`, and `text` use top-left actual-mm bounds. Center-rendered Konva shapes are adapted only in the canvas layer.
- The streamlined palette creates rectangles and circles only. Either may use independent width/height to represent a square, rectangle, circle, or ellipse. Legacy `square` and `ellipse` records remain supported for older drawings but are not offered as new tools.
- `line`, `polyline`, and `polygon` use local points relative to their actual-mm bounds. Resizing scales their point list deliberately; moving changes only their bounds origin.
- Lines finish on their second click. Connected lines and polygons finish with Enter and cancel with Escape. Draft points are UI state and are never saved.
- Rotations are stored in degrees. Arc start/end angles are stored in degrees and must differ.
- Normal snapping targets nearby corners, centers, and path vertices before the configured physical grid. Dragging compares every unrotated bounding-box anchor of the moved shape, so visible corners and centers can align. The sidebar reports object snap, grid snap, or Alt free placement.
- The current snap targets intentionally stay simple and predictable. Wall-aware joins and face-to-face snapping belong to Phase 3.

## Phase 3 wall rules

- A `wall` is a two-endpoint path with a named `wallType` and a separate, actual-millimeter `wallThicknessMm`. Its endpoints remain local points relative to its bounds, like other paths.
- Wall categories and editable default thicknesses are defined only in `src/domain/walls.ts`; canvas components do not contain wall-assembly rules.
- Defaults are drafting starting points, not building-code or construction claims. Future location/year guidance must be researched, cited, clearly scoped, and never silently alter a user-entered thickness.
- The canvas derives a restrained visual shorthand from the wall category: masonry joint marks, concrete stipple, double separation lines, corridor dash marks, or a solid interior partition. It is a readability aid, not proof of concealed construction or a substitute for a material legend.
- Wall rendering adapts the stored centerline and physical thickness into a Konva line. The Zustand drawing store remains the persistent source of truth.
- Exact wall-length editing is a dedicated wall-store mutation, not a generic width/height edit. It preserves the first endpoint and local direction, then adjusts the rotated root origin so that promise remains true after rotation.
- Wall-aware snapping is pure geometry: a first endpoint can join the finite centerline of another wall, while a connecting second endpoint and wall movement stop at the nearest visible face using the target wall's stored thickness. This supports clean T-junctions without crossing the target centerline. It never snaps to a wall's infinite extension, and Alt retains raw/free placement.
- An unfinished measurement is transient canvas UI state. A completed measurement becomes a validated `measurement` path in the drawing document, so it participates in selection, movement, resizing, deletion, undo/redo, recovery, downloads, and imports like other drawing objects.
