#include "SpatialIndex.hpp"

namespace WebAppEngine {

// ============================================================================
// QuadtreeNode Implementation
// ============================================================================

QuadtreeNode::QuadtreeNode(const AABB& bounds, int depth)
    : m_bounds(bounds), m_depth(depth) {}

void QuadtreeNode::subdivide() {
    float xMid = (m_bounds.minX + m_bounds.maxX) * 0.5f;
    float yMid = (m_bounds.minY + m_bounds.maxY) * 0.5f;

    // NW: [minX, minY] -> [xMid, yMid]
    m_children[0] = std::make_unique<QuadtreeNode>(AABB(m_bounds.minX, m_bounds.minY, xMid, yMid), m_depth + 1);
    // NE: [xMid, minY] -> [maxX, yMid]
    m_children[1] = std::make_unique<QuadtreeNode>(AABB(xMid, m_bounds.minY, m_bounds.maxX, yMid), m_depth + 1);
    // SW: [minX, yMid] -> [xMid, maxY]
    m_children[2] = std::make_unique<QuadtreeNode>(AABB(m_bounds.minX, yMid, xMid, m_bounds.maxY), m_depth + 1);
    // SE: [xMid, yMid] -> [maxX, maxY]
    m_children[3] = std::make_unique<QuadtreeNode>(AABB(xMid, yMid, m_bounds.maxX, m_bounds.maxY), m_depth + 1);

    m_isSubdivided = true;

    // Re-distribute existing items into children if they fit completely
    std::vector<SpatialItem> remainingItems;
    for (const auto& item : m_items) {
        bool placed = false;
        for (int i = 0; i < 4; ++i) {
            if (m_children[i]->m_bounds.intersects(item.bounds)) {
                // If it fits within a single child, insert it there
                if (m_children[i]->m_bounds.contains(item.bounds.minX, item.bounds.minY) &&
                    m_children[i]->m_bounds.contains(item.bounds.maxX, item.bounds.maxY)) {
                    m_children[i]->insert(item);
                    placed = true;
                    break;
                }
            }
        }
        if (!placed) {
            remainingItems.push_back(item);
        }
    }
    m_items = std::move(remainingItems);
}

bool QuadtreeNode::insert(const SpatialItem& item) {
    if (!m_bounds.intersects(item.bounds)) {
        return false;
    }

    if (m_isSubdivided) {
        for (int i = 0; i < 4; ++i) {
            if (m_children[i]->m_bounds.contains(item.bounds.minX, item.bounds.minY) &&
                m_children[i]->m_bounds.contains(item.bounds.maxX, item.bounds.maxY)) {
                return m_children[i]->insert(item);
            }
        }
        // Item straddles boundaries, store in this parent node
        m_items.push_back(item);
        return true;
    }

    m_items.push_back(item);

    if (static_cast<int>(m_items.size()) > MAX_ITEMS && m_depth < MAX_DEPTH) {
        subdivide();
    }

    return true;
}

bool QuadtreeNode::remove(const std::string& id) {
    auto it = std::remove_if(m_items.begin(), m_items.end(),
        [&id](const SpatialItem& item) { return item.id == id; });

    bool found = (it != m_items.end());
    if (found) {
        m_items.erase(it, m_items.end());
    }

    if (m_isSubdivided) {
        for (int i = 0; i < 4; ++i) {
            if (m_children[i]->remove(id)) {
                found = true;
            }
        }
    }

    return found;
}

void QuadtreeNode::queryRange(const AABB& range, std::vector<SpatialItem>& results) const {
    if (!m_bounds.intersects(range)) {
        return;
    }

    for (const auto& item : m_items) {
        if (item.bounds.intersects(range)) {
            results.push_back(item);
        }
    }

    if (m_isSubdivided) {
        for (int i = 0; i < 4; ++i) {
            m_children[i]->queryRange(range, results);
        }
    }
}

void QuadtreeNode::queryPoint(float x, float y, std::vector<SpatialItem>& results) const {
    if (!m_bounds.contains(x, y)) {
        return;
    }

    for (const auto& item : m_items) {
        if (item.bounds.contains(x, y)) {
            results.push_back(item);
        }
    }

    if (m_isSubdivided) {
        for (int i = 0; i < 4; ++i) {
            if (m_children[i]->m_bounds.contains(x, y)) {
                m_children[i]->queryPoint(x, y, results);
            }
        }
    }
}

void QuadtreeNode::clear() {
    m_items.clear();
    m_isSubdivided = false;
    for (int i = 0; i < 4; ++i) {
        m_children[i].reset();
    }
}

size_t QuadtreeNode::totalItemCount() const {
    size_t count = m_items.size();
    if (m_isSubdivided) {
        for (int i = 0; i < 4; ++i) {
            count += m_children[i]->totalItemCount();
        }
    }
    return count;
}

// ============================================================================
// SpatialIndex Implementation
// ============================================================================

SpatialIndex::SpatialIndex(const AABB& worldBounds)
    : m_worldBounds(worldBounds), m_root(std::make_unique<QuadtreeNode>(worldBounds, 0)) {}

void SpatialIndex::insert(const std::string& id, SpatialItemType type, const AABB& bounds, int zIndex) {
    // If already exists, remove first
    auto it = m_itemRegistry.find(id);
    if (it != m_itemRegistry.end()) {
        m_root->remove(id);
    }

    SpatialItem item{id, type, bounds, zIndex};
    m_itemRegistry[id] = item;
    m_root->insert(item);
}

void SpatialIndex::update(const std::string& id, const AABB& newBounds) {
    auto it = m_itemRegistry.find(id);
    if (it != m_itemRegistry.end()) {
        it->second.bounds = newBounds;
        m_root->remove(id);
        m_root->insert(it->second);
    }
}

bool SpatialIndex::remove(const std::string& id) {
    auto it = m_itemRegistry.find(id);
    if (it != m_itemRegistry.end()) {
        m_itemRegistry.erase(it);
        return m_root->remove(id);
    }
    return false;
}

std::vector<SpatialItem> SpatialIndex::queryRange(const AABB& range) const {
    std::vector<SpatialItem> results;
    m_root->queryRange(range, results);
    return results;
}

std::vector<SpatialItem> SpatialIndex::queryPoint(float x, float y) const {
    std::vector<SpatialItem> results;
    m_root->queryPoint(x, y, results);

    // Sort descending by z-index (topmost first)
    std::sort(results.begin(), results.end(), [](const SpatialItem& a, const SpatialItem& b) {
        return a.zIndex > b.zIndex;
    });

    return results;
}

bool SpatialIndex::hitTestTopmost(float x, float y, SpatialItem& outItem) const {
    auto items = queryPoint(x, y);
    if (items.empty()) {
        return false;
    }
    outItem = items.front();
    return true;
}

void SpatialIndex::clear() {
    m_itemRegistry.clear();
    m_root->clear();
}

} // namespace WebAppEngine
