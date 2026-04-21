cmake_minimum_required(VERSION 3.10)
project(NexusStreamCruncher)

set(CMAKE_CXX_STANDARD 17)

# 1. FIND JSON
find_package(nlohmann_json REQUIRED)

# 2. POINT TO POSTGRES (Direct Path)
set(PG_PATH "C:/pgsql") 
include_directories(${PG_PATH}/include)
link_directories(${PG_PATH}/lib)

# 3. POINT TO REDIS++ (Direct Path via vcpkg)
set(VCPKG_PATH "C:/vcpkg/installed/x64-mingw-dynamic") 
include_directories(${VCPKG_PATH}/include)
link_directories(${VCPKG_PATH}/lib)

add_executable(nexus_cruncher main.cpp)

# 4. LINK ALL THREE
# We use the raw names 'redis++' and 'hiredis' because they are in the link_directories
target_link_libraries(nexus_cruncher PRIVATE 
    nlohmann_json::nlohmann_json
    libpq        # Postgres
    redis++      # Redis++
    hiredis      # Redis dependency
)