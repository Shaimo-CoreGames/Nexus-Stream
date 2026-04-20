#include <sw/redis++/redis++.h>
#include <nlohmann/json.hpp>
#include <iostream>
#include <string>

using namespace sw::redis;
using json = nlohmann::json;

int main()
{
    try
    {
        // Connect to Docker Redis
        auto redis = Redis("tcp://127.0.0.1:6379");
        std::cout << "--- Nexus-Cruncher is LIVE and listening for events ---" << std::endl;

        while (true)
        {
            // BRPOP: Blocks until a message arrives in "ingest_queue"
            // It returns a pair: {queue_name, message}
            auto item = redis.brpop("ingest_queue", 0);

            // ... inside your while loop ...
            // ... inside your while loop ...
            if (item)
            {
                std::string raw_json = item->second;

                // Parse the JSON
                json data = json::parse(raw_json);

                // SAFER WAY TO READ:
                // We check if "type" exists and is actually a string before using it
                if (data.contains("type") && !data["type"].is_null())
                {

                    std::string event_name = data["type"];   // Use "type" to match Python
                    int tenant = data.value("tenant_id", 0); // Default to 0 if missing

                    std::cout << "[SUCCESS] Processed: " << event_name
                              << " | Tenant: " << tenant << std::endl;
                }
                else
                {
                    std::cout << "[ERROR] Received data, but 'type' field is missing or null!" << std::endl;
                    std::cout << "Raw Data: " << raw_json << std::endl;
                }
            }
        }
    }
    catch (const std::exception &e)
    {
        std::cerr << "CRITICAL ERROR: " << e.what() << std::endl;
        return 1;
    }
    return 0;
}