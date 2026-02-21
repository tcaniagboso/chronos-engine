cmake_minimum_required(VERSION 3.20)
project(chronos_engine)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

add_library(chronos_engine
        src/cache.cpp
        src/engine.cpp
)

target_include_directories(chronos_engine
        PUBLIC
        ${PROJECT_SOURCE_DIR}/include
)

# Test executable
add_executable(test_engine
        src/main.cpp
)

target_link_libraries(test_engine
        chronos_engine
)