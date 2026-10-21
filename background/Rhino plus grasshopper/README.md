# Rhino and Grasshopper source

These are the source files for the pen-plotted drawings in [Semi-automated crop field drawings](https://mortensylvest.studio/outputs/QyRMkgmy4AgRHRTrhsql) (2025). The web app in this repository is built on the Grasshopper logic: a field outline drawn by hand, then a script that fills it with a tractor-track pattern for the plotter.

Open the `.3dm` in Rhino and the `.gh` in Grasshopper. The model holds the traced fields. The definition generates the double lines and the texture across them.

| File | What it is |
|---|---|
| `semi automated crop foeld drawings v1.3dm` | Rhino model. Field perimeters traced by hand from aerial photographs. |
| `semi automated crop field drawings v1.gh` | Grasshopper definition. Generates the double lines and the track texture from those outlines. |

## How the drawings were made

The drawings come from aerial photographs of crop fields along the route from Copenhagen to Roskilde, the first 48 kilometres of a longer trip through Denmark's cultivated landscapes. In Rhino, each field perimeter is traced by hand. The Grasshopper script then generates tractor-like patterns across that outline: the double lines and the texture of the working passes.

That split is the point of the work. The hand draws the boundary. The script does what a GPS-guided tractor does inside it. The published note puts it this way: the hybrid of automated and hand-drawn elements reflects modern agriculture, where GPS-guided tractors work in tandem with human operators. The fields sit where city and countryside meet, on the way out of Copenhagen, and the plots are a geometric window onto land that feeds the city without being visited.

Each of the 16 drawings is a black 0.5 mm pen plot on 310g A3 Viking Iris watercolour paper (297 × 420 mm), in an edition of 64. The count is deliberate: 16 for hexadecimal, 64 for 64-bit computing, set against machinery that draws the same patterns in fields all over the world.

The plotted sheets, process images, and source fields are in [semi-automated crop field drawings](../semi-automated-crop-field-drawings/README.md).

## The web app

The browser app keeps the same division of labour. You draw the boundary, and any obstacles, by hand. Parallel tracks inside a headland offset, and the turns where a track meets the edge, are what the app's geometry does in place of the Grasshopper definition. It then writes an SVG for the same kind of pen plot.

The Bézier turns in the app come from testing the curves in Rhino: each turn has two endpoints and two control points, and each control point sits halfway between the intersection and an endpoint. Track spacing, headland width, and track angle are the same kinds of decisions the Grasshopper definition makes when it fills a traced field.
