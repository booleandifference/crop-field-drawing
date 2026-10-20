# Crop Field Tractor Track Simulator

A web-based drawing application that simulates tractor tracks in crop fields with boundaries and obstacles.

## Features

- **Interactive Drawing**: Draw field boundaries and obstacles using point-and-click
- **Headland Buffering**: Automatically creates a buffer zone around field boundaries (1.0-2.0x track width)
- **Obstacle Exclusion**: Creates exclusion zones around obstacles with the same buffer distance
- **Track Generation**: Generates parallel tractor tracks that respect boundaries and avoid obstacles
- **Auto-Angle Detection**: Automatically calculates optimal track angle based on the longest field edge
- **Visual Headland Display**: Color-coded zones showing headland (turning area) vs working zone
- **Customizable Settings**:
  - Track width (10-100 pixels)
  - Headland buffer multiplier (0.5-2.0x track width)
  - Track angle (0-180 degrees in 15-degree increments)
  - Auto-angle button for optimal angle calculation

## How to Use

### 1. Getting Started
Simply open `index.html` in a modern web browser (Chrome, Firefox, Edge, Safari).

### 2. Drawing a Field Boundary
1. Click the "Draw Boundary" button (active by default)
2. Click on the canvas to add points for your field boundary
3. **Double-click** to close the polygon and complete the boundary

### 3. Adding Obstacles (Optional)
1. Click the "Draw Obstacle" button
2. Click on the canvas to add points for obstacles (trees, rocks, ponds, etc.)
3. **Double-click** to close each obstacle polygon
4. You can add multiple obstacles by repeating this process

### 4. Generating Tracks
1. Adjust the settings if desired:
   - **Track Width**: Distance between parallel tracks
   - **Headland Buffer**: Space around boundaries for turning (multiplier of track width)
   - **Track Angle**: Direction of the tracks in degrees
   - Click **"Auto"** next to Track Angle to automatically calculate the optimal angle based on your field's longest edge
2. Click "Generate Tracks" to create the tractor path lines

**Tip**: The auto-angle feature aligns tracks parallel to the longest field edge, minimizing turns and optimizing coverage!

### 5. Additional Controls
- **Clear Tracks**: Remove generated tracks while keeping boundaries and obstacles
- **Clear All**: Reset the entire canvas
- **Undo Last Point**: Remove the last point added to the current polygon

## Technical Implementation

### The Headland Rule
Based on the Gemini analysis, the application implements a "headland" buffer zone:
- The boundary polygon is buffered **inward** by `1.0 × Track Width` (configurable)
- This creates a turning space for the tractor
- Tracks never touch the red boundary line

### Obstacle Exclusion Zones
Obstacles are treated similarly to boundaries:
- Each obstacle is buffered **outward** by the same headland distance
- Tracks are clipped to avoid these exclusion zones
- Creates a safe margin around obstacles

### Track Generation Algorithm
1. Calculate the "Safe Working Zone" by buffering the boundary inward
2. Buffer all obstacles outward
3. Generate parallel lines at the specified angle and spacing
4. Clip lines to the working zone
5. Remove line segments that intersect with buffered obstacles

## File Structure

```
Crop field drawing app/
├── index.html      # Main HTML structure
├── styles.css      # Styling and layout
├── geometry.js     # Geometry utilities (buffering, clipping, line generation)
├── app.js          # Main application logic
└── README.md       # This file
```

## Browser Compatibility

Works in all modern browsers that support:
- HTML5 Canvas
- ES6+ JavaScript (classes, arrow functions, etc.)

## Future Enhancements

Potential improvements:
- Save/load field configurations (JSON export/import)
- Field decomposition for complex polygons (split into convex sub-regions)
- Auto-angle detection (align to longest edge)
- Multiple track patterns (alternating angles, spiral, etc.)
- Real-world units (meters instead of pixels)
- Image import for tracing existing fields

## Based on Gemini Analysis

This application implements the geometric logic derived from analyzing 17 crop field drawings, with the key principles:
- Headland buffer = 1.0-1.2 × Track Width
- Obstacle buffer = same as headland
- Parallel track spacing = Track Width
- Tracks never touch boundaries or obstacles

## License

Free to use and modify for educational and agricultural purposes.
