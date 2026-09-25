#include "SplineSolver.hpp"
#include "CablePhysics.hpp"
#include "SpatialIndex.hpp"

#ifdef __EMSCRIPTEN__
#include <emscripten/bind.h>
#include <emscripten/val.h>

using namespace emscripten;
using namespace WebAppEngine;

namespace {

val hitTestTopmostBinding(SpatialIndex& self, double x, double y) {
    SpatialItem item;
    if (!self.hitTestTopmost(static_cast<float>(x), static_cast<float>(y), item)) {
        return val::null();
    }
    val obj = val::object();
    obj.set("id", item.id);
    obj.set("type", static_cast<int>(item.type));

    val boundsObj = val::object();
    boundsObj.set("minX", item.bounds.minX);
    boundsObj.set("minY", item.bounds.minY);
    boundsObj.set("maxX", item.bounds.maxX);
    boundsObj.set("maxY", item.bounds.maxY);
    obj.set("bounds", boundsObj);

    obj.set("zIndex", item.zIndex);
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

    register_vector<float>("VectorFloat");

    value_object<ArcLengthTable>("ArcLengthTable")
        .field("tSamples", &ArcLengthTable::tSamples)
        .field("arcLengths", &ArcLengthTable::arcLengths)
        .field("totalLength", &ArcLengthTable::totalLength);

    value_object<SplineResult>("SplineResult")
        .field("p0", &SplineResult::p0)
        .field("p1", &SplineResult::p1)
        .field("p2", &SplineResult::p2)
        .field("p3", &SplineResult::p3)
        .field("svgPath", &SplineResult::svgPath)
        .field("approximateLength", &SplineResult::approximateLength)
        .field("arcLengthTable", &SplineResult::arcLengthTable);

    value_object<CableParticle>("CableParticle")
        .field("position", &CableParticle::position)
        .field("oldPosition", &CableParticle::oldPosition)
        .field("acceleration", &CableParticle::acceleration)
        .field("isPinned", &CableParticle::isPinned);

    value_object<CableConfig>("CableConfig")
        .field("particleCount", &CableConfig::particleCount)
        .field("gravity", &CableConfig::gravity)
        .field("damping", &CableConfig::damping)
        .field("stiffness", &CableConfig::stiffness)
        .field("constraintIterations", &CableConfig::constraintIterations)
        .field("restLengthFactor", &CableConfig::restLengthFactor);

    value_object<SpatialItem>("SpatialItem")
        .field("id", &SpatialItem::id)
        .field("type", &SpatialItem::type)
        .field("bounds", &SpatialItem::bounds)
        .field("zIndex", &SpatialItem::zIndex);

    // Enums
    enum_<WireType>("WireType")
        .value("Exec", WireType::Exec)
        .value("DataString", WireType::DataString)
        .value("DataNumber", WireType::DataNumber)
        .value("DataBoolean", WireType::DataBoolean)
        .value("DataObject", WireType::DataObject)
        .value("DataArray", WireType::DataArray)
        .value("Default", WireType::Default);

    enum_<SpatialItemType>("SpatialItemType")
        .value("NodeCard", SpatialItemType::NodeCard)
        .value("Pin", SpatialItemType::Pin)
        .value("WireSegment", SpatialItemType::WireSegment)
        .value("CommentBox", SpatialItemType::CommentBox);

    // Vectors
    register_vector<double>("VectorDouble");
    register_vector<Point2D>("VectorPoint2D");
    register_vector<CableParticle>("VectorCableParticle");
    register_vector<SpatialItem>("VectorSpatialItem");
    register_vector<SplineResult>("VectorSplineResult");

    // SplineSolver — static/class functions only (matches SplineSolver.hpp exactly;
    // the previous bindings here referenced methods that don't exist on this class,
    // e.g. getTForNormalizedArcLength (it's on ArcLengthTable) and
    // sampleEquidistantPoints (it's sampleUniformPoints) — this never compiled
    // before (ROADMAP Sub-Phase 5.3, AUD-12).
    class_<SplineSolver>("SplineSolver")
        .class_function("calculateWireSpline", &SplineSolver::calculateWireSpline)
        .class_function("evaluateBezier", &SplineSolver::evaluateBezier)
        .class_function("buildArcLengthTable", &SplineSolver::buildArcLengthTable)
        .class_function("evaluateUniformAt", &SplineSolver::evaluateUniformAt)
        .class_function("sampleUniformPoints", &SplineSolver::sampleUniformPoints)
        .class_function("formatSvgPath", &SplineSolver::formatSvgPath)
        .class_function("calculateBatchSIMD", &SplineSolver::calculateBatchSIMD)
        .class_function("buildArcLengthTableSIMD", &SplineSolver::buildArcLengthTableSIMD);

    // Note: ArcLengthTable is bound above as a value_object (it's returned
    // and passed by value everywhere in this API), so its instance methods
    // (getTForNormalizedArcLength, getTForDistance) aren't separately bound
    // as a class_ — embind rejects registering the same C++ type twice.
    // Nothing in this API needs to call them from JS directly; callers get
    // an already-computed table from buildArcLengthTable/buildArcLengthTableSIMD.

    // CablePhysics
    class_<CablePhysics>("CablePhysics")
        .constructor<WireType, int>()
        .function("initialize", &CablePhysics::initialize)
        .function("setEndpoints", &CablePhysics::setEndpoints)
        .function("resetAlongCurve", &CablePhysics::resetAlongCurve)
        .function("step", &CablePhysics::step)
        .function("getParticles", &CablePhysics::getParticles)
        .function("generateSvgPath", &CablePhysics::generateSvgPath)
        .function("isSettled", &CablePhysics::isSettled)
        .class_function("getConfigForWireType", &CablePhysics::getConfigForWireType);

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
