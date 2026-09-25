# ==============================================================================
# WebAssembly Build Pipeline Makefile
# Targets:
#   make release  - Compile optimized release wasm (-O3) to wasm/dist/
#   make debug    - Compile debug wasm (-O0 -g -sASSERTIONS=1) to wasm/dist/
#   make clean    - Remove build artifacts from wasm/dist/
# ==============================================================================

CXX = em++
CXXFLAGS = -std=c++17 -Iinclude
SRC = src/SplineSolver.cpp src/CablePhysics.cpp src/SpatialIndex.cpp src/WasmBindings.cpp
DIST_DIR = dist
TARGET_JS = $(DIST_DIR)/engine.js
TARGET_WASM = $(DIST_DIR)/engine.wasm

EMFLAGS_COMMON = --bind \
	-s WASM=1 \
	-s MODULARIZE=1 \
	-s EXPORT_NAME='createEngineWasmModule' \
	-s ALLOW_MEMORY_GROWTH=1 \
	-s ENVIRONMENT='web,worker,node' \
	-s NO_EXIT_RUNTIME=1 \
	-s EXPORTED_RUNTIME_METHODS='["ccall","cwrap"]'

RELEASE_FLAGS = -O3 -DNDEBUG -flto -msimd128
DEBUG_FLAGS = -O0 -g -DDEBUG -sASSERTIONS=1 -msimd128

.PHONY: all release debug clean check-emcc

all: release

check-emcc:
	@which $(CXX) > /dev/null 2>&1 || ( \
		echo "\033[33m[WASM BUILD NOTICE] '$(CXX)' not found in PATH.\033[0m"; \
		echo "To compile C++ to native WebAssembly:"; \
		echo "  1. Install Emscripten SDK: git clone https://github.com/emscripten-core/emsdk.git"; \
		echo "  2. cd emsdk && ./emsdk install latest && ./emsdk activate latest"; \
		echo "  3. source ./emsdk_env.sh"; \
		echo "  4. run 'make release' inside wasm/ directory."; \
		echo "\033[32mEngine TypeScript fallback bridge is active and automatically handles simulation.\033[0m"; \
		exit 1 \
	)

$(DIST_DIR):
	mkdir -p $(DIST_DIR)

release: check-emcc | $(DIST_DIR)
	@echo "Building WASM Release target: $(TARGET_JS)..."
	$(CXX) $(CXXFLAGS) $(RELEASE_FLAGS) $(EMFLAGS_COMMON) $(SRC) -o $(TARGET_JS)
	@echo "WASM Release build complete: $(TARGET_JS) & $(TARGET_WASM)"

debug: check-emcc | $(DIST_DIR)
	@echo "Building WASM Debug target: $(TARGET_JS)..."
	$(CXX) $(CXXFLAGS) $(DEBUG_FLAGS) $(EMFLAGS_COMMON) $(SRC) -o $(TARGET_JS)
	@echo "WASM Debug build complete: $(TARGET_JS) & $(TARGET_WASM)"

clean:
	@echo "Cleaning WASM build artifacts in $(DIST_DIR)..."
	rm -f $(DIST_DIR)/engine.js $(DIST_DIR)/engine.wasm $(DIST_DIR)/*.map
