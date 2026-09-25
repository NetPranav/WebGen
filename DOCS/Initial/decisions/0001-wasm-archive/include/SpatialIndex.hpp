#pragma once

/**
 * ============================================================================
 * SPATIAL INDEX (2D DYNAMIC QUADTREE FOR NODE & WIRE HIT-TESTING)
 * ============================================================================
 * Implements high-performance spatial indexing for 1,000+ node graphs.
 * Features:
 * - O(log N) hit-testing for pointer clicks, hover states, and drag bounds.
 * - Incremental updates: update(id, aabb) avoids rebuilding the full tree per frame.
 * - Point queries, Box/AABB range queries, and nearest-neighbor ray/segment queries.
 * - Depth-bounded sub-node splitting (MaxDepth = 8, MaxItemsPerNode = 8).
 * ============================================================================
 */

#include "SplineSolver.hpp"
#include <string>
#include <vector>
#include <memory>
#include <unordered_map>
#include <algorithm>

namespace WebAppEngine {

struct AABB {
    float minX{0.0f};
    float minY{0.0f};
    float maxX{0.0f};
    float maxY{0.0f};

    AABB() = default;
    AABB(float inMinX, float inMinY, float inMaxX, float inMaxY)
        : minX(inMinX), minY(inMinY), maxX(inMaxX), maxY(inMaxY) {}

    bool contains(float x, float y) const {
        return x >= minX && x <= maxX && y >= minY && y <= maxY;
    }

    bool intersects(const AABB& other) const {
        return !(minX > other.maxX || maxX < other.minX ||
                 minY > other.maxY || maxY < other.minY);
    }

    float width() const { return maxX - minX; }
    float height() const { return maxY - minY; }
    Point2D center() const { return Point2D((minX + maxX) * 0.5f, (minY + maxY) * 0.5f); }
};

enum class SpatialItemType {
    NodeCard,
    Pin,
    WireSegment,
    CommentBox
};

struct SpatialItem {
    std::string id;
    SpatialItemType type{SpatialItemType::NodeCard};
    AABB bounds;
    int zIndex{0};
};

class QuadtreeNode {
public:
    static constexpr int MAX_ITEMS = 8;
    static constexpr int MAX_DEPTH = 8;

    QuadtreeNode(const AABB& bounds, int depth = 0);

    bool insert(const SpatialItem& item);
    bool remove(const std::string& id);
    void queryRange(const AABB& range, std::vector<SpatialItem>& results) const;
    void queryPoint(float x, float y, std::vector<SpatialItem>& results) const;
    void clear();

    const AABB& getBounds() const { return m_bounds; }
    bool isSubdivided() const { return m_isSubdivided; }
    size_t totalItemCount() const;

private:
    void subdivide();

    AABB m_bounds;
    int m_depth{0};
    bool m_isSubdivided{false};
    std::vector<SpatialItem> m_items;
    std::unique_ptr<QuadtreeNode> m_children[4]; // NW, NE, SW, SE
};

class SpatialIndex {
public:
    explicit SpatialIndex(const AABB& worldBounds);

    /**
     * Insert or index a spatial item.
     */
    void insert(const std::string& id, SpatialItemType type, const AABB& bounds, int zIndex = 0);

    /**
     * Incrementally update an existing item's bounding box without full tree rebuild.
     */
    void update(const std::string& id, const AABB& newBounds);

    /**
     * Remove an item from the index.
     */
    bool remove(const std::string& id);

    /**
     * Query all items overlapping the given rectangular area.
     */
    std::vector<SpatialItem> queryRange(const AABB& range) const;

    /**
     * Query all items covering a specific canvas point (x, y), sorted top-to-bottom by z-index.
     */
    std::vector<SpatialItem> queryPoint(float x, float y) const;

    /**
     * Hit-test single topmost item at point (x, y).
     */
    bool hitTestTopmost(float x, float y, SpatialItem& outItem) const;

    /**
     * Clears all indexed items.
     */
    void clear();

    /**
     * Total number of indexed items.
     */
    size_t size() const { return m_itemRegistry.size(); }

private:
    AABB m_worldBounds;
    std::unique_ptr<QuadtreeNode> m_root;
    std::unordered_map<std::string, SpatialItem> m_itemRegistry;
};

} // namespace WebAppEngine
