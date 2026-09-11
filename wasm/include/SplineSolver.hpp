#pragma once

/**
 * ============================================================================
 * SPLINE SOLVER (UNREAL ENGINE FConnectionDrawingPolicy C++ SPECIFICATION)
 * ============================================================================
 * Implements Cubic Hermite and Bezier curve evaluation for visual node graphs.
 * Features:
 * - Dynamic tangent scaling based on pin distance (Tension = 0.5f).
 * - Minimum tangent enforcement (MinTangent = 45.0f) for smooth initial exit.
 * - Reverse connection looping: when an output pin is to the right of an input
 *   pin (DeltaX < 0), bends cleanly around without clipping node cards.
 * - Exact Bezier control point calculation (P0, P1, P2, P3).
 * ============================================================================
 */

#include <string>
#include <cmath>
#include <vector>

namespace WebAppEngine {

struct Point2D {
    float x{0.0f};
    float y{0.0f};

    Point2D() = default;
    Point2D(float inX, float inY) : x(inX), y(inY) {}

    Point2D operator+(const Point2D& other) const { return Point2D(x + other.x, y + other.y); }
    Point2D operator-(const Point2D& other) const { return Point2D(x - other.x, y - other.y); }
    Point2D operator*(float scalar) const { return Point2D(x * scalar, y * scalar); }
};

struct SplineConfig {
    float tension{0.5f};
    float minTangent{45.0f};
    float loopOffset{60.0f};
};

struct ArcLengthTable {
    std::vector<float> tSamples;        // Parameter values in [0, 1]
    std::vector<float> arcLengths;      // Cumulative lengths from t=0
    float totalLength{0.0f};

    /**
     * Inverts arc length s in [0, 1] (normalized distance along curve)
     * to corresponding Bezier parameter t in [0, 1] using binary search + lerp.
     */
    float getTForNormalizedArcLength(float normalizedDistance) const;

    /**
     * Inverts absolute distance in pixels (0 to totalLength) to parameter t.
     */
    float getTForDistance(float distance) const;
};

struct SplineResult {
    Point2D p0; // Start pin
    Point2D p1; // First control point
    Point2D p2; // Second control point
    Point2D p3; // End pin
    std::string svgPath;
    float approximateLength{0.0f};
    ArcLengthTable arcLengthTable;
};

class SplineSolver {
public:
    /**
     * Calculates the cubic Bezier wire curve between two pins matching
     * Unreal Engine's FConnectionDrawingPolicy with arc-length parameterization.
     * 
     * @param start Position of output pin (source)
     * @param end Position of input pin (target)
     * @param config Tuning parameters (tension, minTangent, loopOffset)
     * @return SplineResult containing control points, SVG path string, and arc-length table
     */
    static SplineResult calculateWireSpline(
        const Point2D& start,
        const Point2D& end,
        const SplineConfig& config = SplineConfig()
    );

    /**
     * Evaluates position on the cubic Bezier curve at parameter t in [0, 1].
     */
    static Point2D evaluateBezier(
        const Point2D& p0,
        const Point2D& p1,
        const Point2D& p2,
        const Point2D& p3,
        float t
    );

    /**
     * Builds an ArcLengthTable for uniform curve parameterization.
     */
    static ArcLengthTable buildArcLengthTable(
        const Point2D& p0,
        const Point2D& p1,
        const Point2D& p2,
        const Point2D& p3,
        int sampleCount = 64
    );

    /**
     * Evaluates position on the curve at normalized arc-length distance s in [0, 1].
     * Guarantees strictly constant speed across the curve.
     */
    static Point2D evaluateUniformAt(
        const Point2D& p0,
        const Point2D& p1,
        const Point2D& p2,
        const Point2D& p3,
        const ArcLengthTable& table,
        float normalizedDistance
    );

    /**
     * Generates N uniformly spaced points along the curve.
     * Essential for wire pulse animations and Verlet physics particles.
     */
    static std::vector<Point2D> sampleUniformPoints(
        const Point2D& p0,
        const Point2D& p1,
        const Point2D& p2,
        const Point2D& p3,
        int pointCount,
        const ArcLengthTable& table
    );

    /**
     * Formats points into an SVG path string: "M x1 y1 C cx1 cy1, cx2 cy2, x2 y2"
     */
    static std::string formatSvgPath(
        const Point2D& p0,
        const Point2D& p1,
        const Point2D& p2,
        const Point2D& p3
    );
};

} // namespace WebAppEngine
