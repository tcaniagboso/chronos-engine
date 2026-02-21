#pragma once

#include <cstdint>
#include <vector>
#include <array>

#include "message.hpp"
static constexpr int CHUNK_CAPACITY = 256 * 1024;

namespace chunk {

    struct Chunk {
        uint32_t id_;
        uint64_t chunk_start_;
        uint64_t chunk_end_;
        std::vector<uint8_t> buffer_;

        explicit Chunk(uint32_t id)
            : id_{id},
              chunk_start_{},
              chunk_end_{},
              buffer_{} {}

        bool add_message(uint8_t* data, message::Message& msg) {
            size_t chunk_size = buffer_.size();
            if (chunk_size + msg.length > CHUNK_CAPACITY && chunk_size > 0) return false;
            if (chunk_size == 0) {
                chunk_start_ = msg.id_;
            }
            msg.offset_ = static_cast<uint32_t>(chunk_size);
            msg.chunk_id_ = id_;
            buffer_.insert(buffer_.end(), data, data + msg.length);
            chunk_end_ = msg.id_;
            return true;
        }

        std::vector<uint8_t> get_message_data(const message::Message& msg) {
            std::vector<uint8_t> data(
                    buffer_.begin() + msg.offset_,
                    buffer_.begin() + msg.offset_ + msg.length
            );

            return data;
        }
    };
} // namespace chunk