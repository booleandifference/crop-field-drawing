"""
Firebase Cloud Function for Advanced Crop Field Geometry
Uses Shapely for production-grade polygon operations
"""

from firebase_functions import https_fn, options
from shapely.geometry import Polygon, LineString, MultiLineString, Point
from shapely.ops import unary_union
import json
import math


@https_fn.on_request(
    cors=options.CorsOptions(
        cors_origins="*",
        cors_methods=["get", "post"],
    )
)
def calculate_tracks(req: https_fn.Request) -> https_fn.Response:
    """
    Calculate accurate tractor tracks using Shapely library

    Request JSON:
    {
        "boundary": [{"x": 0, "y": 0}, ...],
        "obstacles": [[{"x": 0, "y": 0}, ...], ...],
        "trackWidth": 30,
        "headlandBuffer": 1.0,
        "trackAngle": 0
    }

    Response JSON:
    {
        "tracks": [[[x1, y1], [x2, y2]], ...],
        "workingZone": [[x1, y1], ...],
        "bufferedObstacles": [[[x1, y1], ...], ...],
        "success": true
    }
    """

    try:
        # Parse request
        data = req.get_json()

        if not data:
            return https_fn.Response(
                json.dumps({"error": "No data provided", "success": False}),
                status=400,
                mimetype='application/json'
            )

        boundary = data.get('boundary', [])
        obstacles = data.get('obstacles', [])
        track_width = data.get('trackWidth', 30)
        headland_buffer = data.get('headlandBuffer', 1.0)
        track_angle = data.get('trackAngle', 0)

        # Validate inputs
        if len(boundary) < 3:
            return https_fn.Response(
                json.dumps({"error": "Boundary must have at least 3 points", "success": False}),
                status=400,
                mimetype='application/json'
            )

        # Create boundary polygon
        boundary_coords = [(p['x'], p['y']) for p in boundary]
        boundary_poly = Polygon(boundary_coords)

        if not boundary_poly.is_valid:
            boundary_poly = boundary_poly.buffer(0)  # Fix invalid polygons

        # Calculate headland distance and buffer inward
        headland_distance = track_width * headland_buffer
        working_zone = boundary_poly.buffer(-headland_distance)

        if working_zone.is_empty or working_zone.area < 1:
            return https_fn.Response(
                json.dumps({
                    "error": "Buffer is too large for this field",
                    "success": False
                }),
                status=400,
                mimetype='application/json'
            )

        # Process obstacles
        buffered_obstacles = []
        for obstacle in obstacles:
            if len(obstacle) >= 3:
                obs_coords = [(p['x'], p['y']) for p in obstacle]
                obs_poly = Polygon(obs_coords)

                if not obs_poly.is_valid:
                    obs_poly = obs_poly.buffer(0)

                # Buffer outward
                obs_buffered = obs_poly.buffer(headland_distance)
                buffered_obstacles.append(obs_buffered)

                # Subtract from working zone
                working_zone = working_zone.difference(obs_buffered)

        # Generate track lines
        tracks = generate_parallel_tracks(
            working_zone,
            track_width,
            track_angle
        )

        # Prepare response
        response_data = {
            "tracks": tracks,
            "workingZone": polygon_to_coords(working_zone),
            "bufferedObstacles": [polygon_to_coords(obs) for obs in buffered_obstacles],
            "success": True,
            "stats": {
                "trackCount": len(tracks),
                "workingArea": working_zone.area,
                "boundaryArea": boundary_poly.area,
                "headlandArea": boundary_poly.area - working_zone.area
            }
        }

        return https_fn.Response(
            json.dumps(response_data),
            status=200,
            mimetype='application/json',
            headers={"Access-Control-Allow-Origin": "*"}
        )

    except Exception as e:
        return https_fn.Response(
            json.dumps({
                "error": str(e),
                "success": False
            }),
            status=500,
            mimetype='application/json'
        )


def generate_parallel_tracks(working_zone, track_width, angle_degrees):
    """Generate parallel track lines within the working zone"""

    if working_zone.is_empty:
        return []

    # Get bounding box
    minx, miny, maxx, maxy = working_zone.bounds

    # Calculate diagonal for line length
    diagonal = math.sqrt((maxx - minx)**2 + (maxy - miny)**2)

    # Convert angle to radians
    angle = math.radians(angle_degrees)

    # Direction vectors
    line_dir = (math.cos(angle), math.sin(angle))
    perp_dir = (-math.sin(angle), math.cos(angle))

    # Center point
    center_x = (minx + maxx) / 2
    center_y = (miny + maxy) / 2

    # Generate lines
    tracks = []
    num_lines = int(diagonal / track_width) + 2

    for i in range(-num_lines, num_lines + 1):
        offset = i * track_width

        # Line starting point (perpendicular offset from center)
        start_offset = (
            center_x + perp_dir[0] * offset,
            center_y + perp_dir[1] * offset
        )

        # Extend line in both directions
        line_start = (
            start_offset[0] - line_dir[0] * diagonal,
            start_offset[1] - line_dir[1] * diagonal
        )
        line_end = (
            start_offset[0] + line_dir[0] * diagonal,
            start_offset[1] + line_dir[1] * diagonal
        )

        # Create line and intersect with working zone
        line = LineString([line_start, line_end])
        intersection = line.intersection(working_zone)

        # Extract track segments
        if not intersection.is_empty:
            if isinstance(intersection, LineString):
                coords = list(intersection.coords)
                if len(coords) >= 2:
                    tracks.append([list(coords[0]), list(coords[-1])])
            elif isinstance(intersection, MultiLineString):
                for segment in intersection.geoms:
                    coords = list(segment.coords)
                    if len(coords) >= 2:
                        tracks.append([list(coords[0]), list(coords[-1])])

    return tracks


def polygon_to_coords(geom):
    """Convert Shapely polygon to coordinate list"""
    if geom.is_empty:
        return []

    if hasattr(geom, 'exterior'):
        # Single polygon
        coords = list(geom.exterior.coords)
        return [[x, y] for x, y in coords[:-1]]  # Exclude duplicate closing point
    else:
        # MultiPolygon - return largest
        if hasattr(geom, 'geoms'):
            largest = max(geom.geoms, key=lambda p: p.area)
            coords = list(largest.exterior.coords)
            return [[x, y] for x, y in coords[:-1]]

    return []


@https_fn.on_request(cors=options.CorsOptions(cors_origins="*"))
def find_optimal_angle(req: https_fn.Request) -> https_fn.Response:
    """
    Find the optimal track angle based on field geometry

    Request JSON:
    {
        "boundary": [{"x": 0, "y": 0}, ...]
    }

    Response JSON:
    {
        "angle": 45.5,
        "success": true
    }
    """

    try:
        data = req.get_json()
        boundary = data.get('boundary', [])

        if len(boundary) < 3:
            return https_fn.Response(
                json.dumps({"error": "Invalid boundary", "success": False}),
                status=400,
                mimetype='application/json'
            )

        # Find longest edge
        max_length = 0
        optimal_angle = 0

        for i in range(len(boundary)):
            j = (i + 1) % len(boundary)
            dx = boundary[j]['x'] - boundary[i]['x']
            dy = boundary[j]['y'] - boundary[i]['y']
            length = math.sqrt(dx**2 + dy**2)

            if length > max_length:
                max_length = length
                optimal_angle = math.degrees(math.atan2(dy, dx))

        # Normalize to 0-180
        while optimal_angle < 0:
            optimal_angle += 180
        while optimal_angle >= 180:
            optimal_angle -= 180

        return https_fn.Response(
            json.dumps({
                "angle": optimal_angle,
                "success": True
            }),
            status=200,
            mimetype='application/json',
            headers={"Access-Control-Allow-Origin": "*"}
        )

    except Exception as e:
        return https_fn.Response(
            json.dumps({"error": str(e), "success": False}),
            status=500,
            mimetype='application/json'
        )
