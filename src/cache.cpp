
#include "cache.hpp"

namespace cache {

    ClockCache::ClockCache(ChunkStore *chunk_store)
            : chunk_store_{chunk_store},
              entries_{},
              chunk_idx_map{},
              hand_{0} {
        entries_.reserve(CACHED_CHUNKS);
    }

    void ClockCache::evict() {
        while (true) {
            Entry &e = entries_[hand_];
            if (!e.used) {
                chunk_idx_map.erase(e.chunk_->id_);
                break;
            }

            e.used = false;
            hand_ = (hand_ + 1) % CACHED_CHUNKS;
        }
    }

    void ClockCache::touch(uint32_t chunk_id) {
        size_t index = chunk_idx_map[chunk_id];
        entries_[index].used = true;
    }

    void ClockCache::insert(uint32_t chunk_id) {
        if (entries_.size() == CACHED_CHUNKS) {
            evict();
            Entry &e = entries_[hand_];
            e.chunk_ = &chunk_store_->at(chunk_id);
            chunk_idx_map.emplace(chunk_id, hand_);
            e.used = true;
        } else {
            entries_.emplace_back(&chunk_store_->at(chunk_id));
            chunk_idx_map.emplace(chunk_id, hand_);
        }
        hand_ = (hand_ + 1) % CACHED_CHUNKS;
    }

    chunk::Chunk *ClockCache::get(uint32_t chunk_id) {
        if (!chunk_idx_map.count(chunk_id)) {
            insert(chunk_id);
        } else {
            touch(chunk_id);
        }

        return entries_[chunk_idx_map[chunk_id]].chunk_;
    }
} // namespace cache