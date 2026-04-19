#include <sw/redis++/redis++.h>
#include <iostream>

using namespace sw::redis;

int main()
{
    try
    {
        // Points to the Docker bridge you just created
        auto redis = Redis("tcp://127.0.0.1:6379");

        std::string response = redis.ping();
        std::cout << "------------------------------------" << std::endl;
        std::cout << "Nexus-Cruncher: CONNECTED TO DOCKER" << std::endl;
        std::cout << "Redis Response: " << response << std::endl;
        std::cout << "------------------------------------" << std::endl;
    }
    catch (const Error &e)
    {
        std::cerr << "CONNECTION FAILED: " << e.what() << std::endl;
        return 1;
    }
    return 0;
}