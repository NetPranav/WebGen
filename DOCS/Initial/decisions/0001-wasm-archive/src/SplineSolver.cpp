#include "SplineSolver.hpp"
#include <sstream>
#include <iomanip>
#include <algorithm>
#include <wasm_simd128.h>

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

ArcLengthTable SplineSolver::buildArcLengthTableSIMD(
    const Point2D& p0,
    const Point2D& p1,
    const Point2D& p2,
    const Point2D& p3,
    int sampleCount
) {
    // 4-lane SIMD-optimized arc-length table evaluation
    ArcLengthTable table;
    const int count = std::max(sampleCount, 8);
    table.tSamples.reserve(count + 1);
    table.arcLengths.reserve(count + 1);

    table.tSamples.push_back(0.0f);
    table.arcLengths.push_back(0.0f);

    Point2D prev = p0;
    float cumulativeLength = 0.0f;

    // Process 4 samples at a time
    int i = 1;
    for (; i + 3 <= count; i += 4) {
        float t0 = static_cast<float>(i) / count;
        float t1 = static_cast<float>(i + 1) / count;
        float t2 = static_cast<float>(i + 2) / count;
        float t3 = static_cast<float>(i + 3) / count;

#if defined(__wasm_simd128__)
        v128_t vt = wasm_f32x4_make(t0, t1, t2, t3);
        v128_t v1 = wasm_f32x4_splat(1.0f);
        v128_t vu = wasm_f32x4_sub(v1, vt);
        v128_t vtt = wasm_f32x4_mul(vt, vt);
        v128_t vuu = wasm_f32x4_mul(vu, vu);
        v128_t vuuu = wasm_f32x4_mul(vuu, vu);
        v128_t vttt = wasm_f32x4_mul(vtt, vt);
        v128_t v3 = wasm_f32x4_splat(3.0f);
        v128_t c1 = wasm_f32x4_mul(wasm_f32x4_mul(v3, vuu), vt);
        v128_t c2 = wasm_f32x4_mul(wasm_f32x4_mul(v3, vu), vtt);

        v128_t vx0 = wasm_f32x4_splat(p0.x);
        v128_t vx1 = wasm_f32x4_splat(p1.x);
        v128_t vx2 = wasm_f32x4_splat(p2.x);
        v128_t vx3 = wasm_f32x4_splat(p3.x);
        v128_t px = wasm_f32x4_add(
            wasm_f32x4_add(wasm_f32x4_mul(vuuu, vx0), wasm_f32x4_mul(c1, vx1)),
            wasm_f32x4_add(wasm_f32x4_mul(c2, vx2), wasm_f32x4_mul(vttt, vx3))
        );

        v128_t vy0 = wasm_f32x4_splat(p0.y);
        v128_t vy1 = wasm_f32x4_splat(p1.y);
        v128_t vy2 = wasm_f32x4_splat(p2.y);
        v128_t vy3 = wasm_f32x4_splat(p3.y);
        v128_t py = wasm_f32x4_add(
            wasm_f32x4_add(wasm_f32x4_mul(vuuu, vy0), wasm_f32x4_mul(c1, vy1)),
            wasm_f32x4_add(wasm_f32x4_mul(c2, vy2), wasm_f32x4_mul(vttt, vy3))
        );

        float ptsX[4], ptsY[4];
        wasm_v128_store(ptsX, px);
        wasm_v128_store(ptsY, py);

        for (int lane = 0; lane < 4; ++lane) {
            Point2D curr(ptsX[lane], ptsY[lane]);
            cumulativeLength += std::hypot(curr.x - prev.x, curr.y - prev.y);
            table.tSamples.push_back(static_cast<float>(i + lane) / count);
            table.arcLengths.push_back(cumulativeLength);
            prev = curr;
        }
#else
        Point2D c0 = evaluateBezier(p0, p1, p2, p3, t0);
        cumulativeLength += std::hypot(c0.x - prev.x, c0.y - prev.y);
        table.tSamples.push_back(t0);
        table.arcLengths.push_back(cumulativeLength);
        prev = c0;

        Point2D c1 = evaluateBezier(p0, p1, p2, p3, t1);
        cumulativeLength += std::hypot(c1.x - prev.x, c1.y - prev.y);
        table.tSamples.push_back(t1);
        table.arcLengths.push_back(cumulativeLength);
        prev = c1;

        Point2D c2 = evaluateBezier(p0, p1, p2, p3, t2);
        cumulativeLength += std::hypot(c2.x - prev.x, c2.y - prev.y);
        table.tSamples.push_back(t2);
        table.arcLengths.push_back(cumulativeLength);
        prev = c2;

        Point2D c3 = evaluateBezier(p0, p1, p2, p3, t3);
        cumulativeLength += std::hypot(c3.x - prev.x, c3.y - prev.y);
        table.tSamples.push_back(t3);
        table.arcLengths.push_back(cumulativeLength);
        prev = c3;
#endif
    }

    // Remainder loop
    for (; i <= count; ++i) {
        float t = static_cast<float>(i) / count;
        Point2D curr = evaluateBezier(p0, p1, p2, p3, t);
        cumulativeLength += std::hypot(curr.x - prev.x, curr.y - prev.y);
        table.tSamples.push_back(t);
        table.arcLengths.push_back(cumulativeLength);
        prev = curr;
    }

    table.totalLength = cumulativeLength;
    return table;
}

std::vector<SplineResult> SplineSolver::calculateBatchSIMD(
    const std::vector<Point2D>& starts,
    const std::vector<Point2D>& ends,
    const SplineConfig& config
) {
    const size_t count = std::min(starts.size(), ends.size());
    std::vector<SplineResult> results;
    results.reserve(count);

    for (size_t i = 0; i < count; ++i) {
        SplineResult res;
        res.p0 = starts[i];
        res.p3 = ends[i];

        const float deltaX = res.p3.x - res.p0.x;
        const float deltaY = res.p3.y - res.p0.y;

        if (deltaX >= 0.0f) {
            const float tangentX = std::max(deltaX * config.tension, config.minTangent);
            res.p1 = Point2D(res.p0.x + tangentX, res.p0.y);
            res.p2 = Point2D(res.p3.x - tangentX, res.p3.y);
        } else {
            const float backwardDistance = std::abs(deltaX);
            const float tangentX = std::max(backwardDistance * config.tension, config.minTangent * 1.5f);
            const float yOffset = (std::abs(deltaY) < 30.0f) ? ((deltaY >= 0.0f) ? config.loopOffset : -config.loopOffset) : 0.0f;
            res.p1 = Point2D(res.p0.x + tangentX, res.p0.y + yOffset * 0.4f);
            res.p2 = Point2D(res.p3.x - tangentX, res.p3.y - yOffset * 0.4f);
        }

        res.svgPath = formatSvgPath(res.p0, res.p1, res.p2, res.p3);
        res.arcLengthTable = buildArcLengthTableSIMD(res.p0, res.p1, res.p2, res.p3, 64);
        res.approximateLength = res.arcLengthTable.totalLength;
        results.push_back(res);
    }

    return results;
}

Point2D SplineSolver::samplePathUniform(
    const std::vector<Point2D>& controlPoints,
    float normalizedDistance
) {
    return getPathPointAndTangent(controlPoints, normalizedDistance).point;
}

SvgPathSampleResult SplineSolver::getPathPointAndTangent(
    const std::vector<Point2D>& controlPoints,
    float normalizedDistance
) {
    SvgPathSampleResult result;
    const size_t segmentCount = controlPoints.size() / 4;
    if (segmentCount == 0) {
        if (!controlPoints.empty()) {
            result.point = controlPoints[0];
        }
        result.tangent = Point2D(1.0f, 0.0f);
        result.normal = Point2D(0.0f, 1.0f);
        return result;
    }

    // Build arc-length tables for each segment
    std::vector<ArcLengthTable> tables;
    tables.reserve(segmentCount);
    std::vector<float> startLengths;
    startLengths.reserve(segmentCount);
    float cumulative = 0.0f;

    for (size_t i = 0; i < segmentCount; ++i) {
        const size_t base = i * 4;
        ArcLengthTable tbl = buildArcLengthTable(
            controlPoints[base],
            controlPoints[base + 1],
            controlPoints[base + 2],
            controlPoints[base + 3],
            32
        );
        startLengths.push_back(cumulative);
        cumulative += tbl.totalLength;
        tables.push_back(tbl);
    }

    if (cumulative <= 1e-6f) {
        result.point = controlPoints[0];
        result.tangent = Point2D(1.0f, 0.0f);
        result.normal = Point2D(0.0f, 1.0f);
        return result;
    }

    const float clampedS = std::max(0.0f, std::min(1.0f, normalizedDistance));
    const float targetDist = clampedS * cumulative;

    // Locate target segment
    size_t chosenIdx = 0;
    for (size_t i = 0; i < segmentCount; ++i) {
        const float startLen = startLengths[i];
        const float endLen = startLen + tables[i].totalLength;
        if (targetDist >= startLen && (targetDist <= endLen || i == segmentCount - 1)) {
            chosenIdx = i;
            break;
        }
    }

    const size_t base = chosenIdx * 4;
    const Point2D& p0 = controlPoints[base];
    const Point2D& cp1 = controlPoints[base + 1];
    const Point2D& cp2 = controlPoints[base + 2];
    const Point2D& p1 = controlPoints[base + 3];

    const float segLen = tables[chosenIdx].totalLength;
    const float localDist = targetDist - startLengths[chosenIdx];
    const float localS = (segLen > 1e-6f) ? std::max(0.0f, std::min(1.0f, localDist / segLen)) : 0.0f;
    const float localT = tables[chosenIdx].getTForNormalizedArcLength(localS);

    result.point = evaluateBezier(p0, cp1, cp2, p1, localT);

    // Compute tangent derivative
    const float u = 1.0f - localT;
    float dx = 3.0f * u * u * (cp1.x - p0.x) + 6.0f * u * localT * (cp2.x - cp1.x) + 3.0f * localT * localT * (p1.x - cp2.x);
    float dy = 3.0f * u * u * (cp1.y - p0.y) + 6.0f * u * localT * (cp2.y - cp1.y) + 3.0f * localT * localT * (p1.y - cp2.y);
    float len = std::sqrt(dx * dx + dy * dy);

    if (len < 1e-6f) {
        dx = p1.x - p0.x;
        dy = p1.y - p0.y;
        len = std::sqrt(dx * dx + dy * dy);
        if (len < 1e-6f) {
            dx = 1.0f;
            dy = 0.0f;
            len = 1.0f;
        }
    }

    result.tangent = Point2D(dx / len, dy / len);
    result.normal = Point2D(-result.tangent.y, result.tangent.x);
    result.angleDeg = std::atan2(result.tangent.y, result.tangent.x) * (180.0f / 3.141592653589793f);
    result.distance = targetDist;
    result.normalizedDistance = clampedS;

    return result;
}

} // namespace WebAppEngine
