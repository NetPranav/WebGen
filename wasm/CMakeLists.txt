cmake_minimum_required(VERSION 3.20)
project(EngineWasm CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Verify Emscripten toolchain
if(NOT EMSCRIPTEN)
  message(WARNING "Building with native C++ compiler instead of Emscripten. Set -DCMAKE_TOOLCHAIN_FILE=.../Emscripten.cmake for WASM targets.")
endif()

# Configuration profiles: Release (-O3) / Debug (-O0 -g)
if(NOT CMAKE_BUILD_TYPE)
  set(CMAKE_BUILD_TYPE Release CACHE STRING "Choose the type of build" FORCE)
endif()

set(CMAKE_CXX_FLAGS_RELEASE "-O3 -DNDEBUG -flto")
set(CMAKE_CXX_FLAGS_DEBUG "-O0 -g -DDEBUG -sASSERTIONS=1")

# Include directories
include_directories(
  ${CMAKE_CURRENT_SOURCE_DIR}/include
)

# Source files
set(SOURCES
  ${CMAKE_CURRENT_SOURCE_DIR}/src/SplineSolver.cpp
  ${CMAKE_CURRENT_SOURCE_DIR}/src/CablePhysics.cpp
  ${CMAKE_CURRENT_SOURCE_DIR}/src/SpatialIndex.cpp
  ${CMAKE_CURRENT_SOURCE_DIR}/src/WasmBindings.cpp
)

# Target output directory: wasm/dist/
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}/dist)

# Target executable / WASM module
add_executable(engine ${SOURCES})

if(EMSCRIPTEN)
  set_target_properties(engine PROPERTIES
    OUTPUT_NAME "engine"
    SUFFIX ".js"
    LINK_FLAGS "--bind -s WASM=1 -s MODULARIZE=1 -s EXPORT_NAME='createEngineWasmModule' -s ALLOW_MEMORY_GROWTH=1 -s ENVIRONMENT='web,worker,node' -s NO_EXIT_RUNTIME=1 -s EXPORTED_RUNTIME_METHODS='[\"ccall\",\"cwrap\"]'"
  )
endif()
