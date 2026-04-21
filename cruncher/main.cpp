#include <sw/redis++/redis++.h>
#include <nlohmann/json.hpp>
#include <iostream>
#include <unordered_map> // New: For storing totals

using namespace sw::redis;
using json = nlohmann::json;

int main()
{
    try
    {
        auto redis = Redis("tcp://127.0.0.1:6379");
        std::cout << "--- Day 7: Nexus-Aggregator is LIVE ---" << std::endl;

        // Our "In-Memory Database"
        // Key: Tenant ID, Value: Total Event Count
        std::unordered_map<int, int> tenant_counts;

        while (true)
        {
            auto item = redis.brpop("ingest_queue", 0);

            if (item)
            {
                json data = json::parse(item->second);

                // ... inside your while loop ...
                if (data.contains("type"))
                {
                    std::string tenant_id_str = std::to_string(data.value("tenant_id", 0));

                    // THE NEW PERSISTENT STEP:
                    // HINCRBY tells Redis: "Go to the 'tenant_totals' hash,
                    // find this tenant_id, and add 1 to its value."
                    redis.hincrby("tenant_totals", tenant_id_str, 1);

                    // Get the new total back from Redis to display it
                    auto new_total = redis.hget("tenant_totals", tenant_id_str);

                    std::cout << "[PERSISTED] Tenant " << tenant_id_str
                              << " now has: " << (new_total ? *new_total : "0") << " events." << std::endl;
                }
            }
        }
    }
    catch (const std::exception &e)
    {
        std::cerr << "ERROR: " << e.what() << std::endl;
        return 1;
    }
    return 0;
}