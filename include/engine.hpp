#pragma once

#include <algorithm>
#include <cstdint>

#include "cache.hpp"
#include "chunk.hpp"
#include "message.hpp"

using ChunkStore = std::vector<chunk::Chunk>;
using MessageStore = std::vector<message::Message>;

namespace engine {

    class Engine {
    private:
        ChunkStore chunks_;
        MessageStore messages_;
        cache::ClockCache clock_cache_;


    public:
        Engine();

        void append_message(uint8_t* data, size_t size, uint8_t role);
        std::vector<std::vector<uint8_t>> get_window(size_t start, size_t count);

    };
} // namespace engine


