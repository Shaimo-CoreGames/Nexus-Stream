cmake_minimum_required(VERSION 3.10)
project(NexusCruncher)

set(CMAKE_CXX_STANDARD 17)

# Find Redis++ and Hiredis (You must have these installed)
find_package(redis++ REQUIRED)
find_package(hiredis REQUIRED)

add_executable(nexus_cruncher main.cpp)
target_link_libraries(nexus_cruncher redis++ hiredis)