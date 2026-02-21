#include <cassert>
#include <chrono>
#include <iostream>
#include <string>
#include <vector>

#include "engine.hpp"

void print_test(const std::string& name, bool pass) {
    std::cout << (pass ? "[PASSED] " : "[FAILED] ") << name << "\n";
}

bool test_basic_append() {
    engine::Engine e;

    std::vector<std::string> msgs = {
            "Hello", "World", "Chronos", "Engine"
    };

    for (auto& m : msgs) {
        e.append_message(
                reinterpret_cast<uint8_t*>(m.data()),
                m.size(),
                0
        );
    }

    auto window = e.get_window(0, msgs.size());

    if (window.size() != msgs.size()) return false;

    for (size_t i = 0; i < msgs.size(); i++) {
        std::string out(window[i].begin(), window[i].end());
        if (out != msgs[i]) return false;
    }

    return true;
}

bool test_chunk_rollover() {
    engine::Engine e;

    std::string big = "THIS_IS_A_LONG_MESSAGE_TO_FORCE_CHUNK_ROLLOVER_";

    for (int i = 0; i < 1000; i++) {
        e.append_message(
                reinterpret_cast<uint8_t*>(big.data()),
                big.size(),
                0
        );
    }

    auto window = e.get_window(0, 10);

    if (window.size() != 10) return false;

    for (auto& payload : window) {
        std::string out(payload.begin(), payload.end());
        if (out != big) return false;
    }

    return true;
}

bool test_middle_window() {
    engine::Engine e;

    for (int i = 0; i < 200; i++) {
        std::string m = "MSG_" + std::to_string(i);
        e.append_message(
                reinterpret_cast<uint8_t*>(m.data()),
                m.size(),
                0
        );
    }

    auto window = e.get_window(50, 20);

    if (window.size() != 20) return false;

    for (int i = 0; i < 20; i++) {
        std::string expected = "MSG_" + std::to_string(50 + i);
        std::string out(window[i].begin(), window[i].end());
        if (out != expected) return false;
    }

    return true;
}

bool test_bounds() {
    engine::Engine e;

    for (int i = 0; i < 10; i++) {
        std::string m = "B_" + std::to_string(i);
        e.append_message(
                reinterpret_cast<uint8_t*>(m.data()),
                m.size(),
                0
        );
    }

    auto window = e.get_window(8, 20);

    return window.size() == 2;
}

bool test_cache_eviction() {
    engine::Engine e;

    std::string msg = "CACHE_TEST_MESSAGE";

    for (int i = 0; i < 2000; i++) {
        e.append_message(
                reinterpret_cast<uint8_t*>(msg.data()),
                msg.size(),
                0
        );
    }

    auto w1 = e.get_window(0, 20);
    auto w2 = e.get_window(500, 20);
    auto w3 = e.get_window(1000, 20);
    auto w4 = e.get_window(1500, 20);

    for (auto& payload : w4) {
        std::string out(payload.begin(), payload.end());
        if (out != msg) return false;
    }

    return true;
}

void stress_test() {
    engine::Engine e;

    const size_t MESSAGE_COUNT = 200000;
    const size_t WINDOW_SIZE = 80;

    std::string payload = "PERF_TEST_MESSAGE_ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    // ---- Append test ----
    auto start_append = std::chrono::steady_clock::now();

    for (size_t i = 0; i < MESSAGE_COUNT; i++) {
        e.append_message(
                reinterpret_cast<uint8_t*>(payload.data()),
                payload.size(),
                0
        );
    }

    auto end_append = std::chrono::steady_clock::now();
    auto append_time = std::chrono::duration_cast<std::chrono::milliseconds>(
            end_append - start_append
    );

    std::cout << "\nAppend " << MESSAGE_COUNT
              << " messages took: "
              << append_time.count()
              << " ms\n";

    // ---- Window test ----
    auto start_window = std::chrono::steady_clock::now();

    for (size_t i = 0; i < 10000; i++) {
        size_t pos = (i * 137) % (MESSAGE_COUNT - WINDOW_SIZE);
        e.get_window(pos, WINDOW_SIZE);
    }

    auto end_window = std::chrono::steady_clock::now();
    auto window_time = std::chrono::duration_cast<std::chrono::milliseconds>(
            end_window - start_window
    );

    std::cout << "10K random window fetches took: "
              << window_time.count()
              << " ms\n";
}

int main() {

    print_test("Basic append + window", test_basic_append());
    print_test("Chunk rollover", test_chunk_rollover());
    print_test("Middle window", test_middle_window());
    print_test("Window bounds", test_bounds());
    print_test("Cache eviction stability", test_cache_eviction());

    stress_test();

    std::cout << "\nAll tests finished.\n";
    return 0;
}