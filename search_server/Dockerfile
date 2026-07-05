# =========================================================
# Stage 1: Build C++ Binary
# =========================================================
FROM gcc:12 AS builder

WORKDIR /build

# Install dependencies (curl for fetching headers)
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Download header-only dependencies
RUN curl -sSL -o httplib.h https://raw.githubusercontent.com/yhirose/cpp-httplib/master/httplib.h && \
    curl -sSL -o json.hpp https://github.com/nlohmann/json/releases/download/v3.11.3/json.hpp

# Copy the server source file
COPY server.cpp .

# Compile optimized binary with O3 and pthread support
RUN g++ -O3 -std=c++17 server.cpp -o cpp_search_server -lpthread

# =========================================================
# Stage 2: Runtime Image
# =========================================================
FROM debian:stable-slim

WORKDIR /app

# Copy the compiled binary from the builder stage
COPY --from=builder /build/cpp_search_server .

# Expose HTTP port
EXPOSE 8080

# Execute server
CMD ["./cpp_search_server"]
