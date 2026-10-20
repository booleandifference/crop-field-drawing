# Crop Field Drawing

An interactive drawing tool that generates tractor track patterns for crop fields. Draw a field boundary and obstacles, and the app fills the field with parallel tracks, headland zones and curved headland turns, ready to export as an SVG for a pen plotter.

Part of an art practice exploring computational geometry and agricultural patterns. See [PROCESS_DOCUMENTATION.md](PROCESS_DOCUMENTATION.md) for the development story.

## Running it

No build step. Open `index.html` in a modern browser, or serve the folder:

```bash
npx serve .
```

An internet connection is needed: [JSTS](https://github.com/bjornharrtell/jsts) (the geometry library) loads from a CDN.

## How to use

### Draw
| Action | Input |
|---|---|
| Add a point | Click |
| Close the polygon | Double-click |
| Remove the last point | **Undo Last Point** |
| Zoom | Mouse wheel |
| Pan | Middle-mouse drag, or Ctrl + left drag |

1. **Draw Boundary** (default mode): click out the field outline and double-click to close it.
2. **Draw Obstacle**: once the boundary is closed, draw any number of obstacles (trees, ponds, pylons) inside it, double-clicking to close each one.

Coordinates are in metres. The header shows zoom level and cursor position.

### Generate
Click **Generate Tracks**. After that, changing a setting regenerates the tracks right away.

| Setting | Meaning |
|---|---|
| Track Width (m) | Spacing between parallel tracks (0.5–10, default 3) |
| Headland Buffer (× track width) | How far the working zone is pulled in from the boundary, and how far obstacles are pushed out (0.5–2.0) |
| Track Angle (°) | Track direction. **Auto** aligns tracks with the longest boundary edge, rounded to 15° |
| Reference Point Distance (× track width) | How far the turn's construction points sit from where a track meets the edge |
| Wheel Track Pattern | Min/max dash and gap lengths (px) for the random dashed wheel-track lines |

### Show / hide
Each layer can be toggled on its own:

- **Curves:** tracks, headland turns, working zone, buffered obstacles, wheel tracks
- **Visual aids:** angles, distances, reference points, Bézier control points, track labels (A, B, C… with lengths)

### Import / export
- **Export JSON / Import JSON:** saves and loads the boundary, obstacles and track settings.
- **Export SVG:** writes the visible layers as an SVG on a white background for pen plotting. Only layers that are switched on are exported, and the SVG uses the current zoom and pan (screen pixels, not metres).

## How it works

1. **Working zone.** The boundary is buffered inward by `track width × headland buffer` with JSTS, then the corners are filleted.
2. **Obstacle exclusion.** Each obstacle is buffered outward by the same distance with rounded joins.
3. **Tracks.** Parallel lines at the chosen angle are swept across the field, clipped to the working zone, and cut wherever they cross a buffered obstacle.
4. **Reference points.** Wherever a track meets the working-zone edge or an obstacle, three construction points are placed:
   - the intersection point
   - an extension point back along the track
   - guide points found by walking along the edge in both directions
5. **Headland turns.** A cubic Bézier curve runs from the extension point to each guide point. Its control points sit at the midpoints between the intersection point and each end, a rule worked out by testing in Rhino.

The turns are drawn as a visual pattern: each intersection gets curves in both directions, so they don't form a single continuous tractor route.

## Project structure

```
├── index.html               UI and canvas
├── styles.css               Paper/pencil drafting-table styling
├── viewport.js              Pan/zoom and world (m) ↔ screen (px) conversion
├── geometry.js              GeometryUtils: buffering, clipping, tracks, reference points, curves
├── app.js                   CropFieldApp: input, state, rendering, import/export
├── test.html                Script-loading smoke test
├── functions/               Python Firebase Cloud Functions (Shapely): track and angle calculation
├── firebase.json            Firebase Hosting + Functions config
├── firebase-config.js       Firestore save/load helpers (commented out)
├── FIREBASE_DEPLOYMENT.md   Deployment guide
└── FIREBASE_QUICKSTART.md   Quick Firebase setup
```

The Firebase pieces are optional and not wired up yet. The app runs entirely in the browser, and `.firebaserc` still has a placeholder project ID.

## Ideas

- Join the turns into one continuous tractor route
- Export SVG in real-world units (mm/m) regardless of zoom
- Other turn styles (omega, teardrop, fish-hook) and multiple headland passes
- Import real field boundaries (GeoJSON, GPS)
- Animate a tractor driving the pattern
