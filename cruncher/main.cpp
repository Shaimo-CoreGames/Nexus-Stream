#include <sw/redis++/redis++.h>
#include <iostream>
#include <string>
#include <thread>
#include <chrono>

using namespace sw::redis;

int main() {
    try {
        // 1. Connect to Redis (Use your Upstash or Local URL)
        auto redis = Redis("tcp://127.0.0.1:6379");
        std::cout << "--- Nexus-Cruncher Online ---" << std::endl;

        while (true) {
            // 2. BRPOP (Blocking Right Pop)
            // This is efficient: it sleeps until data arrives.
            // "ingest_queue" is the list name we used in Python.
            auto val = redis.brpop("ingest_queue", 0); 

            if (val) {
                // val is a std::pair<std::string, std::string>
                // .first is the key name, .second is the JSON string
                std::string event_data = val->second;
                
                std::cout << "[Processing Event]: " << event_data << std::endl;

                // TODO Day 6: Parse JSON and aggregate
            }
        }
    } catch (const Error &e) {
        std::cerr << "Redis Error: " << e.what() << std::endl;
        return 1;
    }

    return 0;
}