#include <sw/redis++/redis++.h>
#include <nlohmann/json.hpp>
#include <libpq-fe.h> // Core Postgres Header
#include <iostream>
#include <string>
#include <unordered_map>
#include <iterator>
#include <cstdlib>

using namespace sw::redis;
using json = nlohmann::json;

void sync_to_postgres(Redis &redis, PGconn *pg_conn)
{
    std::unordered_map<std::string, std::string> stats;
    redis.hgetall("tenant_totals", std::inserter(stats, stats.begin()));

    if (stats.empty())
        return;

    for (auto const &[tenant_id, count] : stats)
    {
        // UPSERT query using core libpq
        std::string sql =
            "INSERT INTO tenant_analytics (tenant_id, total_events) "
            "VALUES (" +
            tenant_id + ", " + count + ") "
                                       "ON CONFLICT (tenant_id) DO UPDATE SET "
                                       "total_events = EXCLUDED.total_events, "
                                       "last_updated = CURRENT_TIMESTAMP;";

        PGresult *res = PQexec(pg_conn, sql.c_str());

        if (PQresultStatus(res) != PGRES_COMMAND_OK)
        {
            std::cerr << "SQL Error: " << PQerrorMessage(pg_conn) << std::endl;
        }
        PQclear(res);
    }
    std::cout << "[DATABASE] Synced " << stats.size() << " tenants to PostgreSQL." << std::endl;
}

int main()
{
    try
    {
        // 1. Get environment variables for Docker networking
        const char *redis_host_env = std::getenv("REDIS_HOST");
        const char *db_host_env = std::getenv("DB_HOST");
        const char *db_pass_env = std::getenv("POSTGRES_PASSWORD");
        const char *db_user_env = std::getenv("POSTGRES_USER");
        const char *db_name_env = std::getenv("POSTGRES_DB");

        // 2. Set defaults if environment variables are missing
        std::string redis_host = redis_host_env ? redis_host_env : "127.0.0.1";
        std::string db_host = db_host_env ? db_host_env : "127.0.0.1";
        std::string db_pass = db_pass_env ? db_pass_env : "mysecret";
        std::string db_user = db_user_env ? db_user_env : "postgres";
        std::string db_name = db_name_env ? db_name_env : "postgres";

        // 3. Construct connection strings
        std::string redis_url = "tcp://" + redis_host + ":6379";
        std::string conninfo = "host=" + db_host + " port=5432 dbname=" + db_name +
                               " user=" + db_user + " password=" + db_pass;

        // 4. Initialize Connections
        auto redis = Redis(redis_url);
        PGconn *pg_conn = PQconnectdb(conninfo.c_str());

        if (PQstatus(pg_conn) != CONNECTION_OK)
        {
            std::cerr << "Postgres Connection Failed: " << PQerrorMessage(pg_conn) << std::endl;
            return 1;
        }

        std::cout << "--- Nexus-Cruncher: Redis + Postgres Bridge Active ---" << std::endl;

        int processed_count = 0;
        while (true)
        {
            auto item = redis.brpop("ingest_queue", 0);
            if (item)
            {
                json data = json::parse(item->second);
                if (data.contains("tenant_id"))
                {
                    // Convert tenant_id to string for Redis Hash key
                    std::string t_id = std::to_string(data.value("tenant_id", 0));

                    // Increment the counter in Redis
                    redis.hincrby("tenant_totals", t_id, 1);
                    processed_count++;

                    // Sync to Postgres every 5 events
                    if (processed_count >= 5)
                    {
                        sync_to_postgres(redis, pg_conn);
                        processed_count = 0;
                    }
                }
            }
        }

        PQfinish(pg_conn);
    }
    catch (const std::exception &e)
    {
        std::cerr << "Fatal Error: " << e.what() << std::endl;
        return 1;
    }
    return 0;
}