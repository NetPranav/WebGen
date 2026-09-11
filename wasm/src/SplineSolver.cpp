#include "SplineSolver.hpp"
#include <sstream>
#include <iomanip>
#include <algorithm>

namespace WebAppEngine {

SplineResult SplineSolver::calculateWireSpline(
    const Point2D& start,
    const Point2D& end,
    const SplineConfig& config
) {
    SplineResult result;
    result.p0 = start;
    result.p3 = end;

    const float deltaX = end.x - start.x;
    const float deltaY = end.y - start.y;

    Point2D p1;
    Point2D p2;

    if (deltaX >= 0.0f) {
        // Standard forward wire (Source is to the left of Target)
        // Tangent magnitude grows with distance, clamped to at least minTangent
        const float tangentX = std::max(deltaX * config.tension, config.minTangent);

        p1 = Point2D(start.x + tangentX, start.y);
        p2 = Point2D(end.x - tangentX, end.y);
    } else {
        // Reverse loop connection (Target is to the left of Source)
        // Unreal Engine FConnectionDrawingPolicy applies reverse loop tangents
        // so the wire loops smoothly above/below rather than crashing straight back.
        const float backwardDistance = std::abs(deltaX);
        const float tangentX = std::max(backwardDistance * config.tension, config.minTangent * 1.5f);

        // Adjust Y curvature to gracefully route around the nodes
        const float yOffset = (std::abs(deltaY) < 30.0f) 
            ? (deltaY >= 0.0f ? config.loopOffset : -config.loopOffset)
            : 0.0f;

        p1 = Point2D(start.x + tangentX, start.y + yOffset * 0.4f);
        p2 = Point2D(end.x - tangentX, end.y - yOffset * 0.4f);
    }

    result.p1 = p1;
    result.p2 = p2;
    result.svgPath = formatSvgPath(result.p0, result.p1, result.p2, result.p3);

    // Build 64-step arc-length lookup table for sub-pixel precision
    result.arcLengthTable = buildArcLengthTable(result.p0, result.p1, result.p2, result.p3, 64);
    result.approximateLength = result.arcLengthTable.totalLength;

    return result;
}

float ArcLengthTable::getTForDistance(float distance) const {
    if (arcLengths.empty() || tSamples.empty()) return 0.0f;
    if (distance <= 0.0f) return 0.0f;
    if (distance >= totalLength) return 1.0f;

    auto it = std::lower_bound(arcLengths.begin(), arcLengths.end(), distance);
    if (it == arcLengths.begin()) return tSamples.front();
    if (it == arcLengths.end()) return tSamples.back();

    const size_t idx = static_cast<size_t>(std::distance(arcLengths.begin(), it));
    const size_t prevIdx = idx - 1;

    const float d0 = arcLengths[prevIdx];
    const float d1 = arcLengths[idx];
    const float segmentFraction = (d1 > d0) ? (distance - d0) / (d1 - d0) : 0.0f;

    const float t0 = tSamples[prevIdx];
    const float t1 = tSamples[idx];
    return t0 + segmentFraction * (t1 - t0);
}

float ArcLengthTable::getTForNormalizedArcLength(float normalizedDistance) const {
    const float clamped = std::max(0.0f, std::min(1.0f, normalizedDistance));
    return getTForDistance(clamped * totalLength);
}

ArcLengthTable SplineSolver::buildArcLengthTable(
    const Point2D& p0,
    const Point2D& p1,
    const Point2D& p2,
    const Point2D& p3,
    int sampleCount
) {
    ArcLengthTable table;
    const int count = std::max(sampleCount, 8);
    table.tSamples.reserve(count + 1);
    table.arcLengths.reserve(count + 1);

    table.tSamples.push_back(0.0f);
    table.arcLengths.push_back(0.0f);

    Point2D prev = p0;
    float cumulativeLength = 0.0f;

    for (int i = 1; i <= count; ++i) {
        const float t = static_cast<float>(i) / static_cast<float>(count);
        Point2D curr = evaluateBezier(p0, p1, p2, p3, t);
        const float dx = curr.x - prev.x;
        const float dy = curr.y - prev.y;
        cumulativeLength += std::sqrt(dx * dx + dy * dy);

        table.tSamples.push_back(t);
        table.arcLengths.push_back(cumulativeLength);
        prev = curr;
    }

    table.totalLength = cumulativeLength;
    return table;
}

Point2D SplineSolver::evaluateUniformAt(
    const Point2D& p0,
    const Point2D& p1,
    const Point2D& p2,
    const Point2D& p3,
    const ArcLengthTable& table,
    float normalizedDistance
) {
    const float t = table.getTForNormalizedArcLength(normalizedDistance);
    return evaluateBezier(p0, p1, p2, p3, t);
}

std::vector<Point2D> SplineSolver::sampleUniformPoints(
    const Point2D& p0,
    const Point2D& p1,
    const Point2D& p2,
    const Point2D& p3,
    int pointCount,
    const ArcLengthTable& table
) {
    std::vector<Point2D> points;
    if (pointCount <= 0) return points;
    points.reserve(pointCount);

    if (pointCount == 1) {
        points.push_back(p0);
        return points;
    }

    for (int i = 0; i < pointCount; ++i) {
        const float s = static_cast<float>(i) / static_cast<float>(pointCount - 1);
        points.push_back(evaluateUniformAt(p0, p1, p2, p3, table, s));
    }

    return points;
}

Point2D SplineSolver::evaluateBezier(
    const Point2D& p0,
    const Point2D& p1,
    const Point2D& p2,
    const Point2D& p3,
    float t
) {
    const float u = 1.0f - t;
    const float tt = t * t;
    const float uu = u * u;
    const float uuu = uu * u;
    const float ttt = tt * t;

    Point2D p;
    p.x = uuu * p0.x + 3.0f * uu * t * p1.x + 3.0f * u * tt * p2.x + ttt * p3.x;
    p.y = uuu * p0.y + 3.0f * uu * t * p1.y + 3.0f * u * tt * p2.y + ttt * p3.y;
    return p;
}

std::string SplineSolver::formatSvgPath(
    const Point2D& p0,
    const Point2D& p1,
    const Point2D& p2,
    const Point2D& p3
) {
    std::ostringstream ss;
    ss << std::fixed << std::setprecision(1);
    ss << "M " << p0.x << " " << p0.y
       << " C " << p1.x << " " << p1.y
       << ", " << p2.x << " " << p2.y
       << ", " << p3.x << " " << p3.y;
    return ss.str();
}

} // namespace WebAppEngine
