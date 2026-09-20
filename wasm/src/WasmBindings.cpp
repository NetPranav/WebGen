#include "SplineSolver.hpp"
#include "CablePhysics.hpp"
#include "SpatialIndex.hpp"

#ifdef __EMSCRIPTEN__
#include <emscripten/bind.h>
#include <emscripten/val.h>

using namespace emscripten;

namespace {

val hitTestTopmostBinding(SpatialIndex& self, double x, double y) {
    SpatialItem* item = self.hitTestTopmost(x, y);
    if (!item) {
        return val::null();
    }
    val obj = val::object();
    obj.set("id", item->id);
    obj.set("type", item->type);
    
    val boundsObj = val::object();
    boundsObj.set("minX", item->bounds.minX);
    boundsObj.set("minY", item->bounds.minY);
    boundsObj.set("maxX", item->bounds.maxX);
    boundsObj.set("maxY", item->bounds.maxY);
    obj.set("bounds", boundsObj);

    obj.set("zIndex", item->zIndex);
    return obj;
}

} // anonymous namespace

EMSCRIPTEN_BINDINGS(engine_wasm) {
    // Value objects
    value_object<Point2D>("Point2D")
        .field("x", &Point2D::x)
        .field("y", &Point2D::y);

    value_object<AABB>("AABB")
        .field("minX", &AABB::minX)
        .field("minY", &AABB::minY)
        .field("maxX", &AABB::maxX)
        .field("maxY", &AABB::maxY);

    value_object<SplineConfig>("SplineConfig")
        .field("tension", &SplineConfig::tension)
        .field("minTangent", &SplineConfig::minTangent)
        .field("loopOffset", &SplineConfig::loopOffset);

    value_object<SplineResult>("SplineResult")
        .field("p0", &SplineResult::p0)
        .field("p1", &SplineResult::p1)
        .field("p2", &SplineResult::p2)
        .field("p3", &SplineResult::p3)
        .field("totalArcLength", &SplineResult::totalArcLength)
        .field("arcLengthTable", &SplineResult::arcLengthTable);

    value_object<CableParticle>("CableParticle")
        .field("position", &CableParticle::position)
        .field("oldPosition", &CableParticle::oldPosition)
        .field("acceleration", &CableParticle::acceleration)
        .field("isPinned", &CableParticle::isPinned);

    value_object<SpatialItem>("SpatialItem")
        .field("id", &SpatialItem::id)
        .field("type", &SpatialItem::type)
        .field("bounds", &SpatialItem::bounds)
        .field("zIndex", &SpatialItem::zIndex);

    // Enums
    enum_<WireType>("WireType")
        .value("EXEC", WireType::EXEC)
        .value("DATA_BOOL", WireType::DATA_BOOL)
        .value("DATA_NUMERIC", WireType::DATA_NUMERIC)
        .value("DATA_STRING", WireType::DATA_STRING)
        .value("DATA_OBJECT", WireType::DATA_OBJECT)
        .value("DEFAULT", WireType::DEFAULT);

    // Vectors
    register_vector<double>("VectorDouble");
    register_vector<Point2D>("VectorPoint2D");
    register_vector<CableParticle>("VectorCableParticle");
    register_vector<SpatialItem>("VectorSpatialItem");
    register_vector<SplineResult>("VectorSplineResult");

    // SplineSolver
    class_<SplineSolver>("SplineSolver")
        .class_function("calculateWireSpline", &SplineSolver::calculateWireSpline)
        .class_function("calculateBatchSIMD", &SplineSolver::calculateBatchSIMD)
        .class_function("evaluateBezier", &SplineSolver::evaluateBezier)
        .class_function("getTForNormalizedArcLength", &SplineSolver::getTForNormalizedArcLength)
        .class_function("sampleEquidistantPoints", &SplineSolver::sampleEquidistantPoints);

    // CablePhysics
    class_<CablePhysics>("CablePhysics")
        .constructor<WireType, int>()
        .function("initialize", &CablePhysics::initialize)
        .function("setEndpoints", &CablePhysics::setEndpoints)
        .function("resetAlongCurve", &CablePhysics::resetAlongCurve)
        .function("step", &CablePhysics::step)
        .function("getParticles", &CablePhysics::getParticles)
        .function("generateSvgPath", &CablePhysics::generateSvgPath)
        .function("isSettled", &CablePhysics::isSettled);

    // SpatialIndex
    class_<SpatialIndex>("SpatialIndex")
        .constructor<AABB>()
        .function("insert", &SpatialIndex::insert)
        .function("update", &SpatialIndex::update)
        .function("remove", &SpatialIndex::remove)
        .function("queryPoint", &SpatialIndex::queryPoint)
        .function("queryRange", &SpatialIndex::queryRange)
        .function("hitTestTopmost", &hitTestTopmostBinding)
        .function("size", &SpatialIndex::size)
        .function("clear", &SpatialIndex::clear);
}

#endif // __EMSCRIPTEN__
