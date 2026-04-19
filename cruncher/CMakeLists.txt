cmake_minimum_required(VERSION 3.10)
project(NexusCruncher)

set(CMAKE_CXX_STANDARD 17)

# vcpkg toolchain handles finding these
find_package(redis++ CONFIG REQUIRED)
find_package(nlohmann_json CONFIG REQUIRED)

add_executable(nexus_cruncher main.cpp)

# Use the specific targets provided by vcpkg
target_link_libraries(nexus_cruncher PRIVATE redis++::redis++ nlohmann_json::nlohmann_json)