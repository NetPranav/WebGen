#include "CablePhysics.hpp"
#include <sstream>
#include <iomanip>

namespace WebAppEngine {

CablePhysics::CablePhysics(WireType type, int particleCount) {
    CableConfig config = getConfigForWireType(type);
    if (particleCount > 2) {
        config.particleCount = particleCount;
    }
    m_config = config;
}

CableConfig CablePhysics::getConfigForWireType(WireType type) {
    CableConfig config;
    switch (type) {
        case WireType::Exec:
            // Stiffer, fast recovery, reduced sag
            config.gravity = 90.0f;
            config.damping = 0.22f;
            config.stiffness = 0.95f;
            config.constraintIterations = 5;
            config.restLengthFactor = 1.01f;
            break;

        case WireType::DataBoolean:
            config.gravity = 160.0f;
            config.damping = 0.14f;
            config.stiffness = 0.88f;
            config.constraintIterations = 4;
            config.restLengthFactor = 1.04f;
            break;

        case WireType::DataNumber:
        case WireType::DataString:
        case WireType::DataObject:
        case WireType::DataArray:
        case WireType::Default:
        default:
            // Organic smooth cable drape
            config.gravity = 200.0f;
            config.damping = 0.12f;
            config.stiffness = 0.82f;
            config.constraintIterations = 4;
            config.restLengthFactor = 1.06f;
            break;
    }
    return config;
}

void CablePhysics::initialize(const Point2D& start, const Point2D& end, const CableConfig& config) {
    m_config = config;
    m_startPin = start;
    m_endPin = end;

    const int count = std::max(2, m_config.particleCount);
    m_particles.clear();
    m_particles.reserve(count);

    float dx = end.x - start.x;
    float dy = end.y - start.y;
    float chord = std::sqrt(dx * dx + dy * dy);
    float totalLength = std::max(chord, chord * m_config.restLengthFactor);
    m_segmentLength = totalLength / static_cast<float>(count - 1);

    for (int i = 0; i < count; ++i) {
        float t = static_cast<float>(i) / static_cast<float>(count - 1);
        // Initial catenary / parabola sagging offset
        float sag = 4.0f * t * (1.0f - t) * (m_config.gravity * 0.05f);
        float px = start.x + dx * t;
        float py = start.y + dy * t + sag;

        bool pinned = (i == 0 || i == count - 1);
        m_particles.emplace_back(px, py, pinned);
    }
}

void CablePhysics::setEndpoints(const Point2D& start, const Point2D& end) {
    const size_t count = m_particles.size();
    if (count >= 2) {
        float dStartX = start.x - m_startPin.x;
        float dStartY = start.y - m_startPin.y;
        float dEndX = end.x - m_endPin.x;
        float dEndY = end.y - m_endPin.y;

        float dx = end.x - start.x;
        float dy = end.y - start.y;
        float chord = std::sqrt(dx * dx + dy * dy);
        float totalLength = std::max(chord, chord * m_config.restLengthFactor);
        m_segmentLength = totalLength / static_cast<float>(count - 1);

        for (size_t i = 1; i < count - 1; ++i) {
            float t = static_cast<float>(i) / static_cast<float>(count - 1);
            float shiftX = (1.0f - t) * dStartX + t * dEndX;
            float shiftY = (1.0f - t) * dStartY + t * dEndY;
            m_particles[i].position.x += shiftX;
            m_particles[i].position.y += shiftY;
            m_particles[i].oldPosition.x += shiftX;
            m_particles[i].oldPosition.y += shiftY;
        }

        m_particles.front().position = start;
        m_particles.front().oldPosition = start;
        m_particles.front().isPinned = true;

        m_particles.back().position = end;
        m_particles.back().oldPosition = end;
        m_particles.back().isPinned = true;
    }
    m_startPin = start;
    m_endPin = end;
}

void CablePhysics::resetAlongCurve(const SplineResult& spline) {
    const size_t count = m_particles.size();
    if (count < 2) return;

    for (size_t i = 0; i < count; ++i) {
        float normDist = static_cast<float>(i) / static_cast<float>(count - 1);
        float t = spline.arcLengthTable.getTForNormalizedArcLength(normDist);
        Point2D pt = SplineSolver::evaluateBezier(spline.p0, spline.p1, spline.p2, spline.p3, t);

        m_particles[i].position = pt;
        m_particles[i].oldPosition = pt;
        m_particles[i].acceleration = Point2D(0.0f, 0.0f);
        m_particles[i].isPinned = (i == 0 || i == count - 1);
    }
}

void CablePhysics::step(float dt) {
    if (m_particles.empty() || dt <= 0.0f) return;

    // Clamp dt to avoid explosion on background tab freeze
    float clampedDt = std::min(dt, 0.033f);

    applyVerlet(clampedDt);

    for (int iter = 0; iter < m_config.constraintIterations; ++iter) {
        satisfyConstraints();
    }
}

void CablePhysics::applyVerlet(float dt) {
    const float dtSq = dt * dt;
    const float dampFactor = std::max(0.0f, 1.0f - m_config.damping);

    for (auto& p : m_particles) {
        if (p.isPinned) continue;

        // Velocity = position - oldPosition
        float vx = (p.position.x - p.oldPosition.x) * dampFactor;
        float vy = (p.position.y - p.oldPosition.y) * dampFactor;

        p.oldPosition = p.position;

        // Verlet integration: x_new = x + v + a * dt^2
        p.position.x += vx + p.acceleration.x * dtSq;
        p.position.y += vy + (p.acceleration.y + m_config.gravity) * dtSq;

        // Reset per-step acceleration
        p.acceleration = Point2D(0.0f, 0.0f);
    }
}

void CablePhysics::satisfyConstraints() {
    const size_t count = m_particles.size();
    if (count < 2) return;

    // Pin endpoints first
    m_particles.front().position = m_startPin;
    m_particles.back().position = m_endPin;

    // Distance constraints
    for (size_t i = 0; i < count - 1; ++i) {
        auto& p1 = m_particles[i];
        auto& p2 = m_particles[i + 1];

        float dx = p2.position.x - p1.position.x;
        float dy = p2.position.y - p1.position.y;
        float currentDist = std::sqrt(dx * dx + dy * dy);

        if (currentDist < 0.0001f) continue;

        float diff = (currentDist - m_segmentLength) / currentDist;
        float scalar = 0.5f * diff * m_config.stiffness;

        float offsetX = dx * scalar;
        float offsetY = dy * scalar;

        if (!p1.isPinned && !p2.isPinned) {
            p1.position.x += offsetX;
            p1.position.y += offsetY;
            p2.position.x -= offsetX;
            p2.position.y -= offsetY;
        } else if (p1.isPinned && !p2.isPinned) {
            p2.position.x -= offsetX * 2.0f;
            p2.position.y -= offsetY * 2.0f;
        } else if (!p1.isPinned && p2.isPinned) {
            p1.position.x += offsetX * 2.0f;
            p1.position.y += offsetY * 2.0f;
        }
    }
}

bool CablePhysics::isSettled(float velocityThreshold) const {
    for (const auto& p : m_particles) {
        if (p.isPinned) continue;
        float vx = p.position.x - p.oldPosition.x;
        float vy = p.position.y - p.oldPosition.y;
        if (std::sqrt(vx * vx + vy * vy) > velocityThreshold) {
            return false;
        }
    }
    return true;
}

float CablePhysics::getKineticEnergy() const {
    float total = 0.0f;
    for (const auto& p : m_particles) {
        float vx = p.position.x - p.oldPosition.x;
        float vy = p.position.y - p.oldPosition.y;
        total += (vx * vx + vy * vy);
    }
    return total;
}

std::string CablePhysics::generateSvgPath() const {
    const size_t count = m_particles.size();
    if (count < 2) return "";

    std::ostringstream ss;
    ss << std::fixed << std::setprecision(1);

    ss << "M " << m_particles[0].position.x << " " << m_particles[0].position.y;

    if (count == 2) {
        ss << " L " << m_particles[1].position.x << " " << m_particles[1].position.y;
        return ss.str();
    }

    // Catmull-Rom to Cubic Bezier conversion for continuous smooth visual cable
    for (size_t i = 0; i < count - 1; ++i) {
        Point2D p0 = (i == 0) ? m_particles[i].position : m_particles[i - 1].position;
        Point2D p1 = m_particles[i].position;
        Point2D p2 = m_particles[i + 1].position;
        Point2D p3 = (i + 2 < count) ? m_particles[i + 2].position : p2;

        Point2D cp1(
            p1.x + (p2.x - p0.x) / 6.0f,
            p1.y + (p2.y - p0.y) / 6.0f
        );
        Point2D cp2(
            p2.x - (p3.x - p1.x) / 6.0f,
            p2.y - (p3.y - p1.y) / 6.0f
        );

        ss << " C " << cp1.x << " " << cp1.y << ", "
           << cp2.x << " " << cp2.y << ", "
           << p2.x << " " << p2.y;
    }

    return ss.str();
}

} // namespace WebAppEngine
