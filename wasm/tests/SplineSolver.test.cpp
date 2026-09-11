#include "SplineSolver.hpp"
#include <iostream>
#include <cassert>
#include <cmath>

using namespace WebAppEngine;

void testForwardSpline() {
    Point2D start(100.0f, 200.0f);
    Point2D end(400.0f, 250.0f);

    SplineResult result = SplineSolver::calculateWireSpline(start, end);

    // Verify endpoints
    assert(result.p0.x == 100.0f && result.p0.y == 200.0f);
    assert(result.p3.x == 400.0f && result.p3.y == 250.0f);

    // DeltaX = 300.0f, tension = 0.5f => tangentX = 150.0f
    assert(result.p1.x == 250.0f && result.p1.y == 200.0f);
    assert(result.p2.x == 250.0f && result.p2.y == 250.0f);

    // Verify SVG path string starts with "M 100"
    assert(result.svgPath.find("M 100") != std::string::npos);
    assert(result.svgPath.find("C 250") != std::string::npos);

    // Verify approximate length > straight line distance
    const float straightDist = std::sqrt(300.0f * 300.0f + 50.0f * 50.0f);
    assert(result.approximateLength >= straightDist);

    std::cout << "[PASS] testForwardSpline: " << result.svgPath << " (len: " << result.approximateLength << ")\n";
}

void testMinTangentClamping() {
    Point2D start(100.0f, 100.0f);
    Point2D end(120.0f, 100.0f); // Close together: deltaX = 20.0f < minTangent (45.0f)

    SplineResult result = SplineSolver::calculateWireSpline(start, end);

    // minTangent = 45.0f should be used
    assert(result.p1.x == 145.0f);
    assert(result.p2.x == 75.0f);

    std::cout << "[PASS] testMinTangentClamping: clamped to minTangent 45.0f\n";
}

void testBackwardLoopSpline() {
    Point2D start(500.0f, 200.0f);
    Point2D end(200.0f, 210.0f); // Backward connection (deltaX = -300.0f)

    SplineResult result = SplineSolver::calculateWireSpline(start, end);

    // Control point 1 should push outward to the right
    assert(result.p1.x > start.x);
    // Control point 2 should pull inward from the left
    assert(result.p2.x < end.x);

    std::cout << "[PASS] testBackwardLoopSpline: " << result.svgPath << "\n";
}

void testArcLengthParameterization() {
    Point2D start(0.0f, 0.0f);
    Point2D end(400.0f, 300.0f);

    SplineResult result = SplineSolver::calculateWireSpline(start, end);
    const ArcLengthTable& table = result.arcLengthTable;

    // Table should have 65 entries (64 intervals + 1)
    assert(table.tSamples.size() == 65);
    assert(table.arcLengths.size() == 65);

    // Initial length is 0, total length is positive and > straight distance (500)
    assert(table.arcLengths.front() == 0.0f);
    assert(table.totalLength > 500.0f);

    // Monotonically increasing lengths
    for (size_t i = 1; i < table.arcLengths.size(); ++i) {
        assert(table.arcLengths[i] > table.arcLengths[i - 1]);
    }

    // Inversion tests: s=0.0 -> t=0.0, s=1.0 -> t=1.0
    const float t0 = table.getTForNormalizedArcLength(0.0f);
    const float t1 = table.getTForNormalizedArcLength(1.0f);
    assert(std::abs(t0 - 0.0f) < 0.001f);
    assert(std::abs(t1 - 1.0f) < 0.001f);

    // Monotonic parameter inversion
    float prevT = 0.0f;
    for (int i = 1; i <= 10; ++i) {
        float s = static_cast<float>(i) / 10.0f;
        float t = table.getTForNormalizedArcLength(s);
        assert(t >= prevT);
        prevT = t;
    }

    // Uniform evaluation at s=0.0 matches start, s=1.0 matches end
    Point2D pt0 = SplineSolver::evaluateUniformAt(result.p0, result.p1, result.p2, result.p3, table, 0.0f);
    Point2D pt1 = SplineSolver::evaluateUniformAt(result.p0, result.p1, result.p2, result.p3, table, 1.0f);
    assert(std::abs(pt0.x - start.x) < 0.01f && std::abs(pt0.y - start.y) < 0.01f);
    assert(std::abs(pt1.x - end.x) < 0.01f && std::abs(pt1.y - end.y) < 0.01f);

    std::cout << "[PASS] testArcLengthParameterization: table size " << table.tSamples.size()
              << ", totalLength: " << table.totalLength << "\n";
}

void testUniformPointSampling() {
    Point2D start(50.0f, 50.0f);
    Point2D end(500.0f, 150.0f);

    SplineResult result = SplineSolver::calculateWireSpline(start, end);
    const int sampleCount = 11; // 10 segments

    std::vector<Point2D> points = SplineSolver::sampleUniformPoints(
        result.p0, result.p1, result.p2, result.p3, sampleCount, result.arcLengthTable
    );

    assert(points.size() == static_cast<size_t>(sampleCount));
    assert(std::abs(points.front().x - start.x) < 0.01f && std::abs(points.front().y - start.y) < 0.01f);
    assert(std::abs(points.back().x - end.x) < 0.01f && std::abs(points.back().y - end.y) < 0.01f);

    // Verify chord segment lengths are approximately equal (uniform spacing within reasonable tolerance)
    const float expectedSegment = result.approximateLength / static_cast<float>(sampleCount - 1);
    for (size_t i = 1; i < points.size(); ++i) {
        float dx = points[i].x - points[i - 1].x;
        float dy = points[i].y - points[i - 1].y;
        float chord = std::sqrt(dx * dx + dy * dy);
        // Chord should be within reasonable bounds of expected arc length segment
        assert(chord > expectedSegment * 0.85f && chord <= expectedSegment * 1.05f);
    }

    std::cout << "[PASS] testUniformPointSampling: sampled " << points.size()
              << " equidistant points, segment approx " << expectedSegment << "px\n";
}

int main() {
    std::cout << "Running SplineSolver C++ Unit Tests (Sub-Phase 4.1)...\n";
    testForwardSpline();
    testMinTangentClamping();
    testBackwardLoopSpline();
    testArcLengthParameterization();
    testUniformPointSampling();
    std::cout << "All SplineSolver C++ Sub-Phase 4.1 tests passed successfully!\n";
    return 0;
}
