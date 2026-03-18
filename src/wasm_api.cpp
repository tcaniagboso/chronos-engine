#include <cstdint>
#include <cstdlib>
#include <cstring>

#include "../include/engine.hpp"

static engine::Engine engine_instance;

extern "C" {

// already have
void append_message(uint8_t* data, size_t size, uint8_t role) {
    engine_instance.append_message(data, size, role);
}

// Returns a malloc()'d buffer. JS must call free_buffer(ptr).
// out_total_size = total bytes in returned packed buffer.
// out_msg_count  = number of messages returned (clamped to available range).
uint8_t* get_window_packed(size_t start, size_t count, size_t* out_total_size, size_t* out_msg_count) {
    auto window = engine_instance.get_window(start, count);

    const auto n = static_cast<uint32_t>(window.size());
    *out_msg_count = n;

    // header sizes
    const size_t header_bytes =
            sizeof(uint32_t) +                 // n
            sizeof(uint32_t) * n +             // offsets
            sizeof(uint32_t) * n;              // sizes

    // payload size
    size_t payload_bytes = 0;
    for (const auto& msg : window) payload_bytes += msg.size();

    const size_t total = header_bytes + payload_bytes;
    *out_total_size = total;

    auto* out = (uint8_t*)std::malloc(total);
    if (!out) {
        *out_total_size = 0;
        *out_msg_count = 0;
        return nullptr;
    }

    // write header
    size_t cursor = 0;

    // n
    std::memcpy(out + cursor, &n, sizeof(uint32_t));
    cursor += sizeof(uint32_t);

    // offsets region starts right after (n + offsets + sizes)
    auto* offsets = reinterpret_cast<uint32_t*>(out + cursor);
    cursor += sizeof(uint32_t) * n;

    auto* sizes = reinterpret_cast<uint32_t*>(out + cursor);
    cursor += sizeof(uint32_t) * n;

    // payload starts here
    const size_t payload_start = cursor;

    uint32_t running = 0;
    for (uint32_t i = 0; i < n; i++) {
        offsets[i] = running;
        sizes[i]   = static_cast<uint32_t>(window[i].size());
        running   += sizes[i];
    }

    // copy payload bytes
    size_t pcur = payload_start;
    for (uint32_t i = 0; i < n; i++) {
        const auto& msg = window[i];
        if (!msg.empty()) {
            std::memcpy(out + pcur, msg.data(), msg.size());
            pcur += msg.size();
        }
    }

    return out;
}

void free_buffer(uint8_t* ptr) {
    std::free(ptr);
}

} // extern "C"