/**
 * Viewport Transformation System
 * Handles conversion between world coordinates (meters) and screen coordinates (pixels)
 * Similar to AutoCAD/Rhino viewport behavior
 */

class Viewport {
    constructor(canvas) {
        this.canvas = canvas;

        // World coordinate system (meters)
        this.worldOriginX = 0;  // World coordinates of viewport center
        this.worldOriginY = 0;

        // Scale: pixels per meter
        this.scale = 10;  // Start with 10 pixels = 1 meter

        // Pan offset (in screen pixels from center)
        this.panX = 0;
        this.panY = 0;

        // Zoom limits
        this.minScale = 0.1;   // Max zoom out (0.1 px/meter)
        this.maxScale = 100;   // Max zoom in (100 px/meter)

        // For panning
        this.isPanning = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
    }

    /**
     * Convert screen coordinates to world coordinates
     */
    screenToWorld(screenX, screenY) {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        // Offset from canvas center
        const offsetX = screenX - centerX;
        const offsetY = screenY - centerY;

        // Convert to world coordinates
        // Note: Y-axis is inverted (screen Y increases downward, world Y increases upward)
        const worldX = this.worldOriginX + (offsetX - this.panX) / this.scale;
        const worldY = this.worldOriginY - (offsetY - this.panY) / this.scale;

        return { x: worldX, y: worldY };
    }

    /**
     * Convert world coordinates to screen coordinates
     */
    worldToScreen(worldX, worldY) {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        // Offset from world origin
        const offsetX = (worldX - this.worldOriginX) * this.scale;
        const offsetY = -(worldY - this.worldOriginY) * this.scale;  // Invert Y

        // Convert to screen coordinates
        const screenX = centerX + offsetX + this.panX;
        const screenY = centerY + offsetY + this.panY;

        return { x: screenX, y: screenY };
    }

    /**
     * Convert world distance to screen distance
     */
    worldToScreenDistance(worldDistance) {
        return worldDistance * this.scale;
    }

    /**
     * Convert screen distance to world distance
     */
    screenToWorldDistance(screenDistance) {
        return screenDistance / this.scale;
    }

    /**
     * Zoom in/out around a specific screen point
     */
    zoom(factor, screenX, screenY) {
        // Get world coordinate at mouse position before zoom
        const worldBefore = this.screenToWorld(screenX, screenY);

        // Apply zoom
        const newScale = this.scale * factor;
        this.scale = Math.max(this.minScale, Math.min(this.maxScale, newScale));

        // Get world coordinate at same screen position after zoom
        const worldAfter = this.screenToWorld(screenX, screenY);

        // Adjust origin to keep the point under cursor stationary
        this.worldOriginX += worldBefore.x - worldAfter.x;
        this.worldOriginY += worldBefore.y - worldAfter.y;
    }

    /**
     * Pan the viewport
     */
    pan(deltaX, deltaY) {
        this.panX += deltaX;
        this.panY += deltaY;
    }

    /**
     * Fit all geometry to view
     */
    fitToView(points, padding = 1.2) {
        if (!points || points.length === 0) return;

        // Find bounding box in world coordinates
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        for (const point of points) {
            minX = Math.min(minX, point.x);
            maxX = Math.max(maxX, point.x);
            minY = Math.min(minY, point.y);
            maxY = Math.max(maxY, point.y);
        }

        const width = maxX - minX;
        const height = maxY - minY;

        if (width === 0 && height === 0) return;

        // Calculate scale to fit
        const scaleX = this.canvas.width / (width * padding);
        const scaleY = this.canvas.height / (height * padding);
        this.scale = Math.min(scaleX, scaleY);

        // Center on geometry
        this.worldOriginX = (minX + maxX) / 2;
        this.worldOriginY = (minY + maxY) / 2;
        this.panX = 0;
        this.panY = 0;
    }

    /**
     * Reset viewport to default
     */
    reset() {
        this.worldOriginX = 0;
        this.worldOriginY = 0;
        this.scale = 10;
        this.panX = 0;
        this.panY = 0;
    }

    /**
     * Get current zoom level as a percentage (100% = 1:1 scale)
     */
    getZoomPercent() {
        // Assuming 1 meter = 100 pixels at 100% zoom
        return (this.scale / 100) * 100;
    }

    /**
     * Get visible world bounds
     */
    getVisibleBounds() {
        const topLeft = this.screenToWorld(0, 0);
        const bottomRight = this.screenToWorld(this.canvas.width, this.canvas.height);

        return {
            minX: topLeft.x,
            maxX: bottomRight.x,
            minY: bottomRight.y,  // Y is inverted
            maxY: topLeft.y,
            width: bottomRight.x - topLeft.x,
            height: topLeft.y - bottomRight.y
        };
    }

    /**
     * Start panning operation
     */
    startPan(screenX, screenY) {
        this.isPanning = true;
        this.lastMouseX = screenX;
        this.lastMouseY = screenY;
    }

    /**
     * Update panning
     */
    updatePan(screenX, screenY) {
        if (!this.isPanning) return;

        const deltaX = screenX - this.lastMouseX;
        const deltaY = screenY - this.lastMouseY;

        this.pan(deltaX, deltaY);

        this.lastMouseX = screenX;
        this.lastMouseY = screenY;
    }

    /**
     * End panning operation
     */
    endPan() {
        this.isPanning = false;
    }
}
