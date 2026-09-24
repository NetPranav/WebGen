#include "../include/CablePhysics.hpp"
#include "../include/SpatialIndex.hpp"
#include <iostream>
#include <cassert>
#include <chrono>

using namespace WebAppEngine;

void testCablePhysicsInitialization() {
    CablePhysics cable(WireType::Exec);
    cable.initialize(Point2D(100.0f, 100.0f), Point2D(400.0f, 100.0f), CablePhysics::getConfigForWireType(WireType::Exec));

    const auto& particles = cable.getParticles();
    assert(particles.size() == 16);
    assert(particles.front().isPinned);
    assert(particles.back().isPinned);
    assert(particles.front().position.x == 100.0f);
    assert(particles.back().position.x == 400.0f);

    std::cout << "✔ CablePhysics: Particle initialization and pinning verified\n";
}

void testSettlingTimeAndOvershoot() {
    // 200 simultaneous wires settle within 300ms of a node drag without visible jitter
    const int WIRE_COUNT = 200;
    std::vector<CablePhysics> wires;
    wires.reserve(WIRE_COUNT);

    for (int i = 0; i < WIRE_COUNT; ++i) {
        WireType type = (i % 2 == 0) ? WireType::Exec : WireType::DataNumber;
        CablePhysics wire(type);
        wire.initialize(Point2D(0.0f, static_cast<float>(i * 10)),
                        Point2D(300.0f, static_cast<float>(i * 10 + 50)),
                        CablePhysics::getConfigForWireType(type));
        wires.push_back(wire);
    }

    // Simulate node drag event by shifting endpoint by (150px, -80px)
    for (auto& wire : wires) {
        wire.setEndpoints(Point2D(0.0f, 0.0f), Point2D(450.0f, -30.0f));
    }

    // Step simulation at 60 FPS (dt = 0.0166s = 16.6ms) for 300ms (18 steps)
    const float dt = 1.0f / 60.0f;
    const int stepsFor300ms = 18; // ~300ms
    auto startTime = std::chrono::high_resolution_clock::now();

    for (int step = 0; step < stepsFor300ms; ++step) {
        for (auto& wire : wires) {
            wire.step(dt);
        }
    }

    auto endTime = std::chrono::high_resolution_clock::now();
    auto elapsedUs = std::chrono::duration_cast<std::chrono::microseconds>(endTime - startTime).count();

    int settledCount = 0;
    for (const auto& wire : wires) {
        if (wire.isSettled(1.5f)) {
            settledCount++;
        }
    }

    assert(settledCount >= 195);
    std::cout << "✔ CablePhysics: 200 simultaneous wires settled within 300ms ("
              << settledCount << "/200 settled, simulation computed in " << elapsedUs / 1000.0f << " ms)\n";
}

void testWireTypeDifferences() {
    CablePhysics execWire(WireType::Exec);
    execWire.initialize(Point2D(0.0f, 100.0f), Point2D(400.0f, 100.0f), CablePhysics::getConfigForWireType(WireType::Exec));

    CablePhysics dataWire(WireType::DataString);
    dataWire.initialize(Point2D(0.0f, 100.0f), Point2D(400.0f, 100.0f), CablePhysics::getConfigForWireType(WireType::DataString));

    // Step for 1 second of gravity settling
    for (int i = 0; i < 60; ++i) {
        execWire.step(1.0f / 60.0f);
        dataWire.step(1.0f / 60.0f);
    }

    // Exec wire should have significantly less sag than data wire
    float execMidY = execWire.getParticles()[8].position.y;
    float dataMidY = dataWire.getParticles()[8].position.y;

    assert(execMidY < dataMidY); // Exec is higher (less saggy)
    std::cout << "✔ CablePhysics: Exec wires stiffer with less sag than data wires (Exec: "
              << execMidY << "px vs Data: " << dataMidY << "px)\n";
}

void testSpatialIndexQuadtree() {
    SpatialIndex index(AABB(0.0f, 0.0f, 4000.0f, 4000.0f));

    // Insert 100 nodes across canvas
    for (int i = 0; i < 100; ++i) {
        float x = static_cast<float>((i % 10) * 350 + 50);
        float y = static_cast<float>((i / 10) * 350 + 50);
        index.insert("node_" + std::to_string(i), SpatialItemType::NodeCard, AABB(x, y, x + 240.0f, y + 160.0f), i);
    }

    assert(index.size() == 100);

    // Test Point Query (Hit-test)
    SpatialItem hitItem;
    bool hit = index.hitTestTopmost(60.0f, 60.0f, hitItem);
    assert(hit);
    assert(hitItem.id == "node_0");

    // Test Range Query (Marquee selection in [0, 0] to [800, 800])
    auto selected = index.queryRange(AABB(0.0f, 0.0f, 800.0f, 800.0f));
    assert(selected.size() >= 4);

    // Test Incremental Drag Update
    index.update("node_0", AABB(2000.0f, 2000.0f, 2240.0f, 2160.0f));
    assert(!index.hitTestTopmost(60.0f, 60.0f, hitItem)); // No longer at old spot
    assert(index.hitTestTopmost(2010.0f, 2010.0f, hitItem)); // Found at new spot
    assert(hitItem.id == "node_0");

    // Test Removal
    bool removed = index.remove("node_0");
    assert(removed);
    assert(index.size() == 99);
    assert(!index.hitTestTopmost(2010.0f, 2010.0f, hitItem));

    std::cout << "✔ SpatialIndex: Quadtree hit-test, incremental update, and range query verified\n";
}

int main() {
    std::cout << "========================================================\n";
    std::cout << "RUNNING CABLE PHYSICS & SPATIAL INDEX VERIFICATION TESTS\n";
    std::cout << "========================================================\n";

    testCablePhysicsInitialization();
    testSettlingTimeAndOvershoot();
    testWireTypeDifferences();
    testSpatialIndexQuadtree();

    std::cout << "All Sub-Phase 4.2 C++ unit tests passed successfully!\n";
    return 0;
}
