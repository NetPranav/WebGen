#pragma once

/**
 * ============================================================================
 * CABLE PHYSICS ENGINE (VERLET INTEGRATION WITH SPRING TENSION & DRAPE)
 * ============================================================================
 * Implements particle-based Verlet integration for visual graph wires.
 * Features:
 * - Distance constraint relaxation with iterative projection.
 * - Tunable wire type profiles: Exec wires (stiffer, low sag) vs
 *   Data wires (organic drape, higher flexibility).
 * - Settling time < 300ms with smooth damping (no oscillation/jitter).
 * - Direct conversion to smooth cubic Bezier / polyline paths.
 * ============================================================================
 */

#include "SplineSolver.hpp"
#include <vector>
#include <string>
#include <cmath>
#include <algorithm>

namespace WebAppEngine {

enum class WireType {
    Exec,       // Stiff, white, low drape, snappy spring
    DataString, // Pink, moderate drape
    DataNumber, // Cyan, moderate drape
    DataBoolean,// Orange, moderate drape
    DataObject, // Amber, moderate drape
    DataArray,  // Yellow, moderate drape
    Default     // Standard data wire
};

struct CableParticle {
    Point2D position;
    Point2D oldPosition;
    Point2D acceleration{0.0f, 0.0f};
    bool isPinned{false};

    CableParticle() = default;
    CableParticle(float x, float y, bool pinned = false)
        : position(x, y), oldPosition(x, y), isPinned(pinned) {}
};

struct CableConfig {
    int particleCount{16};
    float gravity{180.0f};       // Downward gravity in px/s^2
    float damping{0.12f};        // Velocity damping factor [0, 1]
    float stiffness{0.85f};      // Constraint resolution strength [0, 1]
    int constraintIterations{4}; // Relaxation passes per tick
    float restLengthFactor{1.05f};// Slack factor (1.0 = taut, >1.0 = slack)
};

class CablePhysics {
public:
    CablePhysics() = default;
    explicit CablePhysics(WireType type, int particleCount = 16);

    /**
     * Factory function configured with presets for specific wire types.
     */
    static CableConfig getConfigForWireType(WireType type);

    /**
     * Initialize cable particles between start and end pins.
     */
    void initialize(const Point2D& start, const Point2D& end, const CableConfig& config);

    /**
     * Advances simulation by dt seconds using Verlet integration.
     */
    void step(float dt);

    /**
     * Move pinned endpoints (e.g. when dragging a node).
     */
    void setEndpoints(const Point2D& start, const Point2D& end);

    /**
     * Resets or snaps particles along the direct Hermite/Bezier curve.
     */
    void resetAlongCurve(const SplineResult& spline);

    /**
     * Check if cable has settled (maximum particle displacement below threshold).
     */
    bool isSettled(float velocityThreshold = 0.5f) const;

    /**
     * Returns the simulated particle positions.
     */
    const std::vector<CableParticle>& getParticles() const { return m_particles; }

    /**
     * Generates a smooth SVG path through the simulated particles using Catmull-Rom or cubic segments.
     */
    std::string generateSvgPath() const;

    /**
     * Returns total kinetic energy / displacement magnitude across particles.
     */
    float getKineticEnergy() const;

private:
    void applyVerlet(float dt);
    void satisfyConstraints();

    CableConfig m_config;
    std::vector<CableParticle> m_particles;
    float m_segmentLength{10.0f};
    Point2D m_startPin{0.0f, 0.0f};
    Point2D m_endPin{0.0f, 0.0f};
};

} // namespace WebAppEngine
