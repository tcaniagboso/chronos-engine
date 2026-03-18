#include "../include/engine.hpp"

namespace engine {

    Engine::Engine()
            : chunks_{},
              messages_{},
              clock_cache_(&chunks_) {}

    void Engine::append_message(uint8_t *data, size_t length, uint8_t role) {
        messages_.emplace_back(messages_.size(), static_cast<uint32_t>(length), role);
        auto &msg = messages_.back();
        if (chunks_.empty()) {
            chunks_.emplace_back(0);
        }

        auto &cur_chunk = chunks_.back();
        if (!cur_chunk.add_message(data, msg)) {
            auto id = static_cast<uint32_t>(chunks_.size());
            chunks_.emplace_back(id);
            auto &next_chunk = chunks_.back();
            next_chunk.add_message(data, msg);
        }
    }

    std::vector<std::vector<uint8_t>> Engine::get_window(size_t start, size_t count) {
        std::vector<std::vector<uint8_t>> window{};
        size_t end = std::min(start + count, messages_.size());
        while (start > 0 && messages_[start].role_ != ROLE_USER) start--;
        window.reserve(end - start);
        for (size_t i = start; i < end; i++) {
            const auto &msg = messages_[i];
            const auto &cur_chunk = clock_cache_.get(msg.chunk_id_);
            window.push_back(cur_chunk->get_message_data(msg));
        }

        return window;
    }

    std::vector<std::span<const uint8_t>> Engine::get_window_span(size_t start, size_t count) {
        size_t end = std::min(start + count, messages_.size());
        while (start > 0 && messages_[start].role_ != ROLE_USER) start--;
        std::vector<std::span<const uint8_t>> window;
        window.reserve(end - start);

        for (size_t i = start; i < end; i++) {
            const auto &msg = messages_[i];
            const auto &chunk = clock_cache_.get(msg.chunk_id_);
            window.push_back(chunk->get_message_span(msg));
        }

        return window;
    }
} // namespace engine
