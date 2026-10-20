/**
 * Geometry utilities for crop field drawing app
 * Handles polygon buffering, line generation, and clipping
 */

class GeometryUtils {
    /**
     * Calculate the area of a polygon using the shoelace formula
     */
    static polygonArea(points) {
        let area = 0;
        for (let i = 0; i < points.length; i++) {
            const j = (i + 1) % points.length;
            area += points[i].x * points[j].y;
            area -= points[j].x * points[i].y;
        }
        return Math.abs(area / 2);
    }

    /**
     * Check if polygon vertices are in clockwise order
     */
    static isClockwise(points) {
        let sum = 0;
        for (let i = 0; i < points.length; i++) {
            const j = (i + 1) % points.length;
            sum += (points[j].x - points[i].x) * (points[j].y + points[i].y);
        }
        return sum > 0;
    }

    /**
     * Ensure polygon is counter-clockwise (for proper buffering)
     */
    static ensureCounterClockwise(points) {
        if (this.isClockwise(points)) {
            return [...points].reverse();
        }
        return points;
    }

    /**
     * Create an offset line parallel to a given line segment
     * Returns two points representing the offset line
     */
    static offsetLine(p1, p2, offset) {
        // Calculate direction vector
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const length = Math.sqrt(dx * dx + dy * dy);

        if (length === 0) return [p1, p2];

        // Normalize
        const nx = dx / length;
        const ny = dy / length;

        // Perpendicular vector (rotate 90 degrees)
        const px = -ny;
        const py = nx;

        // Create offset points
        return [
            { x: p1.x + px * offset, y: p1.y + py * offset },
            { x: p2.x + px * offset, y: p2.y + py * offset }
        ];
    }

    /**
     * Create offset curves for a polyline (like headland turns)
     * Returns array of offset points
     */
    static offsetPolyline(points, offset) {
        if (points.length < 2) return [];

        const offsetPoints = [];

        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];

            // Calculate perpendicular offset
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const length = Math.sqrt(dx * dx + dy * dy);

            if (length === 0) continue;

            const nx = dx / length;
            const ny = dy / length;
            const px = -ny;
            const py = nx;

            const offsetP1 = { x: p1.x + px * offset, y: p1.y + py * offset };
            const offsetP2 = { x: p2.x + px * offset, y: p2.y + py * offset };

            if (i === 0) {
                offsetPoints.push(offsetP1);
            }
            offsetPoints.push(offsetP2);
        }

        return offsetPoints;
    }

    /**
     * Fillet (round) the corners of a polygon
     * Takes sharp corner points and creates smooth arcs at each corner
     */
    static filletPolygonCorners(points, radius) {
        if (points.length < 3 || radius <= 0) return points;

        const filletedPoints = [];
        const numPoints = points.length;

        for (let i = 0; i < numPoints; i++) {
            const prev = points[(i - 1 + numPoints) % numPoints];
            const curr = points[i];
            const next = points[(i + 1) % numPoints];

            // Calculate vectors from current point to neighbors
            const v1 = { x: prev.x - curr.x, y: prev.y - curr.y };
            const v2 = { x: next.x - curr.x, y: next.y - curr.y };

            // Calculate lengths
            const len1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
            const len2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

            // Normalize vectors
            if (len1 > 0 && len2 > 0) {
                v1.x /= len1;
                v1.y /= len1;
                v2.x /= len2;
                v2.y /= len2;

                // Calculate the angle between the two edges
                const dot = v1.x * v2.x + v1.y * v2.y;
                const angle = Math.acos(Math.max(-1, Math.min(1, dot)));

                // If angle is too small (nearly straight), skip filleting
                if (angle < 0.1) {
                    filletedPoints.push(curr);
                    continue;
                }

                // Calculate the distance from corner to tangent points
                const tangentDistance = Math.min(radius / Math.tan(angle / 2), len1 * 0.4, len2 * 0.4);

                // Calculate the two tangent points where the arc starts/ends
                const p1 = {
                    x: curr.x + v1.x * tangentDistance,
                    y: curr.y + v1.y * tangentDistance
                };
                const p2 = {
                    x: curr.x + v2.x * tangentDistance,
                    y: curr.y + v2.y * tangentDistance
                };

                // Add the first tangent point
                filletedPoints.push(p1);

                // Create arc between p1 and p2
                const numArcSegments = 8; // Number of segments for the arc
                for (let j = 1; j < numArcSegments; j++) {
                    const t = j / numArcSegments;
                    // Quadratic Bezier curve with control point at the original corner
                    const mt = 1 - t;
                    const arcPoint = {
                        x: mt * mt * p1.x + 2 * mt * t * curr.x + t * t * p2.x,
                        y: mt * mt * p1.y + 2 * mt * t * curr.y + t * t * p2.y
                    };
                    filletedPoints.push(arcPoint);
                }

                // Add the second tangent point
                filletedPoints.push(p2);
            } else {
                // Degenerate case, just keep the point
                filletedPoints.push(curr);
            }
        }

        return filletedPoints;
    }

    /**
     * Buffer a polygon inward (negative buffer) or outward (positive buffer)
     * Uses JSTS (JavaScript Topology Suite) for CAD-grade polygon offsetting
     */
    static bufferPolygon(points, distance) {
        if (points.length < 3) return [];

        try {
            // Check if JSTS is available
            if (typeof jsts === 'undefined') {
                console.error('JSTS not loaded! Using fallback.');
                return this.bufferPolygonSimple(points, distance);
            }

            // Create JSTS geometry factory
            const geometryFactory = new jsts.geom.GeometryFactory();

            // Convert points to JSTS Coordinates
            const coordinates = points.map(p => new jsts.geom.Coordinate(p.x, p.y));

            // Close the ring if not already closed
            if (coordinates[0].x !== coordinates[coordinates.length - 1].x ||
                coordinates[0].y !== coordinates[coordinates.length - 1].y) {
                coordinates.push(new jsts.geom.Coordinate(coordinates[0].x, coordinates[0].y));
            }

            // Create a LinearRing
            const shell = geometryFactory.createLinearRing(coordinates);

            // Create a Polygon
            const polygon = geometryFactory.createPolygon(shell);

            // Create buffer parameters
            const BufferParameters = jsts.operation.buffer.BufferParameters;
            const bufferParams = new BufferParameters();

            // For negative (inward) buffers, use sharp MITRE joins
            // We'll fillet the corners afterward without offsetting back
            if (distance < 0) {
                bufferParams.setQuadrantSegments(1); // Minimal segments for sharp corners
                bufferParams.setJoinStyle(BufferParameters.JOIN_MITRE);
            } else {
                // For positive (outward) buffers, use rounded joins
                bufferParams.setQuadrantSegments(16);
                bufferParams.setJoinStyle(BufferParameters.JOIN_ROUND);
            }

            // Buffer the polygon
            const BufferOp = jsts.operation.buffer.BufferOp;
            let buffered = BufferOp.bufferOp(polygon, distance, bufferParams);

            // For negative buffers, create filleted corners from the sharp corner points
            if (distance < 0 && buffered) {
                const filletRadius = Math.abs(distance) * 0.2; // 20% of buffer distance for corner radius

                // Extract the sharp corner points
                const coords = buffered.getCoordinates();
                const sharpPoints = [];
                for (let i = 0; i < coords.length - 1; i++) {
                    sharpPoints.push({ x: coords[i].x, y: coords[i].y });
                }

                // Apply fillet to create rounded corners
                const filletedPoints = this.filletPolygonCorners(sharpPoints, filletRadius);

                // Convert back to JSTS polygon
                const filletedCoords = filletedPoints.map(p => new jsts.geom.Coordinate(p.x, p.y));
                filletedCoords.push(new jsts.geom.Coordinate(filletedPoints[0].x, filletedPoints[0].y));
                const filletedShell = geometryFactory.createLinearRing(filletedCoords);
                buffered = geometryFactory.createPolygon(filletedShell);
            }

            // Convert back to our point format
            if (buffered && buffered.getCoordinates) {
                const coords = buffered.getCoordinates();
                const result = [];

                // Extract coordinates (skip last point as it's a duplicate of first)
                for (let i = 0; i < coords.length - 1; i++) {
                    result.push({ x: coords[i].x, y: coords[i].y });
                }

                if (result.length >= 3) {
                    const originalArea = this.polygonArea(points);
                    const resultArea = this.polygonArea(result);

                    console.log(`JSTS buffer: original=${originalArea.toFixed(0)}, result=${resultArea.toFixed(0)}, distance=${distance}`);

                    return result;
                }
            }

            return [];

        } catch (error) {
            console.error('JSTS buffer error:', error);
            return this.bufferPolygonSimple(points, distance);
        }
    }

    /**
     * Simple fallback buffer (for when Clipper is not available)
     */
    static bufferPolygonSimple(points, distance) {
        // Simple scaling from centroid
        const centroid = this.getCentroid(points);
        const scale = distance > 0 ? 1.1 : 0.9; // Rough approximation

        return points.map(p => ({
            x: centroid.x + (p.x - centroid.x) * scale,
            y: centroid.y + (p.y - centroid.y) * scale
        }));
    }

    /**
     * Get centroid of polygon
     */
    static getCentroid(points) {
        let x = 0, y = 0;
        for (const p of points) {
            x += p.x;
            y += p.y;
        }
        return { x: x / points.length, y: y / points.length };
    }

    /**
     * Get perpendicular offset vector for a line segment
     * For counter-clockwise polygons, this points to the right (outward)
     * For clockwise polygons, this points to the left (outward for clockwise)
     */
    static getPerpendicularOffset(p1, p2, distance) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const len = Math.sqrt(dx * dx + dy * dy);

        if (len === 0) return { x: 0, y: 0 };

        // Perpendicular vector (rotated 90 degrees counter-clockwise)
        // This points to the RIGHT when traveling from p1 to p2
        return {
            x: -dy / len * distance,
            y: dx / len * distance
        };
    }

    /**
     * Find intersection point of two lines
     */
    static lineIntersection(p1, p2, p3, p4) {
        const x1 = p1.x, y1 = p1.y;
        const x2 = p2.x, y2 = p2.y;
        const x3 = p3.x, y3 = p3.y;
        const x4 = p4.x, y4 = p4.y;

        const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);

        if (Math.abs(denom) < 1e-10) return null;

        const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;

        return {
            x: x1 + t * (x2 - x1),
            y: y1 + t * (y2 - y1)
        };
    }

    /**
     * Get bounding box of a polygon
     */
    static getBoundingBox(points) {
        if (points.length === 0) return null;

        let minX = points[0].x, maxX = points[0].x;
        let minY = points[0].y, maxY = points[0].y;

        for (const p of points) {
            minX = Math.min(minX, p.x);
            maxX = Math.max(maxX, p.x);
            minY = Math.min(minY, p.y);
            maxY = Math.max(maxY, p.y);
        }

        return { minX, maxX, minY, maxY };
    }

    /**
     * Check if a point is inside a polygon using ray casting algorithm
     */
    static pointInPolygon(point, polygon) {
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].x, yi = polygon[i].y;
            const xj = polygon[j].x, yj = polygon[j].y;

            const intersect = ((yi > point.y) !== (yj > point.y))
                && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }

    /**
     * Clip a line segment to a polygon
     * Returns the portions of the line that are inside the polygon
     */
    static clipLineToPolygon(lineStart, lineEnd, polygon) {
        const segments = [];
        const intersections = [];

        // Find all intersection points with polygon edges
        for (let i = 0; i < polygon.length; i++) {
            const j = (i + 1) % polygon.length;
            const intersection = this.segmentIntersection(
                lineStart, lineEnd,
                polygon[i], polygon[j]
            );

            if (intersection) {
                intersections.push(intersection);
            }
        }

        // Add start and end points
        const allPoints = [lineStart, ...intersections, lineEnd];

        // Sort points along the line
        allPoints.sort((a, b) => {
            const distA = (a.x - lineStart.x) ** 2 + (a.y - lineStart.y) ** 2;
            const distB = (b.x - lineStart.x) ** 2 + (b.y - lineStart.y) ** 2;
            return distA - distB;
        });

        // Check each segment midpoint to see if it's inside the polygon
        for (let i = 0; i < allPoints.length - 1; i++) {
            const midpoint = {
                x: (allPoints[i].x + allPoints[i + 1].x) / 2,
                y: (allPoints[i].y + allPoints[i + 1].y) / 2
            };

            if (this.pointInPolygon(midpoint, polygon)) {
                segments.push([allPoints[i], allPoints[i + 1]]);
            }
        }

        return segments;
    }

    /**
     * Find intersection of two line segments
     */
    static segmentIntersection(p1, p2, p3, p4) {
        const x1 = p1.x, y1 = p1.y;
        const x2 = p2.x, y2 = p2.y;
        const x3 = p3.x, y3 = p3.y;
        const x4 = p4.x, y4 = p4.y;

        const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);

        if (Math.abs(denom) < 1e-10) return null;

        const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
        const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

        if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
            return {
                x: x1 + t * (x2 - x1),
                y: y1 + t * (y2 - y1)
            };
        }

        return null;
    }

    /**
     * Find the optimal angle for tracks based on the longest edge
     */
    static findOptimalAngle(polygon) {
        if (!polygon || polygon.length < 3) return 0;

        let maxLength = 0;
        let optimalAngle = 0;

        // Find the longest edge
        for (let i = 0; i < polygon.length; i++) {
            const j = (i + 1) % polygon.length;
            const dx = polygon[j].x - polygon[i].x;
            const dy = polygon[j].y - polygon[i].y;
            const length = Math.sqrt(dx * dx + dy * dy);

            if (length > maxLength) {
                maxLength = length;
                // Calculate angle in degrees
                optimalAngle = Math.atan2(dy, dx) * 180 / Math.PI;
            }
        }

        // Normalize to 0-180 range
        while (optimalAngle < 0) optimalAngle += 180;
        while (optimalAngle >= 180) optimalAngle -= 180;

        return optimalAngle;
    }

    /**
     * Generate parallel track lines at a given angle
     */
    static generateTracks(workingZone, obstacles, trackWidth, angle) {
        const tracks = [];

        if (!workingZone || workingZone.length < 3) return tracks;

        // Get bounding box of working zone
        const bbox = this.getBoundingBox(workingZone);
        const diagonal = Math.sqrt(
            (bbox.maxX - bbox.minX) ** 2 + (bbox.maxY - bbox.minY) ** 2
        );

        // Convert angle to radians
        const angleRad = (angle * Math.PI) / 180;
        const perpAngle = angleRad + Math.PI / 2;

        // Direction vectors
        const lineDir = { x: Math.cos(angleRad), y: Math.sin(angleRad) };
        const perpDir = { x: Math.cos(perpAngle), y: Math.sin(perpAngle) };

        // Center of bounding box
        const center = {
            x: (bbox.minX + bbox.maxX) / 2,
            y: (bbox.minY + bbox.maxY) / 2
        };

        // Generate lines from center outward in both directions
        const numLines = Math.ceil(diagonal / trackWidth) + 2;

        for (let i = -numLines; i <= numLines; i++) {
            const offset = i * trackWidth;

            // Starting point of the line (perpendicular to track direction)
            const startOffset = {
                x: center.x + perpDir.x * offset,
                y: center.y + perpDir.y * offset
            };

            // Line endpoints (extend far beyond the field)
            const lineStart = {
                x: startOffset.x - lineDir.x * diagonal,
                y: startOffset.y - lineDir.y * diagonal
            };
            const lineEnd = {
                x: startOffset.x + lineDir.x * diagonal,
                y: startOffset.y + lineDir.y * diagonal
            };

            // Clip line to working zone
            let segments = this.clipLineToPolygon(lineStart, lineEnd, workingZone);

            // Remove segments that intersect with obstacles
            if (obstacles && obstacles.length > 0) {
                const validSegments = [];
                for (const segment of segments) {
                    const clipped = this.clipLineToObstacles(segment[0], segment[1], obstacles);
                    validSegments.push(...clipped);
                }
                segments = validSegments;
            }

            tracks.push(...segments);
        }

        return tracks;
    }

    /**
     * Clip a line segment to exclude obstacle areas
     */
    static clipLineToObstacles(lineStart, lineEnd, obstacles) {
        let segments = [[lineStart, lineEnd]];

        // For each obstacle, subtract it from all current segments
        for (const obstacle of obstacles) {
            const newSegments = [];

            for (const [start, end] of segments) {
                // Check if segment intersects the obstacle
                const intersections = [];

                for (let i = 0; i < obstacle.length; i++) {
                    const j = (i + 1) % obstacle.length;
                    const intersection = this.segmentIntersection(
                        start, end,
                        obstacle[i], obstacle[j]
                    );

                    if (intersection) {
                        intersections.push(intersection);
                    }
                }

                if (intersections.length === 0) {
                    // No intersection - check if entire segment is outside obstacle
                    const midpoint = {
                        x: (start.x + end.x) / 2,
                        y: (start.y + end.y) / 2
                    };

                    if (!this.pointInPolygon(midpoint, obstacle)) {
                        newSegments.push([start, end]);
                    }
                } else {
                    // Has intersections - need to split the segment
                    const points = [start, ...intersections, end];

                    // Sort along the line
                    points.sort((a, b) => {
                        const distA = (a.x - start.x) ** 2 + (a.y - start.y) ** 2;
                        const distB = (b.x - start.x) ** 2 + (b.y - start.y) ** 2;
                        return distA - distB;
                    });

                    // Check each sub-segment
                    for (let i = 0; i < points.length - 1; i++) {
                        const midpoint = {
                            x: (points[i].x + points[i + 1].x) / 2,
                            y: (points[i].y + points[i + 1].y) / 2
                        };

                        if (!this.pointInPolygon(midpoint, obstacle)) {
                            newSegments.push([points[i], points[i + 1]]);
                        }
                    }
                }
            }

            segments = newSegments;
        }

        return segments;
    }

    /**
     * Generate headland turns connecting track endpoints
     * Creates curved paths from track extension points to boundary guide points
     */
    static generateHeadlandTurns(tracks, trackWidth, referencePoints = null, boundaryPolygon = null) {
        if (!referencePoints) return [];

        const { intersectionGroups } = referencePoints;
        if (!intersectionGroups || intersectionGroups.length === 0) return [];

        const turns = [];

        // For each intersection group (3 points that belong together)
        for (const group of intersectionGroups) {
            const { intersectionPoint, extensionPoint, leftGuidePoint, rightGuidePoint,
                    trackTangent, leftTangent, rightTangent } = group;

            // Create tangent curve from extension point to left guide point
            // Curve is tangent to track direction at extension point
            // and tangent to boundary direction at left guide point
            if (intersectionPoint && extensionPoint && leftGuidePoint && trackTangent && leftTangent) {
                const curveData = this.generateTangentCurve(
                    extensionPoint,
                    leftGuidePoint,
                    trackTangent,
                    leftTangent,
                    intersectionPoint
                );
                if (curveData && curveData.curvePoints && curveData.curvePoints.length > 0) {
                    turns.push({
                        points: curveData.curvePoints,
                        controlPoints: curveData.controlPoints,
                        startPoint: extensionPoint,
                        endPoint: leftGuidePoint
                    });
                }
            }

            // Create tangent curve from extension point to right guide point
            // Curve is tangent to track direction at extension point
            // and tangent to boundary direction at right guide point
            if (intersectionPoint && extensionPoint && rightGuidePoint && trackTangent && rightTangent) {
                const curveData = this.generateTangentCurve(
                    extensionPoint,
                    rightGuidePoint,
                    trackTangent,
                    rightTangent,
                    intersectionPoint
                );
                if (curveData && curveData.curvePoints && curveData.curvePoints.length > 0) {
                    turns.push({
                        points: curveData.curvePoints,
                        controlPoints: curveData.controlPoints,
                        startPoint: extensionPoint,
                        endPoint: rightGuidePoint
                    });
                }
            }
        }

        return turns;
    }

    /**
     * Generate a smooth curve with tangent constraints (Cubic Hermite Spline)
     * The curve is tangent to tangent1 at point1 and tangent to tangent2 at point2
     * @param {Object} point1 - Start point (extension point) {x, y}
     * @param {Object} point2 - End point (guide point) {x, y}
     * @param {Object} tangent1 - Tangent direction at start {x, y} (normalized)
     * @param {Object} tangent2 - Tangent direction at end {x, y} (normalized)
     * @param {Object} intersectionPoint - The intersection point on the boundary {x, y}
     * @returns {Object} Object containing curvePoints and controlPoints
     */
    static generateTangentCurve(point1, point2, tangent1, tangent2, intersectionPoint) {
        const dx = point2.x - point1.x;
        const dy = point2.y - point1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 0.1) return { curvePoints: [], controlPoints: { cp1: point1, cp2: point2 } };

        // Simple approach from Rhino testing:
        // cp1 is at midpoint between intersection and point1 (extension point)
        // cp2 is at midpoint between intersection and point2 (guide point)
        const cp1x = (intersectionPoint.x + point1.x) / 2;
        const cp1y = (intersectionPoint.y + point1.y) / 2;

        const cp2x = (intersectionPoint.x + point2.x) / 2;
        const cp2y = (intersectionPoint.y + point2.y) / 2;

        // Generate curve using cubic Bezier formula
        const curvePoints = [];
        const numPoints = 20; // Smooth curve

        for (let i = 0; i <= numPoints; i++) {
            const t = i / numPoints;
            const t2 = t * t;
            const t3 = t2 * t;
            const mt = 1 - t;
            const mt2 = mt * mt;
            const mt3 = mt2 * mt;

            // Cubic Bezier formula: B(t) = (1-t)³P₀ + 3(1-t)²tP₁ + 3(1-t)t²P₂ + t³P₃
            const x = mt3 * point1.x +
                     3 * mt2 * t * cp1x +
                     3 * mt * t2 * cp2x +
                     t3 * point2.x;

            const y = mt3 * point1.y +
                     3 * mt2 * t * cp1y +
                     3 * mt * t2 * cp2y +
                     t3 * point2.y;

            curvePoints.push({ x, y });
        }

        return {
            curvePoints: curvePoints,
            controlPoints: {
                cp1: { x: cp1x, y: cp1y },
                cp2: { x: cp2x, y: cp2y }
            }
        };
    }

    /**
     * Generate a circular arc between two points (realistic tractor turn)
     * Uses agricultural vehicle turning geometry
     * The arc bulges toward the targetPoint (intersection point)
     */
    static generateBezierCurve(point1, point2, turnRadius = null, targetPoint = null) {
        const dx = point2.x - point1.x;
        const dy = point2.y - point1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 0.1) return [];

        // Default turning radius is based on typical tractor geometry
        // Most tractors have a turning radius of 2.5-3.5 meters for a 3m track width
        if (!turnRadius) {
            turnRadius = distance * 0.8; // Adjust based on distance
        }

        // Find the center of the circular arc
        // Using geometry: two circles of radius R passing through both points
        const midX = (point1.x + point2.x) / 2;
        const midY = (point1.y + point2.y) / 2;

        // Perpendicular bisector direction
        const perpX = -dy / distance;
        const perpY = dx / distance;

        // Distance from midpoint to circle center
        // Using Pythagorean theorem: h^2 + (d/2)^2 = R^2
        const halfDist = distance / 2;
        const centerOffset = Math.sqrt(Math.max(0, turnRadius * turnRadius - halfDist * halfDist));

        // Determine which side the arc should bulge toward
        // We have two possible circle centers, choose the one closer to the target point
        let centerX, centerY;

        if (targetPoint) {
            // Test both possible circle centers
            const center1X = midX + perpX * centerOffset;
            const center1Y = midY + perpY * centerOffset;
            const center2X = midX - perpX * centerOffset;
            const center2Y = midY - perpY * centerOffset;

            // Calculate which center is closer to the target (intersection) point
            const dist1 = Math.sqrt((center1X - targetPoint.x) ** 2 + (center1Y - targetPoint.y) ** 2);
            const dist2 = Math.sqrt((center2X - targetPoint.x) ** 2 + (center2Y - targetPoint.y) ** 2);

            // Choose the center FARTHER from the target point (makes arc bulge toward it)
            if (dist1 > dist2) {
                centerX = center1X;
                centerY = center1Y;
            } else {
                centerX = center2X;
                centerY = center2Y;
            }
        } else {
            // Default: use the first center
            centerX = midX + perpX * centerOffset;
            centerY = midY + perpY * centerOffset;
        }

        // Calculate angles for the arc
        const angle1 = Math.atan2(point1.y - centerY, point1.x - centerX);
        const angle2 = Math.atan2(point2.y - centerY, point2.x - centerX);

        // Determine sweep direction (shortest arc)
        let angleDiff = angle2 - angle1;
        if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

        // Generate smooth arc points
        const arcPoints = [];
        const numPoints = 16; // More points for smoother curve

        for (let i = 0; i <= numPoints; i++) {
            const t = i / numPoints;
            const angle = angle1 + angleDiff * t;

            const x = centerX + turnRadius * Math.cos(angle);
            const y = centerY + turnRadius * Math.sin(angle);

            arcPoints.push({ x, y });
        }

        return arcPoints;
    }

    /**
     * Generate omega turn (teardrop shaped turn for wider fields)
     */
    static generateOmegaTurn(point1, point2, radius, trackWidth) {
        const dx = point2.x - point1.x;
        const dy = point2.y - point1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 0.1) return [];

        const points = [];
        const numSegments = 16;

        // Direction perpendicular to the track
        const perpX = -dy / distance;
        const perpY = dx / distance;

        // Create teardrop shape
        for (let i = 0; i <= numSegments; i++) {
            const angle = (i / numSegments) * Math.PI;

            const r = radius * (1 + 0.5 * Math.sin(angle)); // Teardrop shape
            const x = point1.x + perpX * r * Math.cos(angle) + dx * (i / numSegments);
            const y = point1.y + perpY * r * Math.sin(angle) + dy * (i / numSegments);

            points.push({ x, y });
        }

        return points;
    }

    /**
     * Calculate intersection points between a line segment and a polygon
     * Returns array of intersection points
     */
    static linePolygonIntersection(lineStart, lineEnd, polygon) {
        const intersections = [];

        for (let i = 0; i < polygon.length; i++) {
            const j = (i + 1) % polygon.length;
            const edgeStart = polygon[i];
            const edgeEnd = polygon[j];

            const intersection = this.lineSegmentIntersection(
                lineStart, lineEnd,
                edgeStart, edgeEnd
            );

            if (intersection) {
                intersections.push(intersection);
            }
        }

        return intersections;
    }

    /**
     * Find intersection between two line segments
     * Uses epsilon for floating-point tolerance
     */
    static lineSegmentIntersection(p1, p2, p3, p4) {
        const x1 = p1.x, y1 = p1.y;
        const x2 = p2.x, y2 = p2.y;
        const x3 = p3.x, y3 = p3.y;
        const x4 = p4.x, y4 = p4.y;

        const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);

        // Use adaptive epsilon based on coordinate scale
        const scale = Math.max(
            Math.abs(x1), Math.abs(x2), Math.abs(x3), Math.abs(x4),
            Math.abs(y1), Math.abs(y2), Math.abs(y3), Math.abs(y4),
            1
        );
        const epsilon = scale * 1e-10;

        if (Math.abs(denom) < epsilon) return null; // Parallel lines

        const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
        const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

        // Allow small tolerance at segment endpoints
        const tolerance = 1e-6;

        if (t >= -tolerance && t <= 1 + tolerance && u >= -tolerance && u <= 1 + tolerance) {
            // Clamp t and u to [0, 1] to avoid tiny overshoots
            const tClamped = Math.max(0, Math.min(1, t));
            const uClamped = Math.max(0, Math.min(1, u));

            return {
                x: x1 + tClamped * (x2 - x1),
                y: y1 + tClamped * (y2 - y1)
            };
        }

        return null;
    }

    /**
     * Calculate distance between two points
     */
    static distance(p1, p2) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Move a point along a line by a given distance
     */
    static moveAlongLine(lineStart, lineEnd, fromPoint, distance) {
        const dx = lineEnd.x - lineStart.x;
        const dy = lineEnd.y - lineStart.y;
        const lineLength = Math.sqrt(dx * dx + dy * dy);

        if (lineLength < 0.001) return fromPoint;

        const dirX = dx / lineLength;
        const dirY = dy / lineLength;

        return {
            x: fromPoint.x + dirX * distance,
            y: fromPoint.y + dirY * distance
        };
    }

    /**
     * Find the closest point on a polygon to a given point
     * Returns {point, segmentIndex, distance}
     */
    static closestPointOnPolygon(point, polygon) {
        let minDist = Infinity;
        let closestPoint = null;
        let segmentIndex = -1;

        for (let i = 0; i < polygon.length; i++) {
            const j = (i + 1) % polygon.length;
            const edgeStart = polygon[i];
            const edgeEnd = polygon[j];

            const cp = this.closestPointOnSegment(point, edgeStart, edgeEnd);
            const dist = this.distance(point, cp);

            if (dist < minDist) {
                minDist = dist;
                closestPoint = cp;
                segmentIndex = i;
            }
        }

        return { point: closestPoint, segmentIndex, distance: minDist };
    }

    /**
     * Find closest point on a line segment to a given point
     */
    static closestPointOnSegment(point, segStart, segEnd) {
        const dx = segEnd.x - segStart.x;
        const dy = segEnd.y - segStart.y;
        const lengthSquared = dx * dx + dy * dy;

        if (lengthSquared < 0.0001) return segStart;

        const t = Math.max(0, Math.min(1,
            ((point.x - segStart.x) * dx + (point.y - segStart.y) * dy) / lengthSquared
        ));

        return {
            x: segStart.x + t * dx,
            y: segStart.y + t * dy
        };
    }

    /**
     * Walk along a polygon perimeter by a given distance from a start point
     * Returns the point at the specified distance along the perimeter
     */
    static walkAlongPolygon(polygon, startPoint, distance) {
        // Find closest point on polygon and which segment it's on
        const { point: closestPoint, segmentIndex } = this.closestPointOnPolygon(startPoint, polygon);

        let remainingDist = Math.abs(distance);
        let currentPoint = closestPoint;
        let currentSegment = segmentIndex;
        const direction = distance > 0 ? 1 : -1;

        // Walk forward or backward along the polygon
        let iterations = 0;
        const maxIterations = polygon.length * 2;

        while (remainingDist > 0.001 && iterations < maxIterations) {
            iterations++;

            const nextIndex = direction > 0
                ? (currentSegment + 1) % polygon.length
                : (currentSegment + polygon.length) % polygon.length;

            const segmentEnd = polygon[nextIndex];
            const distToEnd = this.distance(currentPoint, segmentEnd);

            if (distToEnd >= remainingDist) {
                // We can reach the target within this segment
                return this.moveAlongLine(currentPoint, segmentEnd, currentPoint, remainingDist);
            } else {
                // Move to the end of this segment and continue
                remainingDist -= distToEnd;
                currentPoint = segmentEnd;
                currentSegment = direction > 0
                    ? (currentSegment + 1) % polygon.length
                    : (currentSegment - 1 + polygon.length) % polygon.length;
            }
        }

        return currentPoint;
    }

    /**
     * Generate reference points for track-boundary intersections
     * Returns object with intersection points, track extension points, and boundary guide points
     */
    static generateReferencePoints(tracks, workingZone, trackWidth, distanceMultiplier = 0.3, bufferedObstacles = []) {
        if (!tracks || !workingZone || tracks.length === 0 || workingZone.length < 3) {
            return {
                intersectionPoints: [],
                trackExtensionPoints: [],
                boundaryGuidePoints: []
            };
        }

        const intersectionPoints = [];
        const trackExtensionPoints = [];
        const boundaryGuidePoints = [];
        const intersectionGroups = []; // NEW: Groups of 3 points per intersection
        const extensionDistance = trackWidth * distanceMultiplier;

        tracks.forEach((track, trackIndex) => {
            if (!track || track.length !== 2) return;

            const [start, end] = track;

            // Find intersections with working zone boundary (for track endpoints)
            const workingZoneIntersections = this.linePolygonIntersection(start, end, workingZone);

            // Find intersections with buffered obstacles
            let obstacleIntersections = [];
            if (bufferedObstacles && bufferedObstacles.length > 0) {
                bufferedObstacles.forEach((obstacle, obstacleIndex) => {
                    if (obstacle && obstacle.length >= 3) {
                        const intersects = this.linePolygonIntersection(start, end, obstacle);
                        intersects.forEach(intersection => {
                            obstacleIntersections.push({
                                point: intersection,
                                obstacleIndex: obstacleIndex,
                                polygon: obstacle
                            });
                        });
                    }
                });
            }

            // Combine all intersections
            const intersections = workingZoneIntersections.map(point => ({
                point,
                polygon: workingZone,
                isOuterBoundary: true
            })).concat(obstacleIntersections.map(obj => ({
                ...obj,
                isOuterBoundary: false
            })));

            intersections.forEach(intersectionData => {
                const intersection = intersectionData.point;
                const polygon = intersectionData.polygon;

                // Add intersection point
                intersectionPoints.push({
                    point: intersection,
                    trackIndex,
                    type: 'intersection',
                    isOuterBoundary: intersectionData.isOuterBoundary
                });

                // Calculate track extension point (inward from boundary)
                // Determine which end of the track is closer to the intersection
                const distToStart = this.distance(intersection, start);
                const distToEnd = this.distance(intersection, end);

                const otherEnd = (distToStart < distToEnd) ? end : start;
                const extensionPoint = this.moveAlongLine(intersection, otherEnd, intersection, extensionDistance);

                // Calculate boundary guide points (left and right along boundary)
                // Use the specific polygon (working zone or obstacle)
                const leftPoint = this.walkAlongPolygon(polygon, intersection, -extensionDistance);
                const rightPoint = this.walkAlongPolygon(polygon, intersection, extensionDistance);

                // Calculate angles between track and boundary edges
                // Track direction vector
                const trackDx = otherEnd.x - intersection.x;
                const trackDy = otherEnd.y - intersection.y;
                const trackAngle = Math.atan2(trackDy, trackDx);

                // Left boundary edge direction
                const leftDx = leftPoint.x - intersection.x;
                const leftDy = leftPoint.y - intersection.y;
                const leftBoundaryAngle = Math.atan2(leftDy, leftDx);

                // Right boundary edge direction
                const rightDx = rightPoint.x - intersection.x;
                const rightDy = rightPoint.y - intersection.y;
                const rightBoundaryAngle = Math.atan2(rightDy, rightDx);

                // Calculate angle differences (in degrees)
                let leftAngleDiff = ((leftBoundaryAngle - trackAngle) * 180 / Math.PI) % 360;
                if (leftAngleDiff < 0) leftAngleDiff += 360;
                if (leftAngleDiff > 180) leftAngleDiff = 360 - leftAngleDiff;

                let rightAngleDiff = ((rightBoundaryAngle - trackAngle) * 180 / Math.PI) % 360;
                if (rightAngleDiff < 0) rightAngleDiff += 360;
                if (rightAngleDiff > 180) rightAngleDiff = 360 - rightAngleDiff;

                // Calculate dynamic extension distance based on angles
                // Rule: if angle > 90°, add 0.1 for every 10° over 90
                const maxAngle = Math.max(leftAngleDiff, rightAngleDiff);
                let adjustedExtensionDistance = extensionDistance;

                if (maxAngle > 90) {
                    const degreesOver90 = maxAngle - 90;
                    const additionalMultiplier = Math.floor(degreesOver90 / 10) * 0.1;
                    adjustedExtensionDistance = trackWidth * (distanceMultiplier + additionalMultiplier);
                }

                // Recalculate extension point with adjusted distance
                const adjustedExtensionPoint = this.moveAlongLine(intersection, otherEnd, intersection, adjustedExtensionDistance);

                // Adjust boundary guide points if angle < 90°
                // Rule: if angle < 90°, add 0.1 to distance along boundary
                let adjustedLeftPoint = leftPoint;
                let adjustedRightPoint = rightPoint;

                if (leftAngleDiff < 90) {
                    const adjustedLeftDistance = extensionDistance + trackWidth * 0.1;
                    adjustedLeftPoint = this.walkAlongPolygon(polygon, intersection, -adjustedLeftDistance);
                }

                if (rightAngleDiff < 90) {
                    const adjustedRightDistance = extensionDistance + trackWidth * 0.1;
                    adjustedRightPoint = this.walkAlongPolygon(polygon, intersection, adjustedRightDistance);
                }

                // Calculate normalized tangent vectors for curve generation
                const trackLength = Math.sqrt(trackDx * trackDx + trackDy * trackDy);
                const trackTangentX = trackDx / trackLength;
                const trackTangentY = trackDy / trackLength;

                // Recalculate tangent vectors using adjusted boundary points
                const leftDxAdj = adjustedLeftPoint.x - intersection.x;
                const leftDyAdj = adjustedLeftPoint.y - intersection.y;
                const leftLengthAdj = Math.sqrt(leftDxAdj * leftDxAdj + leftDyAdj * leftDyAdj);
                const leftTangentX = leftDxAdj / leftLengthAdj;
                const leftTangentY = leftDyAdj / leftLengthAdj;

                const rightDxAdj = adjustedRightPoint.x - intersection.x;
                const rightDyAdj = adjustedRightPoint.y - intersection.y;
                const rightLengthAdj = Math.sqrt(rightDxAdj * rightDxAdj + rightDyAdj * rightDyAdj);
                const rightTangentX = rightDxAdj / rightLengthAdj;
                const rightTangentY = rightDyAdj / rightLengthAdj;

                // Create a group of 3 points that belong together
                const group = {
                    intersectionPoint: intersection,
                    extensionPoint: adjustedExtensionPoint,
                    leftGuidePoint: adjustedLeftPoint,
                    rightGuidePoint: adjustedRightPoint,
                    leftAngle: leftAngleDiff,
                    rightAngle: rightAngleDiff,
                    adjustedDistance: adjustedExtensionDistance,
                    trackIndex,
                    // Tangent vectors for smooth curve generation
                    trackTangent: { x: trackTangentX, y: trackTangentY },
                    leftTangent: { x: leftTangentX, y: leftTangentY },
                    rightTangent: { x: rightTangentX, y: rightTangentY }
                };

                intersectionGroups.push(group);

                // Also add to individual arrays for visualization
                trackExtensionPoints.push({
                    point: adjustedExtensionPoint,
                    trackIndex,
                    intersectionPoint: intersection,
                    type: 'extension'
                });

                boundaryGuidePoints.push({
                    point: adjustedLeftPoint,
                    trackIndex,
                    intersectionPoint: intersection,
                    side: 'left',
                    type: 'guide'
                });

                boundaryGuidePoints.push({
                    point: adjustedRightPoint,
                    trackIndex,
                    intersectionPoint: intersection,
                    side: 'right',
                    type: 'guide'
                });
            });
        });

        return {
            intersectionPoints,
            trackExtensionPoints,
            boundaryGuidePoints,
            intersectionGroups  // NEW: Array of grouped points
        };
    }
}
