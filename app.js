/**
 * Crop Field Tractor Track Simulator
 * Main application logic
 */

class CropFieldApp {
    constructor() {
        console.log('Initializing CropFieldApp...');

        this.canvas = document.getElementById('fieldCanvas');
        console.log('Canvas element:', this.canvas);

        if (!this.canvas) {
            console.error('ERROR: Canvas element not found!');
            alert('Error: Canvas element not found. Please refresh the page.');
            return;
        }

        this.ctx = this.canvas.getContext('2d');
        console.log('Canvas context:', this.ctx);

        if (!this.ctx) {
            console.error('ERROR: Could not get 2D context!');
            alert('Error: Could not initialize canvas. Please use a modern browser.');
            return;
        }

        // Drawing state - INITIALIZE BEFORE resizeCanvas!
        this.mode = 'boundary'; // 'boundary' or 'obstacle'
        this.boundaryPoints = [];
        this.boundaryComplete = false;
        this.obstacles = []; // Array of obstacle polygons
        this.currentObstacle = [];

        // Track generation
        this.tracks = [];
        this.headlandTurns = []; // Curved turning paths
        this.workingZone = null;
        this.bufferedObstacles = [];

        // Reference points for visualization
        this.referencePoints = {
            intersectionPoints: [],
            trackExtensionPoints: [],
            boundaryGuidePoints: []
        };

        // Initialize viewport (vector coordinate system)
        this.viewport = new Viewport(this.canvas);

        // Set canvas size
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        // Settings (now in meters, not pixels!)
        this.trackWidth = 3.0;  // 3 meters
        this.headlandBuffer = 1.0;
        this.trackAngle = 0;
        this.referencePointDistance = 0.3;  // Distance multiplier for reference points

        // Wheel track pattern settings
        this.minDash = 3;
        this.maxDash = 15;
        this.minGap = 2;
        this.maxGap = 25;

        // Curve visibility toggles
        this.showTracks = true;
        this.showHeadlandTurns = true;
        this.showWorkingZone = true;
        this.showBufferedObstacles = true;
        this.showWheelTracks = false; // Off by default

        // Visual aids toggles
        this.showAngles = true;
        this.showDistances = true;
        this.showReferencePoints = true;
        this.showControlPoints = true;
        this.showTrackLabels = true;

        console.log('Initializing UI...');
        // Initialize UI
        this.initializeUI();

        console.log('First render...');
        this.render();

        // Canvas text uses web fonts, so redraw once they have loaded
        document.fonts.ready.then(() => this.render());

        console.log('CropFieldApp initialized successfully!');
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();

        // Set canvas size to exactly match the container (it has no border)
        this.canvas.width = Math.floor(rect.width);
        this.canvas.height = Math.floor(rect.height);

        // Update viewport canvas reference
        if (this.viewport) {
            this.viewport.canvas = this.canvas;
        }

        this.render();
    }

    initializeUI() {
        // Mode buttons
        document.getElementById('drawBoundaryBtn').addEventListener('click', () => {
            this.setMode('boundary');
        });

        document.getElementById('drawObstacleBtn').addEventListener('click', () => {
            this.setMode('obstacle');
        });

        // Settings inputs
        document.getElementById('trackWidth').addEventListener('input', (e) => {
            this.trackWidth = parseFloat(e.target.value);
            if (this.tracks.length > 0) {
                this.generateTracks();
            }
        });

        document.getElementById('headlandBuffer').addEventListener('input', (e) => {
            this.headlandBuffer = parseFloat(e.target.value);
            if (this.tracks.length > 0) {
                this.generateTracks();
            }
        });

        document.getElementById('trackAngle').addEventListener('input', (e) => {
            this.trackAngle = parseFloat(e.target.value);
            if (this.tracks.length > 0) {
                this.generateTracks();
            }
        });

        document.getElementById('referencePointDistance').addEventListener('input', (e) => {
            this.referencePointDistance = parseFloat(e.target.value);
            if (this.tracks.length > 0) {
                this.generateTracks();
            }
        });

        // Auto angle button
        document.getElementById('autoAngleBtn').addEventListener('click', () => {
            this.autoCalculateAngle();
        });

        // Wheel track pattern sliders
        document.getElementById('minDash').addEventListener('input', (e) => {
            this.minDash = parseFloat(e.target.value);
            document.getElementById('minDashValue').textContent = this.minDash.toFixed(1);
            this.render();
        });

        document.getElementById('maxDash').addEventListener('input', (e) => {
            this.maxDash = parseFloat(e.target.value);
            document.getElementById('maxDashValue').textContent = this.maxDash.toFixed(0);
            this.render();
        });

        document.getElementById('minGap').addEventListener('input', (e) => {
            this.minGap = parseFloat(e.target.value);
            document.getElementById('minGapValue').textContent = this.minGap.toFixed(1);
            this.render();
        });

        document.getElementById('maxGap').addEventListener('input', (e) => {
            this.maxGap = parseFloat(e.target.value);
            document.getElementById('maxGapValue').textContent = this.maxGap.toFixed(0);
            this.render();
        });

        // Curve visibility checkboxes
        document.getElementById('showTracks').addEventListener('change', (e) => {
            this.showTracks = e.target.checked;
            this.render();
        });

        document.getElementById('showHeadlandTurns').addEventListener('change', (e) => {
            this.showHeadlandTurns = e.target.checked;
            this.render();
        });

        document.getElementById('showWorkingZone').addEventListener('change', (e) => {
            this.showWorkingZone = e.target.checked;
            this.render();
        });

        document.getElementById('showBufferedObstacles').addEventListener('change', (e) => {
            this.showBufferedObstacles = e.target.checked;
            this.render();
        });

        document.getElementById('showWheelTracks').addEventListener('change', (e) => {
            this.showWheelTracks = e.target.checked;
            this.render();
        });

        // Visual aids checkboxes
        document.getElementById('showAngles').addEventListener('change', (e) => {
            this.showAngles = e.target.checked;
            this.render();
        });

        document.getElementById('showDistances').addEventListener('change', (e) => {
            this.showDistances = e.target.checked;
            this.render();
        });

        document.getElementById('showReferencePoints').addEventListener('change', (e) => {
            this.showReferencePoints = e.target.checked;
            this.render();
        });

        document.getElementById('showControlPoints').addEventListener('change', (e) => {
            this.showControlPoints = e.target.checked;
            this.render();
        });

        document.getElementById('showTrackLabels').addEventListener('change', (e) => {
            this.showTrackLabels = e.target.checked;
            this.render();
        });

        // Action buttons
        document.getElementById('generateTracksBtn').addEventListener('click', () => {
            this.generateTracks();
        });

        document.getElementById('clearTracksBtn').addEventListener('click', () => {
            this.clearTracks();
        });

        document.getElementById('clearAllBtn').addEventListener('click', () => {
            this.clearAll();
        });

        document.getElementById('undoBtn').addEventListener('click', () => {
            this.undoLastPoint();
        });

        // Import/Export buttons
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportToJSON();
        });

        document.getElementById('importBtn').addEventListener('click', () => {
            document.getElementById('fileInput').click();
        });

        document.getElementById('fileInput').addEventListener('change', (e) => {
            this.importFromJSON(e);
        });

        document.getElementById('exportSvgBtn').addEventListener('click', () => {
            this.exportToSVG();
        });

        // Hide all / Show all for each checkbox section (Layers, Visual aids)
        for (const button of document.querySelectorAll('.toggle-all')) {
            const boxes = [...button.closest('.control-section').querySelectorAll('input[type="checkbox"]')];
            const updateLabel = () => {
                button.textContent = boxes.some(box => box.checked) ? 'Hide all' : 'Show all';
            };

            button.addEventListener('click', () => {
                const show = !boxes.some(box => box.checked);
                for (const box of boxes) {
                    if (box.checked !== show) {
                        box.checked = show;
                        box.dispatchEvent(new Event('change'));
                    }
                }
            });

            for (const box of boxes) {
                box.addEventListener('change', updateLabel);
            }
            updateLabel();
        }

        // Canvas events
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        this.canvas.addEventListener('dblclick', (e) => this.handleDoubleClick(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));

        // Viewport controls (CAD-style)
        this.canvas.addEventListener('wheel', (e) => this.handleWheel(e));
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('mouseleave', (e) => this.handleMouseUp(e));
    }

    setMode(mode) {
        this.mode = mode;

        // Update button states
        document.getElementById('drawBoundaryBtn').classList.toggle('active', mode === 'boundary');
        document.getElementById('drawObstacleBtn').classList.toggle('active', mode === 'obstacle');
    }

    handleClick(e) {
        // Don't draw if panning
        if (this.viewport.isPanning) return;

        const rect = this.canvas.getBoundingClientRect();
        // Use offsetX/offsetY which are relative to the canvas element itself
        const screenX = e.offsetX;
        const screenY = e.offsetY;

        // Convert to world coordinates
        const point = this.viewport.screenToWorld(screenX, screenY);

        if (this.mode === 'boundary' && !this.boundaryComplete) {
            this.boundaryPoints.push(point);
        } else if (this.mode === 'obstacle' && this.boundaryComplete) {
            this.currentObstacle.push(point);
        }

        this.render();
    }

    handleDoubleClick(e) {
        e.preventDefault();

        if (this.mode === 'boundary' && this.boundaryPoints.length >= 3) {
            this.boundaryComplete = true;
            console.log('Boundary complete with', this.boundaryPoints.length, 'points');
        } else if (this.mode === 'obstacle' && this.currentObstacle.length >= 3) {
            this.obstacles.push([...this.currentObstacle]);
            this.currentObstacle = [];
            console.log('Obstacle added. Total obstacles:', this.obstacles.length);
        }

        this.render();
    }

    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        // Use offsetX/offsetY which are relative to the canvas element itself
        const screenX = e.offsetX;
        const screenY = e.offsetY;

        // Update world coordinates for cursor
        const worldPos = this.viewport.screenToWorld(screenX, screenY);
        this.mouseWorldX = worldPos.x;
        this.mouseWorldY = worldPos.y;

        // Update viewport info display
        this.updateViewportInfo();

        // Handle panning
        if (this.viewport.isPanning) {
            this.viewport.updatePan(screenX, screenY);
            this.render();
            return;
        }

        // Store screen coordinates for preview line rendering
        this.mouseX = screenX;
        this.mouseY = screenY;

        // Render to show preview line
        if ((this.mode === 'boundary' && this.boundaryPoints.length > 0 && !this.boundaryComplete) ||
            (this.mode === 'obstacle' && this.currentObstacle.length > 0)) {
            this.render();
        }
    }

    handleWheel(e) {
        e.preventDefault();

        // Zoom in/out with mouse wheel
        // Use offsetX/offsetY which are relative to the canvas element itself
        const screenX = e.offsetX;
        const screenY = e.offsetY;

        const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
        this.viewport.zoom(zoomFactor, screenX, screenY);

        this.updateViewportInfo();
        this.render();
    }

    handleMouseDown(e) {
        // Middle mouse button (or ctrl+left) for panning
        if (e.button === 1 || (e.button === 0 && e.ctrlKey)) {
            e.preventDefault();
            // Use offsetX/offsetY which are relative to the canvas element itself
            this.viewport.startPan(e.offsetX, e.offsetY);
            this.canvas.style.cursor = 'grab';
        }
    }

    handleMouseUp(e) {
        if (this.viewport.isPanning) {
            this.viewport.endPan();
            this.canvas.style.cursor = 'crosshair';
        }
    }

    updateViewportInfo() {
        // Update zoom level display
        const zoomElement = document.getElementById('viewportZoom');
        if (zoomElement) {
            zoomElement.textContent = `Zoom: ${this.viewport.getZoomPercent().toFixed(0)}%`;
        }

        // Update cursor coordinates display
        const coordsElement = document.getElementById('viewportCoords');
        if (coordsElement && this.mouseWorldX !== undefined) {
            coordsElement.textContent = `X: ${this.mouseWorldX.toFixed(2)}m Y: ${this.mouseWorldY.toFixed(2)}m`;
        }
    }

    undoLastPoint() {
        if (this.mode === 'boundary' && !this.boundaryComplete && this.boundaryPoints.length > 0) {
            this.boundaryPoints.pop();
        } else if (this.mode === 'obstacle' && this.currentObstacle.length > 0) {
            this.currentObstacle.pop();
        }
        this.render();
    }

    clearTracks() {
        this.tracks = [];
        this.headlandTurns = [];
        this.workingZone = null;
        this.bufferedObstacles = [];
        this.referencePoints = {
            intersectionPoints: [],
            trackExtensionPoints: [],
            boundaryGuidePoints: []
        };
        this.render();
    }

    clearAll() {
        this.boundaryPoints = [];
        this.boundaryComplete = false;
        this.obstacles = [];
        this.currentObstacle = [];
        this.clearTracks();
    }

    autoCalculateAngle() {
        if (!this.boundaryComplete || this.boundaryPoints.length < 3) {
            alert('Please draw a boundary first (double-click to complete)');
            return;
        }

        // Calculate optimal angle based on longest edge
        const optimalAngle = GeometryUtils.findOptimalAngle(this.boundaryPoints);

        // Round to nearest 15 degrees for cleaner angles
        const roundedAngle = Math.round(optimalAngle / 15) * 15;

        // Update UI and internal state
        this.trackAngle = roundedAngle;
        document.getElementById('trackAngle').value = roundedAngle;

        console.log(`Auto-calculated angle: ${optimalAngle.toFixed(1)}° (rounded to ${roundedAngle}°)`);

        // Regenerate tracks if they exist
        if (this.tracks.length > 0) {
            this.generateTracks();
        }
    }

    exportToJSON() {
        const data = {
            version: "1.0",
            boundary: this.boundaryPoints,
            boundaryComplete: this.boundaryComplete,
            obstacles: this.obstacles,
            settings: {
                trackWidth: this.trackWidth,
                headlandBuffer: this.headlandBuffer,
                trackAngle: this.trackAngle
            }
        };

        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `field-${Date.now()}.json`;
        a.click();

        URL.revokeObjectURL(url);
        console.log('Field data exported');
    }

    importFromJSON(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);

                // Validate data
                if (!data.boundary || !Array.isArray(data.boundary)) {
                    alert('Invalid JSON file: missing boundary data');
                    return;
                }

                // Load data
                this.boundaryPoints = data.boundary || [];
                this.boundaryComplete = data.boundaryComplete || false;
                this.obstacles = data.obstacles || [];
                this.currentObstacle = [];

                // Load settings if available
                if (data.settings) {
                    this.trackWidth = data.settings.trackWidth || 30;
                    this.headlandBuffer = data.settings.headlandBuffer || 1.0;
                    this.trackAngle = data.settings.trackAngle || 0;

                    // Update UI
                    document.getElementById('trackWidth').value = this.trackWidth;
                    document.getElementById('headlandBuffer').value = this.headlandBuffer;
                    document.getElementById('trackAngle').value = this.trackAngle;
                }

                // Clear tracks
                this.clearTracks();

                // Render
                this.render();

                console.log('Field data imported successfully');
                alert('Field imported successfully!');
            } catch (error) {
                console.error('Import error:', error);
                alert('Error importing file: ' + error.message);
            }
        };

        reader.readAsText(file);

        // Reset file input
        event.target.value = '';
    }

    exportToSVG() {
        try {
            // Create SVG namespace and document
            const svgNS = "http://www.w3.org/2000/svg";
            const width = this.canvas.width;
            const height = this.canvas.height;

            // Build SVG string manually
            let svgParts = [];
            svgParts.push(`<?xml version="1.0" encoding="UTF-8"?>`);
            svgParts.push(`<svg xmlns="${svgNS}" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`);

            // White background for pen plotting
            svgParts.push(`<rect width="${width}" height="${height}" fill="#ffffff"/>`);

            // Helper function to convert points array to SVG path (closed)
            const pointsToPath = (points) => {
                if (!points || points.length === 0) return '';
                const screenPoints = points.map(p => this.viewport.worldToScreen(p.x, p.y));
                let path = `M ${screenPoints[0].x} ${screenPoints[0].y}`;
                for (let i = 1; i < screenPoints.length; i++) {
                    path += ` L ${screenPoints[i].x} ${screenPoints[i].y}`;
                }
                return path + ' Z';
            };

            // Helper function to convert points array to SVG path (non-closed)
            const pointsToPolyline = (points) => {
                if (!points || points.length === 0) return '';
                const screenPoints = points.map(p => this.viewport.worldToScreen(p.x, p.y));
                let path = `M ${screenPoints[0].x} ${screenPoints[0].y}`;
                for (let i = 1; i < screenPoints.length; i++) {
                    path += ` L ${screenPoints[i].x} ${screenPoints[i].y}`;
                }
                return path;
            };

            // Draw tracks (if enabled)
            if (this.showTracks && this.tracks && this.tracks.length > 0) {
                for (const track of this.tracks) {
                    if (!track || track.length !== 2) continue;
                    const [start, end] = track;
                    const screenStart = this.viewport.worldToScreen(start.x, start.y);
                    const screenEnd = this.viewport.worldToScreen(end.x, end.y);
                    svgParts.push(`<line x1="${screenStart.x}" y1="${screenStart.y}" x2="${screenEnd.x}" y2="${screenEnd.y}" stroke="#000000" stroke-width="1.5"/>`);
                }
            }

            // Draw headland turns (if enabled)
            if (this.showHeadlandTurns && this.headlandTurns && this.headlandTurns.length > 0) {
                for (const turnData of this.headlandTurns) {
                    const turn = turnData.points || turnData;
                    if (!turn || turn.length < 2) continue;
                    const path = pointsToPolyline(turn);
                    svgParts.push(`<path d="${path}" stroke="#000000" stroke-width="1" stroke-dasharray="4,4" fill="none"/>`);
                }
            }

            // Draw working zone (if enabled)
            if (this.showWorkingZone && this.workingZone && this.workingZone.length > 0) {
                const path = pointsToPath(this.workingZone);
                svgParts.push(`<path d="${path}" stroke="#000000" stroke-width="1" fill="none"/>`);
            }

            // Draw buffered obstacles (if enabled)
            if (this.showBufferedObstacles && this.bufferedObstacles && this.bufferedObstacles.length > 0) {
                for (const obstacle of this.bufferedObstacles) {
                    if (!obstacle || obstacle.length === 0) continue;
                    const path = pointsToPath(obstacle);
                    svgParts.push(`<path d="${path}" stroke="#000000" stroke-width="1" fill="none"/>`);
                }
            }

            // Draw wheel tracks (if enabled)
            // Mirrors drawWheelTracks(): same shapes and the same seeded random dash patterns
            if (this.showWheelTracks && this.tracks && this.tracks.length > 0) {
                const wheelOffset = this.trackWidth / 10;
                const dashArray = (seed) => this.generateRandomDashPattern(seed, this.minDash, this.maxDash, this.minGap, this.maxGap, 30)
                    .map(v => v.toFixed(2)).join(',');
                const pushWheelPath = (points, seed, closed) => {
                    if (points.length === 0) return;
                    const path = closed ? pointsToPath(points) : pointsToPolyline(points);
                    svgParts.push(`<path d="${path}" stroke="#000000" stroke-width="0.5" stroke-dasharray="${dashArray(seed)}" fill="none"/>`);
                };

                // Working zone wheel tracks
                if (this.workingZone && this.workingZone.length > 0) {
                    pushWheelPath(GeometryUtils.offsetPolyline(this.workingZone, wheelOffset), 1001, true);
                    pushWheelPath(GeometryUtils.offsetPolyline(this.workingZone, -wheelOffset), 2002, true);
                }

                // Buffered obstacles wheel tracks
                if (this.bufferedObstacles && this.bufferedObstacles.length > 0) {
                    for (let i = 0; i < this.bufferedObstacles.length; i++) {
                        const obstacle = this.bufferedObstacles[i];
                        if (!obstacle || obstacle.length < 3) continue;

                        pushWheelPath(GeometryUtils.offsetPolyline(obstacle, wheelOffset), 7000 + i * 2, true);
                        pushWheelPath(GeometryUtils.offsetPolyline(obstacle, -wheelOffset), 8000 + i * 2, true);
                    }
                }

                // Straight tracks wheel tracks
                for (let i = 0; i < this.tracks.length; i++) {
                    const track = this.tracks[i];
                    if (!track || !Array.isArray(track) || track.length !== 2) continue;

                    const [start, end] = track;
                    if (!start || !end) continue;

                    pushWheelPath(GeometryUtils.offsetLine(start, end, wheelOffset), 3000 + i * 2, false);
                    pushWheelPath(GeometryUtils.offsetLine(start, end, -wheelOffset), 4000 + i * 2, false);
                }

                // Headland turns wheel tracks
                if (this.headlandTurns && this.headlandTurns.length > 0) {
                    for (let i = 0; i < this.headlandTurns.length; i++) {
                        const turnData = this.headlandTurns[i];
                        const turn = turnData.points || turnData;
                        if (!turn || turn.length < 2) continue;

                        pushWheelPath(GeometryUtils.offsetPolyline(turn, wheelOffset), 5000 + i * 2, false);
                        pushWheelPath(GeometryUtils.offsetPolyline(turn, -wheelOffset), 6000 + i * 2, false);
                    }
                }
            }

            // Draw field boundary and obstacles (always visible on the canvas)
            if (this.boundaryPoints.length > 0) {
                const path = this.boundaryComplete ? pointsToPath(this.boundaryPoints) : pointsToPolyline(this.boundaryPoints);
                svgParts.push(`<path d="${path}" stroke="#000000" stroke-width="1.5" fill="none"/>`);
            }
            for (const obstacle of this.obstacles) {
                svgParts.push(`<path d="${pointsToPath(obstacle)}" stroke="#000000" stroke-width="1.5" fill="none"/>`);
            }

            // Draw reference points (if enabled)
            if (this.showReferencePoints && this.referencePoints) {
                const { intersectionPoints, trackExtensionPoints, boundaryGuidePoints } = this.referencePoints;
                const crossSize = 6;

                // Intersection points (red)
                if (intersectionPoints && intersectionPoints.length > 0) {
                    for (const item of intersectionPoints) {
                        const p = item.point;
                        if (!p) continue;
                        const screenPos = this.viewport.worldToScreen(p.x, p.y);
                        // Draw cross
                        svgParts.push(`<line x1="${screenPos.x}" y1="${screenPos.y - crossSize}" x2="${screenPos.x}" y2="${screenPos.y + crossSize}" stroke="#000000" stroke-width="1.5"/>`);
                        svgParts.push(`<line x1="${screenPos.x - crossSize}" y1="${screenPos.y}" x2="${screenPos.x + crossSize}" y2="${screenPos.y}" stroke="#000000" stroke-width="1.5"/>`);
                    }
                }

                // Track extension points
                if (trackExtensionPoints && trackExtensionPoints.length > 0) {
                    for (const item of trackExtensionPoints) {
                        const p = item.point;
                        if (!p) continue;
                        const screenPos = this.viewport.worldToScreen(p.x, p.y);
                        svgParts.push(`<line x1="${screenPos.x}" y1="${screenPos.y - crossSize}" x2="${screenPos.x}" y2="${screenPos.y + crossSize}" stroke="#000000" stroke-width="1"/>`);
                        svgParts.push(`<line x1="${screenPos.x - crossSize}" y1="${screenPos.y}" x2="${screenPos.x + crossSize}" y2="${screenPos.y}" stroke="#000000" stroke-width="1"/>`);

                        // Draw line to intersection point
                        if (item.intersectionPoint) {
                            const screenIntersection = this.viewport.worldToScreen(item.intersectionPoint.x, item.intersectionPoint.y);
                            svgParts.push(`<line x1="${screenPos.x}" y1="${screenPos.y}" x2="${screenIntersection.x}" y2="${screenIntersection.y}" stroke="#000000" stroke-width="1" stroke-dasharray="3,3"/>`);
                        }
                    }
                }

                // Boundary guide points
                if (boundaryGuidePoints && boundaryGuidePoints.length > 0) {
                    for (const item of boundaryGuidePoints) {
                        const p = item.point;
                        if (!p) continue;
                        const screenPos = this.viewport.worldToScreen(p.x, p.y);
                        svgParts.push(`<line x1="${screenPos.x}" y1="${screenPos.y - crossSize}" x2="${screenPos.x}" y2="${screenPos.y + crossSize}" stroke="#000000" stroke-width="1"/>`);
                        svgParts.push(`<line x1="${screenPos.x - crossSize}" y1="${screenPos.y}" x2="${screenPos.x + crossSize}" y2="${screenPos.y}" stroke="#000000" stroke-width="1"/>`);

                        // Draw line to intersection point
                        if (item.intersectionPoint) {
                            const screenIntersection = this.viewport.worldToScreen(item.intersectionPoint.x, item.intersectionPoint.y);
                            svgParts.push(`<line x1="${screenPos.x}" y1="${screenPos.y}" x2="${screenIntersection.x}" y2="${screenIntersection.y}" stroke="#000000" stroke-width="1" stroke-dasharray="3,3"/>`);
                        }
                    }
                }
            }

            // Draw angles (if enabled)
            if (this.showAngles && this.referencePoints && this.referencePoints.intersectionGroups) {
                for (const group of this.referencePoints.intersectionGroups) {
                    const { leftGuidePoint, rightGuidePoint, leftAngle, rightAngle } = group;

                    if (leftGuidePoint && leftAngle !== undefined) {
                        const screenPos = this.viewport.worldToScreen(leftGuidePoint.x, leftGuidePoint.y);
                        const angleText = leftAngle.toFixed(1) + '°';
                        svgParts.push(`<text x="${screenPos.x}" y="${screenPos.y - 10}" text-anchor="middle" font-family="Courier New, monospace" font-size="10" fill="#000000">${angleText}</text>`);
                    }

                    if (rightGuidePoint && rightAngle !== undefined) {
                        const screenPos = this.viewport.worldToScreen(rightGuidePoint.x, rightGuidePoint.y);
                        const angleText = rightAngle.toFixed(1) + '°';
                        svgParts.push(`<text x="${screenPos.x}" y="${screenPos.y - 10}" text-anchor="middle" font-family="Courier New, monospace" font-size="10" fill="#000000">${angleText}</text>`);
                    }
                }
            }

            // Draw distances (if enabled)
            if (this.showDistances && this.referencePoints && this.referencePoints.intersectionGroups) {
                for (const group of this.referencePoints.intersectionGroups) {
                    const { intersectionPoint, extensionPoint, leftGuidePoint, rightGuidePoint } = group;
                    if (!intersectionPoint) continue;

                    // Distance to extension point
                    if (extensionPoint) {
                        const dx = extensionPoint.x - intersectionPoint.x;
                        const dy = extensionPoint.y - intersectionPoint.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        const midX = (intersectionPoint.x + extensionPoint.x) / 2;
                        const midY = (intersectionPoint.y + extensionPoint.y) / 2;
                        const screenMid = this.viewport.worldToScreen(midX, midY);
                        const distText = distance.toFixed(2) + 'm';
                        svgParts.push(`<text x="${screenMid.x}" y="${screenMid.y}" text-anchor="middle" font-family="Courier New, monospace" font-size="9" fill="#000000">${distText}</text>`);
                    }

                    // Distance to left guide point
                    if (leftGuidePoint) {
                        const dx = leftGuidePoint.x - intersectionPoint.x;
                        const dy = leftGuidePoint.y - intersectionPoint.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        const midX = (intersectionPoint.x + leftGuidePoint.x) / 2;
                        const midY = (intersectionPoint.y + leftGuidePoint.y) / 2;
                        const screenMid = this.viewport.worldToScreen(midX, midY);
                        const distText = distance.toFixed(2) + 'm';
                        svgParts.push(`<text x="${screenMid.x}" y="${screenMid.y}" text-anchor="middle" font-family="Courier New, monospace" font-size="9" fill="#000000">${distText}</text>`);
                    }

                    // Distance to right guide point
                    if (rightGuidePoint) {
                        const dx = rightGuidePoint.x - intersectionPoint.x;
                        const dy = rightGuidePoint.y - intersectionPoint.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        const midX = (intersectionPoint.x + rightGuidePoint.x) / 2;
                        const midY = (intersectionPoint.y + rightGuidePoint.y) / 2;
                        const screenMid = this.viewport.worldToScreen(midX, midY);
                        const distText = distance.toFixed(2) + 'm';
                        svgParts.push(`<text x="${screenMid.x}" y="${screenMid.y}" text-anchor="middle" font-family="Courier New, monospace" font-size="9" fill="#000000">${distText}</text>`);
                    }
                }
            }

            // Draw control points (if enabled)
            if (this.showHeadlandTurns && this.showControlPoints && this.headlandTurns && this.headlandTurns.length > 0) {
                for (const turnData of this.headlandTurns) {
                    if (turnData.controlPoints && turnData.startPoint && turnData.endPoint) {
                        const { cp1, cp2 } = turnData.controlPoints;
                        const { startPoint, endPoint } = turnData;

                        // Lines from start/end to control points
                        const screenStart = this.viewport.worldToScreen(startPoint.x, startPoint.y);
                        const screenCp1 = this.viewport.worldToScreen(cp1.x, cp1.y);
                        svgParts.push(`<line x1="${screenStart.x}" y1="${screenStart.y}" x2="${screenCp1.x}" y2="${screenCp1.y}" stroke="#000000" stroke-width="1"/>`);

                        const screenEnd = this.viewport.worldToScreen(endPoint.x, endPoint.y);
                        const screenCp2 = this.viewport.worldToScreen(cp2.x, cp2.y);
                        svgParts.push(`<line x1="${screenEnd.x}" y1="${screenEnd.y}" x2="${screenCp2.x}" y2="${screenCp2.y}" stroke="#000000" stroke-width="1"/>`);

                        // Control point circles
                        svgParts.push(`<circle cx="${screenCp1.x}" cy="${screenCp1.y}" r="4" fill="#000000"/>`);
                        svgParts.push(`<circle cx="${screenCp2.x}" cy="${screenCp2.y}" r="4" fill="#000000"/>`);
                    }
                }
            }

            // Draw track labels (if enabled)
            if (this.showTracks && this.showTrackLabels && this.tracks && this.tracks.length > 0) {
                const labels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
                for (let i = 0; i < this.tracks.length; i++) {
                    const track = this.tracks[i];
                    if (!track || track.length !== 2) continue;
                    const [start, end] = track;

                    const length = Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2);
                    const midX = (start.x + end.x) / 2;
                    const midY = (start.y + end.y) / 2;
                    const screenMid = this.viewport.worldToScreen(midX, midY);

                    const label = i < labels.length ? labels[i] : `T${i + 1}`;
                    svgParts.push(`<text x="${screenMid.x}" y="${screenMid.y - 9}" text-anchor="middle" font-family="Courier New, monospace" font-size="12" fill="#000000">${label}</text>`);
                    svgParts.push(`<text x="${screenMid.x}" y="${screenMid.y + 5}" text-anchor="middle" font-family="Courier New, monospace" font-size="9" fill="#000000">${length.toFixed(1)}m</text>`);
                }
            }

            svgParts.push(`</svg>`);

            // Create blob and download
            const svgString = svgParts.join('\n');
            const blob = new Blob([svgString], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `field-penplot-${Date.now()}.svg`;
            a.click();

            URL.revokeObjectURL(url);
            console.log('Pen plotter SVG exported successfully');
        } catch (error) {
            console.error('Error exporting SVG:', error);
            alert('Error exporting SVG: ' + error.message);
        }
    }

    generateTracks() {
        if (!this.boundaryComplete || this.boundaryPoints.length < 3) {
            alert('Please draw a boundary first (double-click to complete)');
            return;
        }

        // Calculate working zone (boundary buffered inward by headland distance)
        const headlandDistance = this.trackWidth * this.headlandBuffer;
        this.workingZone = GeometryUtils.bufferPolygon(this.boundaryPoints, -headlandDistance);

        // Validate working zone
        if (!this.workingZone || this.workingZone.length < 3) {
            alert('Buffer is too large for this field. Try reducing the Track Width or Headland Buffer.');
            this.workingZone = null;
            this.bufferedObstacles = [];
            this.tracks = [];
            this.render();
            return;
        }

        // Calculate buffered obstacles (obstacles buffered outward)
        this.bufferedObstacles = this.obstacles.map(obstacle =>
            GeometryUtils.bufferPolygon(obstacle, headlandDistance)
        ).filter(obs => obs && obs.length >= 3); // Filter out invalid obstacles

        // Generate tracks
        this.tracks = GeometryUtils.generateTracks(
            this.workingZone,
            this.bufferedObstacles,
            this.trackWidth,
            this.trackAngle
        );

        // Generate reference points for visualization (must be done before headland turns)
        this.referencePoints = GeometryUtils.generateReferencePoints(
            this.tracks,
            this.workingZone,
            this.trackWidth,
            this.referencePointDistance,
            this.bufferedObstacles
        );

        // Generate headland turns using reference points
        this.headlandTurns = GeometryUtils.generateHeadlandTurns(
            this.tracks,
            this.trackWidth,
            this.referencePoints,
            this.boundaryPoints
        );

        console.log('=== TRACK GENERATION DEBUG ===');
        console.log('Generated', this.tracks.length, 'track segments');
        console.log('Generated', this.headlandTurns.length, 'headland turns');
        console.log('Reference points:', this.referencePoints.intersectionPoints.length, 'intersections');
        console.log('Working zone points:', this.workingZone.length);
        console.log('Boundary area:', GeometryUtils.polygonArea(this.boundaryPoints).toFixed(2));
        console.log('Working zone area:', GeometryUtils.polygonArea(this.workingZone).toFixed(2));
        if (this.tracks.length > 0) {
            console.log('Sample track:', this.tracks[0]);
        }
        console.log('===============================');

        this.render();
    }

    render() {
        // Safety check
        if (!this.canvas || !this.ctx) {
            console.error('Canvas not initialized');
            return;
        }

        // Clear canvas so the paper sheet shows through
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw tracks first (so they appear behind everything)
        if (this.showTracks && this.tracks && this.tracks.length > 0) {
            this.drawTracks();
        }

        // Draw headland turns
        if (this.showHeadlandTurns && this.headlandTurns && this.headlandTurns.length > 0) {
            this.drawHeadlandTurns();
        }

        // Draw headland area (space between boundary and working zone)
        if (this.boundaryComplete && this.boundaryPoints.length > 0) {
            // Faint green wash over the whole field
            this.drawPolygon(this.boundaryPoints, null, 0, 'rgba(85, 139, 47, 0.06)');

            // Draw working zone on top
            if (this.showWorkingZone && this.workingZone && this.workingZone.length > 0) {
                this.drawPolygon(this.workingZone, '#7c807e', 1);
            }
        }

        // Draw buffered obstacles (if calculated)
        if (this.showBufferedObstacles && this.bufferedObstacles && this.bufferedObstacles.length > 0) {
            for (const obstacle of this.bufferedObstacles) {
                if (obstacle && obstacle.length > 0) {
                    this.drawPolygon(obstacle, '#a39d92', 1, 'rgba(163, 157, 146, 0.12)');
                }
            }
        }

        // Draw boundary (red, thin line)
        if (this.boundaryPoints.length > 0) {
            this.drawPolygon(
                this.boundaryPoints,
                '#c62828',
                1.5,
                this.boundaryComplete ? null : 'rgba(198, 40, 40, 0.05)'
            );

            // Draw preview line if not complete
            if (!this.boundaryComplete && this.mouseX !== undefined && this.mouseWorldX !== undefined) {
                this.ctx.strokeStyle = '#c62828';
                this.ctx.lineWidth = 1;
                this.ctx.setLineDash([3, 3]);
                this.ctx.beginPath();
                const last = this.boundaryPoints[this.boundaryPoints.length - 1];
                const screenLast = this.viewport.worldToScreen(last.x, last.y);
                const screenMouse = this.viewport.worldToScreen(this.mouseWorldX, this.mouseWorldY);
                this.ctx.moveTo(screenLast.x, screenLast.y);
                this.ctx.lineTo(screenMouse.x, screenMouse.y);
                this.ctx.stroke();
                this.ctx.setLineDash([]);
            }
        }

        // Draw completed obstacles (blue, thin line)
        for (const obstacle of this.obstacles) {
            this.drawPolygon(obstacle, '#1565c0', 1.5, 'rgba(21, 101, 192, 0.06)');
        }

        // Draw current obstacle being drawn
        if (this.currentObstacle.length > 0) {
            this.drawPolygon(this.currentObstacle, '#1565c0', 1.5);

            // Draw preview line
            if (this.mouseX !== undefined && this.mouseWorldX !== undefined) {
                this.ctx.strokeStyle = '#1565c0';
                this.ctx.lineWidth = 1;
                this.ctx.setLineDash([3, 3]);
                this.ctx.beginPath();
                const last = this.currentObstacle[this.currentObstacle.length - 1];
                const screenLast = this.viewport.worldToScreen(last.x, last.y);
                const screenMouse = this.viewport.worldToScreen(this.mouseWorldX, this.mouseWorldY);
                this.ctx.moveTo(screenLast.x, screenLast.y);
                this.ctx.lineTo(screenMouse.x, screenMouse.y);
                this.ctx.stroke();
                this.ctx.setLineDash([]);
            }
        }

        // Draw wheel tracks (offset lines on both sides of all curves)
        if (this.showWheelTracks && this.tracks && this.tracks.length > 0) {
            this.drawWheelTracks();
        }

        // Control points and track labels go on top of the lines
        if (this.showHeadlandTurns && this.showControlPoints && this.headlandTurns.length > 0) {
            this.drawControlPoints();
        }

        if (this.showTracks && this.showTrackLabels && this.tracks.length > 0) {
            this.drawTrackLabels();
        }

        // Draw reference points (intersection, extension, and guide points)
        if (this.tracks && this.tracks.length > 0) {
            this.drawReferencePoints();
        }

        // Draw points (subtle, smaller)
        this.drawPoints(this.boundaryPoints, '#c62828');
        for (const obstacle of this.obstacles) {
            this.drawPoints(obstacle, '#1565c0');
        }
        this.drawPoints(this.currentObstacle, '#1565c0');
    }

    drawPolygon(points, strokeColor, lineWidth = 2, fillColor = null) {
        if (!points || points.length === 0) return;

        // Convert world coordinates to screen coordinates
        const screenPoints = points.map(p => this.viewport.worldToScreen(p.x, p.y));

        this.ctx.beginPath();
        this.ctx.moveTo(screenPoints[0].x, screenPoints[0].y);

        for (let i = 1; i < screenPoints.length; i++) {
            if (screenPoints[i] && screenPoints[i].x !== undefined && screenPoints[i].y !== undefined) {
                this.ctx.lineTo(screenPoints[i].x, screenPoints[i].y);
            }
        }

        this.ctx.closePath();

        if (fillColor) {
            this.ctx.fillStyle = fillColor;
            this.ctx.fill();
        }

        if (strokeColor) {
            this.ctx.strokeStyle = strokeColor;
            this.ctx.lineWidth = lineWidth;
            this.ctx.stroke();
        }
    }

    drawPoints(points, color) {
        if (!points || points.length === 0) return;

        for (const point of points) {
            if (!point || point.x === undefined || point.y === undefined) continue;

            // Convert to screen coordinates
            const screenPos = this.viewport.worldToScreen(point.x, point.y);

            this.ctx.fillStyle = color;
            this.ctx.beginPath();
            this.ctx.arc(screenPos.x, screenPos.y, 3, 0, Math.PI * 2);
            this.ctx.fill();

            // Thin sheet-coloured outline so points read on top of lines
            this.ctx.strokeStyle = '#fbf8f1';
            this.ctx.lineWidth = 1;
            this.ctx.stroke();
        }
    }

    drawTracks() {
        if (!this.tracks || this.tracks.length === 0) return;

        this.ctx.strokeStyle = '#2f2c28'; // Graphite
        this.ctx.lineWidth = 1.5;

        for (const track of this.tracks) {
            if (!track || !Array.isArray(track) || track.length !== 2) continue;

            const [start, end] = track;
            if (!start || !end || start.x === undefined || end.x === undefined) continue;

            // Convert to screen coordinates
            const screenStart = this.viewport.worldToScreen(start.x, start.y);
            const screenEnd = this.viewport.worldToScreen(end.x, end.y);

            this.ctx.beginPath();
            this.ctx.moveTo(screenStart.x, screenStart.y);
            this.ctx.lineTo(screenEnd.x, screenEnd.y);
            this.ctx.stroke();
        }
    }

    drawTrackLabels() {
        // Generate track labels A, B, C, etc.
        const labels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        for (let i = 0; i < this.tracks.length; i++) {
            const track = this.tracks[i];
            if (!track || !Array.isArray(track) || track.length !== 2) continue;

            const [start, end] = track;
            if (!start || !end || start.x === undefined || end.x === undefined) continue;

            const screenStart = this.viewport.worldToScreen(start.x, start.y);
            const screenEnd = this.viewport.worldToScreen(end.x, end.y);

            // Calculate track length in METERS (world coordinates)
            const length = Math.sqrt(
                (end.x - start.x) ** 2 + (end.y - start.y) ** 2
            );

            const midX = (screenStart.x + screenEnd.x) / 2;
            const midY = (screenStart.y + screenEnd.y) / 2;

            const label = i < labels.length ? labels[i] : `T${i + 1}`;
            const lengthText = length.toFixed(1) + 'm';

            // Key-cap label: white fill, thin black border
            this.ctx.font = '300 7px "Martian Mono", monospace';
            const boxWidth = Math.max(this.ctx.measureText(lengthText).width, 10) + 10;

            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillRect(midX - boxWidth / 2, midY - 15, boxWidth, 26);
            this.ctx.strokeStyle = '#1a1a1a';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(Math.round(midX - boxWidth / 2) + 0.5, Math.round(midY - 15) + 0.5, Math.round(boxWidth), 26);

            this.ctx.fillStyle = '#111111';
            this.ctx.font = '400 10px "Martian Mono", monospace';
            this.ctx.fillText(label, midX, midY - 6);

            // Length dimension below label in METERS
            this.ctx.font = '300 7px "Martian Mono", monospace';
            this.ctx.fillStyle = '#666666';
            this.ctx.fillText(lengthText, midX, midY + 5);
        }
    }

    drawHeadlandTurns() {
        if (!this.headlandTurns || this.headlandTurns.length === 0) return;

        this.ctx.strokeStyle = '#4d4943'; // Softer graphite for turns
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([4, 4]); // Dashed line for turns

        for (const turnData of this.headlandTurns) {
            // Handle new format {points, controlPoints, startPoint, endPoint}
            const turn = turnData.points || turnData;
            if (!turn || turn.length < 2) continue;

            // Convert first point to screen coordinates
            const screenStart = this.viewport.worldToScreen(turn[0].x, turn[0].y);

            this.ctx.beginPath();
            this.ctx.moveTo(screenStart.x, screenStart.y);

            // Draw curved path
            for (let i = 1; i < turn.length; i++) {
                const screenPos = this.viewport.worldToScreen(turn[i].x, turn[i].y);
                this.ctx.lineTo(screenPos.x, screenPos.y);
            }

            this.ctx.stroke();
        }

        this.ctx.setLineDash([]); // Reset dash
    }

    drawControlPoints() {
        for (const turnData of this.headlandTurns) {
            if (turnData.controlPoints && turnData.startPoint && turnData.endPoint) {
                const { cp1, cp2 } = turnData.controlPoints;
                const { startPoint, endPoint } = turnData;

                // Draw lines from start/end points to their control points
                this.ctx.strokeStyle = '#c75600'; // Amber for control point lines
                this.ctx.lineWidth = 1;

                // Line from start to cp1
                const screenStart = this.viewport.worldToScreen(startPoint.x, startPoint.y);
                const screenCp1 = this.viewport.worldToScreen(cp1.x, cp1.y);
                this.ctx.beginPath();
                this.ctx.moveTo(screenStart.x, screenStart.y);
                this.ctx.lineTo(screenCp1.x, screenCp1.y);
                this.ctx.stroke();

                // Line from end to cp2
                const screenEnd = this.viewport.worldToScreen(endPoint.x, endPoint.y);
                const screenCp2 = this.viewport.worldToScreen(cp2.x, cp2.y);
                this.ctx.beginPath();
                this.ctx.moveTo(screenEnd.x, screenEnd.y);
                this.ctx.lineTo(screenCp2.x, screenCp2.y);
                this.ctx.stroke();

                // Draw control points as crisp rings
                this.ctx.fillStyle = '#ffffff';
                this.ctx.lineWidth = 1.1;

                for (const cp of [screenCp1, screenCp2]) {
                    this.ctx.beginPath();
                    this.ctx.arc(cp.x, cp.y, 3.5, 0, Math.PI * 2);
                    this.ctx.fill();
                    this.ctx.stroke();
                }
            }
        }
    }

    /**
     * Generate a random dash pattern for organic-looking wheel tracks
     * Returns array of [dash, gap, dash, gap, ...] values
     * Each dash and gap has independent random length for organic appearance
     */
    generateRandomDashPattern(seed, minDash = 2, maxDash = 12, minGap = 1, maxGap = 20, count = 20) {
        const pattern = [];
        // Simple seeded random using sine function
        const random = (i) => {
            const x = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453;
            return x - Math.floor(x);
        };

        for (let i = 0; i < count; i++) {
            // Random dash length
            const dashLength = minDash + random(i * 2) * (maxDash - minDash);
            // Random gap length with wider range for more variation
            const gapLength = minGap + random(i * 2 + 1) * (maxGap - minGap);
            pattern.push(dashLength, gapLength);
        }
        return pattern;
    }

    drawWheelTracks() {
        const wheelOffset = this.trackWidth / 10; // Offset distance for wheel tracks

        this.ctx.strokeStyle = '#4d4943'; // Soft graphite for wheel tracks
        this.ctx.lineWidth = 0.5;

        // Draw wheel tracks for working zone curve
        if (this.workingZone && this.workingZone.length > 0) {
            // Create offset polylines on both sides of the working zone
            const leftTrack = GeometryUtils.offsetPolyline(this.workingZone, wheelOffset);
            const rightTrack = GeometryUtils.offsetPolyline(this.workingZone, -wheelOffset);

            // Draw left wheel track with random dashes
            if (leftTrack.length > 0) {
                const leftDashPattern = this.generateRandomDashPattern(1001, this.minDash, this.maxDash, this.minGap, this.maxGap, 30);
                this.ctx.setLineDash(leftDashPattern);

                const screenStart = this.viewport.worldToScreen(leftTrack[0].x, leftTrack[0].y);
                this.ctx.beginPath();
                this.ctx.moveTo(screenStart.x, screenStart.y);

                for (let i = 1; i < leftTrack.length; i++) {
                    const screenPos = this.viewport.worldToScreen(leftTrack[i].x, leftTrack[i].y);
                    this.ctx.lineTo(screenPos.x, screenPos.y);
                }
                // Close the loop back to start
                this.ctx.lineTo(screenStart.x, screenStart.y);
                this.ctx.stroke();
            }

            // Draw right wheel track with different random dashes
            if (rightTrack.length > 0) {
                const rightDashPattern = this.generateRandomDashPattern(2002, this.minDash, this.maxDash, this.minGap, this.maxGap, 30);
                this.ctx.setLineDash(rightDashPattern);

                const screenStart = this.viewport.worldToScreen(rightTrack[0].x, rightTrack[0].y);
                this.ctx.beginPath();
                this.ctx.moveTo(screenStart.x, screenStart.y);

                for (let i = 1; i < rightTrack.length; i++) {
                    const screenPos = this.viewport.worldToScreen(rightTrack[i].x, rightTrack[i].y);
                    this.ctx.lineTo(screenPos.x, screenPos.y);
                }
                // Close the loop back to start
                this.ctx.lineTo(screenStart.x, screenStart.y);
                this.ctx.stroke();
            }

            this.ctx.setLineDash([]); // Reset dash pattern
        }

        // Draw wheel tracks for buffered obstacles
        if (this.bufferedObstacles && this.bufferedObstacles.length > 0) {
            for (let i = 0; i < this.bufferedObstacles.length; i++) {
                const obstacle = this.bufferedObstacles[i];
                if (!obstacle || obstacle.length < 3) continue;

                // Create offset polylines on both sides of the obstacle
                const leftTrack = GeometryUtils.offsetPolyline(obstacle, wheelOffset);
                const rightTrack = GeometryUtils.offsetPolyline(obstacle, -wheelOffset);

                // Draw left wheel track with unique random dash pattern
                if (leftTrack.length > 0) {
                    const leftDashPattern = this.generateRandomDashPattern(7000 + i * 2, this.minDash, this.maxDash, this.minGap, this.maxGap, 30);
                    this.ctx.setLineDash(leftDashPattern);

                    const screenStart = this.viewport.worldToScreen(leftTrack[0].x, leftTrack[0].y);
                    this.ctx.beginPath();
                    this.ctx.moveTo(screenStart.x, screenStart.y);

                    for (let j = 1; j < leftTrack.length; j++) {
                        const screenPos = this.viewport.worldToScreen(leftTrack[j].x, leftTrack[j].y);
                        this.ctx.lineTo(screenPos.x, screenPos.y);
                    }
                    // Close the loop back to start
                    this.ctx.lineTo(screenStart.x, screenStart.y);
                    this.ctx.stroke();
                }

                // Draw right wheel track with different unique random dash pattern
                if (rightTrack.length > 0) {
                    const rightDashPattern = this.generateRandomDashPattern(8000 + i * 2, this.minDash, this.maxDash, this.minGap, this.maxGap, 30);
                    this.ctx.setLineDash(rightDashPattern);

                    const screenStart = this.viewport.worldToScreen(rightTrack[0].x, rightTrack[0].y);
                    this.ctx.beginPath();
                    this.ctx.moveTo(screenStart.x, screenStart.y);

                    for (let j = 1; j < rightTrack.length; j++) {
                        const screenPos = this.viewport.worldToScreen(rightTrack[j].x, rightTrack[j].y);
                        this.ctx.lineTo(screenPos.x, screenPos.y);
                    }
                    // Close the loop back to start
                    this.ctx.lineTo(screenStart.x, screenStart.y);
                    this.ctx.stroke();
                }
            }

            this.ctx.setLineDash([]); // Reset dash pattern
        }

        // Draw wheel tracks for straight tracks
        if (this.tracks && this.tracks.length > 0) {
            for (let i = 0; i < this.tracks.length; i++) {
                const track = this.tracks[i];
                if (!track || !Array.isArray(track) || track.length !== 2) continue;

                const [start, end] = track;
                if (!start || !end) continue;

                // Create offset lines on both sides
                const leftTrack = GeometryUtils.offsetLine(start, end, wheelOffset);
                const rightTrack = GeometryUtils.offsetLine(start, end, -wheelOffset);

                // Draw left wheel track with unique random dash pattern
                const leftDashPattern = this.generateRandomDashPattern(3000 + i * 2, this.minDash, this.maxDash, this.minGap, this.maxGap, 30);
                this.ctx.setLineDash(leftDashPattern);

                const screenLeft1 = this.viewport.worldToScreen(leftTrack[0].x, leftTrack[0].y);
                const screenLeft2 = this.viewport.worldToScreen(leftTrack[1].x, leftTrack[1].y);
                this.ctx.beginPath();
                this.ctx.moveTo(screenLeft1.x, screenLeft1.y);
                this.ctx.lineTo(screenLeft2.x, screenLeft2.y);
                this.ctx.stroke();

                // Draw right wheel track with different unique random dash pattern
                const rightDashPattern = this.generateRandomDashPattern(4000 + i * 2, this.minDash, this.maxDash, this.minGap, this.maxGap, 30);
                this.ctx.setLineDash(rightDashPattern);

                const screenRight1 = this.viewport.worldToScreen(rightTrack[0].x, rightTrack[0].y);
                const screenRight2 = this.viewport.worldToScreen(rightTrack[1].x, rightTrack[1].y);
                this.ctx.beginPath();
                this.ctx.moveTo(screenRight1.x, screenRight1.y);
                this.ctx.lineTo(screenRight2.x, screenRight2.y);
                this.ctx.stroke();
            }

            this.ctx.setLineDash([]); // Reset dash pattern
        }

        // Draw wheel tracks for headland turns
        if (this.headlandTurns && this.headlandTurns.length > 0) {
            for (let i = 0; i < this.headlandTurns.length; i++) {
                const turnData = this.headlandTurns[i];
                const turn = turnData.points || turnData;
                if (!turn || turn.length < 2) continue;

                // Create offset polylines on both sides
                const leftTrack = GeometryUtils.offsetPolyline(turn, wheelOffset);
                const rightTrack = GeometryUtils.offsetPolyline(turn, -wheelOffset);

                // Draw left wheel track with unique random dash pattern
                if (leftTrack.length > 0) {
                    const leftDashPattern = this.generateRandomDashPattern(5000 + i * 2, this.minDash, this.maxDash, this.minGap, this.maxGap, 30);
                    this.ctx.setLineDash(leftDashPattern);

                    const screenStart = this.viewport.worldToScreen(leftTrack[0].x, leftTrack[0].y);
                    this.ctx.beginPath();
                    this.ctx.moveTo(screenStart.x, screenStart.y);

                    for (let j = 1; j < leftTrack.length; j++) {
                        const screenPos = this.viewport.worldToScreen(leftTrack[j].x, leftTrack[j].y);
                        this.ctx.lineTo(screenPos.x, screenPos.y);
                    }
                    this.ctx.stroke();
                }

                // Draw right wheel track with different unique random dash pattern
                if (rightTrack.length > 0) {
                    const rightDashPattern = this.generateRandomDashPattern(6000 + i * 2, this.minDash, this.maxDash, this.minGap, this.maxGap, 30);
                    this.ctx.setLineDash(rightDashPattern);

                    const screenStart = this.viewport.worldToScreen(rightTrack[0].x, rightTrack[0].y);
                    this.ctx.beginPath();
                    this.ctx.moveTo(screenStart.x, screenStart.y);

                    for (let j = 1; j < rightTrack.length; j++) {
                        const screenPos = this.viewport.worldToScreen(rightTrack[j].x, rightTrack[j].y);
                        this.ctx.lineTo(screenPos.x, screenPos.y);
                    }
                    this.ctx.stroke();
                }
            }

            this.ctx.setLineDash([]); // Reset dash pattern
        }
    }

    drawReferencePoints() {
        if (!this.referencePoints) return;

        const { intersectionPoints, trackExtensionPoints, boundaryGuidePoints, intersectionGroups } = this.referencePoints;
        const crossSize = 6; // Size of the cross in pixels

        // Helper function to draw a cross marker (in screen coordinates)
        const drawCross = (worldX, worldY, color, lineWidth = 1.5) => {
            const screenPos = this.viewport.worldToScreen(worldX, worldY);
            const x = screenPos.x;
            const y = screenPos.y;

            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = lineWidth;

            // Vertical line
            this.ctx.beginPath();
            this.ctx.moveTo(x, y - crossSize);
            this.ctx.lineTo(x, y + crossSize);
            this.ctx.stroke();

            // Horizontal line
            this.ctx.beginPath();
            this.ctx.moveTo(x - crossSize, y);
            this.ctx.lineTo(x + crossSize, y);
            this.ctx.stroke();
        };

        // Draw intersection points (RED) - where tracks meet boundary
        if (this.showReferencePoints && intersectionPoints && intersectionPoints.length > 0) {
            for (const item of intersectionPoints) {
                const p = item.point;
                if (!p) continue;

                drawCross(p.x, p.y, '#c62828', 1.5); // Boundary red
            }
        }

        // Draw track extension points (BLUE) - points inward from boundary
        if (this.showReferencePoints && trackExtensionPoints && trackExtensionPoints.length > 0) {
            for (const item of trackExtensionPoints) {
                const p = item.point;
                if (!p) continue;

                drawCross(p.x, p.y, '#7c807e', 1.2); // Muted

                // Draw line connecting to intersection point
                if (item.intersectionPoint) {
                    const screenP = this.viewport.worldToScreen(p.x, p.y);
                    const screenIntersection = this.viewport.worldToScreen(
                        item.intersectionPoint.x,
                        item.intersectionPoint.y
                    );

                    this.ctx.strokeStyle = '#cdd6dd'; // Rule blue-grey
                    this.ctx.lineWidth = 1;
                    this.ctx.setLineDash([3, 3]);
                    this.ctx.beginPath();
                    this.ctx.moveTo(screenIntersection.x, screenIntersection.y);
                    this.ctx.lineTo(screenP.x, screenP.y);
                    this.ctx.stroke();
                    this.ctx.setLineDash([]);
                }
            }
        }

        // Draw boundary guide points (ORANGE) - points along boundary
        if (this.showReferencePoints && boundaryGuidePoints && boundaryGuidePoints.length > 0) {
            for (const item of boundaryGuidePoints) {
                const p = item.point;
                if (!p) continue;

                drawCross(p.x, p.y, '#7c807e', 1.2); // Muted

                // Draw line connecting to intersection point
                if (item.intersectionPoint) {
                    const screenP = this.viewport.worldToScreen(p.x, p.y);
                    const screenIntersection = this.viewport.worldToScreen(
                        item.intersectionPoint.x,
                        item.intersectionPoint.y
                    );

                    this.ctx.strokeStyle = '#cdd6dd'; // Rule blue-grey
                    this.ctx.lineWidth = 1;
                    this.ctx.setLineDash([3, 3]);
                    this.ctx.beginPath();
                    this.ctx.moveTo(screenIntersection.x, screenIntersection.y);
                    this.ctx.lineTo(screenP.x, screenP.y);
                    this.ctx.stroke();
                    this.ctx.setLineDash([]);
                }
            }
        }

        // Draw angle labels from intersection groups
        if (this.showAngles && intersectionGroups && intersectionGroups.length > 0) {
            this.ctx.font = '300 8.5px "Martian Mono", monospace';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';

            for (const group of intersectionGroups) {
                const { leftGuidePoint, rightGuidePoint, leftAngle, rightAngle } = group;

                // Draw left angle label
                if (leftGuidePoint && leftAngle !== undefined) {
                    const screenPos = this.viewport.worldToScreen(leftGuidePoint.x, leftGuidePoint.y);

                    // Draw background rectangle for better readability
                    const angleText = leftAngle.toFixed(1) + '°';
                    const textWidth = this.ctx.measureText(angleText).width;
                    const padding = 4;

                    this.ctx.fillStyle = 'rgba(251, 248, 241, 0.92)'; // Sheet
                    this.ctx.fillRect(
                        screenPos.x - textWidth / 2 - padding,
                        screenPos.y - 18,
                        textWidth + padding * 2,
                        16
                    );

                    // Draw angle text
                    this.ctx.fillStyle = '#2e7d32'; // Field green
                    this.ctx.fillText(angleText, screenPos.x, screenPos.y - 10);
                }

                // Draw right angle label
                if (rightGuidePoint && rightAngle !== undefined) {
                    const screenPos = this.viewport.worldToScreen(rightGuidePoint.x, rightGuidePoint.y);

                    // Draw background rectangle for better readability
                    const angleText = rightAngle.toFixed(1) + '°';
                    const textWidth = this.ctx.measureText(angleText).width;
                    const padding = 4;

                    this.ctx.fillStyle = 'rgba(251, 248, 241, 0.92)'; // Sheet
                    this.ctx.fillRect(
                        screenPos.x - textWidth / 2 - padding,
                        screenPos.y - 18,
                        textWidth + padding * 2,
                        16
                    );

                    // Draw angle text
                    this.ctx.fillStyle = '#2e7d32'; // Field green
                    this.ctx.fillText(angleText, screenPos.x, screenPos.y - 10);
                }
            }
        }

        // Draw distance labels from intersection to each reference point
        if (this.showDistances && intersectionGroups && intersectionGroups.length > 0) {
            this.ctx.font = '300 7.5px "Martian Mono", monospace';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';

            for (const group of intersectionGroups) {
                const { intersectionPoint, extensionPoint, leftGuidePoint, rightGuidePoint } = group;

                if (!intersectionPoint) continue;

                // Distance to extension point (on black line)
                if (extensionPoint) {
                    const dx = extensionPoint.x - intersectionPoint.x;
                    const dy = extensionPoint.y - intersectionPoint.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    // Calculate midpoint for label placement
                    const midX = (intersectionPoint.x + extensionPoint.x) / 2;
                    const midY = (intersectionPoint.y + extensionPoint.y) / 2;
                    const screenMid = this.viewport.worldToScreen(midX, midY);

                    // Draw distance text
                    const distText = distance.toFixed(2) + 'm';
                    const textWidth = this.ctx.measureText(distText).width;
                    const padding = 3;

                    this.ctx.fillStyle = 'rgba(251, 248, 241, 0.92)'; // Sheet
                    this.ctx.fillRect(
                        screenMid.x - textWidth / 2 - padding,
                        screenMid.y - 8,
                        textWidth + padding * 2,
                        14
                    );

                    this.ctx.fillStyle = '#7c807e'; // Muted
                    this.ctx.fillText(distText, screenMid.x, screenMid.y);
                }

                // Distance to left guide point
                if (leftGuidePoint) {
                    const dx = leftGuidePoint.x - intersectionPoint.x;
                    const dy = leftGuidePoint.y - intersectionPoint.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    // Calculate midpoint for label placement
                    const midX = (intersectionPoint.x + leftGuidePoint.x) / 2;
                    const midY = (intersectionPoint.y + leftGuidePoint.y) / 2;
                    const screenMid = this.viewport.worldToScreen(midX, midY);

                    // Draw distance text
                    const distText = distance.toFixed(2) + 'm';
                    const textWidth = this.ctx.measureText(distText).width;
                    const padding = 3;

                    this.ctx.fillStyle = 'rgba(251, 248, 241, 0.92)'; // Sheet
                    this.ctx.fillRect(
                        screenMid.x - textWidth / 2 - padding,
                        screenMid.y - 8,
                        textWidth + padding * 2,
                        14
                    );

                    this.ctx.fillStyle = '#7c807e'; // Muted
                    this.ctx.fillText(distText, screenMid.x, screenMid.y);
                }

                // Distance to right guide point
                if (rightGuidePoint) {
                    const dx = rightGuidePoint.x - intersectionPoint.x;
                    const dy = rightGuidePoint.y - intersectionPoint.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    // Calculate midpoint for label placement
                    const midX = (intersectionPoint.x + rightGuidePoint.x) / 2;
                    const midY = (intersectionPoint.y + rightGuidePoint.y) / 2;
                    const screenMid = this.viewport.worldToScreen(midX, midY);

                    // Draw distance text
                    const distText = distance.toFixed(2) + 'm';
                    const textWidth = this.ctx.measureText(distText).width;
                    const padding = 3;

                    this.ctx.fillStyle = 'rgba(251, 248, 241, 0.92)'; // Sheet
                    this.ctx.fillRect(
                        screenMid.x - textWidth / 2 - padding,
                        screenMid.y - 8,
                        textWidth + padding * 2,
                        14
                    );

                    this.ctx.fillStyle = '#7c807e'; // Muted
                    this.ctx.fillText(distText, screenMid.x, screenMid.y);
                }
            }
        }
    }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.app = new CropFieldApp();
});
