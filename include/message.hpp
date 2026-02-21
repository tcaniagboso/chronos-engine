#pragma once

#include <cstdint>

static constexpr uint8_t ROLE_USER = 0;
static constexpr uint8_t ROLE_SYSTEM = 0;

namespace message {
    struct Message {
        uint64_t id_;
        uint32_t chunk_id_;
        uint32_t offset_;
        uint32_t length;
        uint8_t role_;

        Message(uint64_t id, uint32_t length, uint8_t role)
            : id_{id},
              chunk_id_{},
              offset_{},
              length{length},
              role_{role} {}
    };

} // namespace message