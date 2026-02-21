#pragma once

#include <cstdint>
#include <unordered_map>
#include <vector>

#include "chunk.hpp"

static constexpr size_t CACHED_CHUNKS = 32;
using ChunkStore = std::vector<chunk::Chunk>;
namespace cache {

    struct Entry {
        chunk::Chunk* chunk_;
        bool used;

        explicit Entry(chunk::Chunk* chunk)
            : chunk_{chunk},
              used{true} {}
    };

    class ClockCache {
    private:
        ChunkStore* chunk_store_;
        std::vector<Entry> entries_;
        std::unordered_map<uint32_t, size_t> chunk_idx_map;
        size_t hand_;

        void evict();
        void insert(uint32_t chunk_id);
        void touch(uint32_t chunk_id);

    public:
        explicit ClockCache(ChunkStore* chunk_store);

        chunk::Chunk* get(uint32_t chunk_id);
    };

} // namespace cache