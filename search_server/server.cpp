#include <iostream>
#include <vector>
#include <algorithm>
#include <unordered_map>
#include <mutex>
#include "httplib.h"
#include "json.hpp"
#include <cstdlib>

using namespace std;
using json = nlohmann::json;

#pragma pack(push, 1)
struct FingerprintEntry {
    int hash;
    int song_id;
    int time_offset;
};
#pragma pack(pop)

struct MatchResult {
    int song_id;
    int score;
};
vector<FingerprintEntry> db_index;
mutex db_mutex;

bool compareByHash(const FingerprintEntry& a, const FingerprintEntry& b) {
    return a.hash < b.hash;
}

// Add new song fingerprints
void add_fingerprints(const httplib::Request& req, httplib::Response& res) {
    try {
        auto body = json::parse(req.body);
        int song_id = body["song_id"];
        auto hashes = body["hashes"]; 

        lock_guard<mutex> lock(db_mutex);
        db_index.reserve(db_index.size() + hashes.size());
        
        for (const auto& item : hashes) {
            db_index.push_back({
                item["hash"].get<int>(),
                song_id,
                item["offset"].get<int>()
            });
        }

        sort(db_index.begin(), db_index.end(), compareByHash);

        res.set_content("{\"status\":\"success\"}", "application/json");
    } catch (exception& e) {
        res.status = 400;
        res.set_content(json{{"error", e.what()}}.dump(), "application/json");
    }
}

// Identify song
void identify(const httplib::Request& req, httplib::Response& res) {
    try {
        auto body = json::parse(req.body);
        auto query_hashes = body["hashes"];
        unordered_map<int, unordered_map<int, int>> match_histograms;
        {
            lock_guard<mutex> lock(db_mutex);
            
            for (const auto& item : query_hashes) {
                int q_hash = item["hash"].get<int>();
                int q_offset = item["offset"].get<int>();
                FingerprintEntry dummy = { q_hash, 0, 0 };
                auto bounds = equal_range(
                    db_index.begin(), 
                    db_index.end(), 
                    dummy, 
                    [](const FingerprintEntry& a, const FingerprintEntry& b) {
                        return a.hash < b.hash;
                    }
                );

                for (auto it = bounds.first; it != bounds.second; ++it) {
                    int offset_diff = (int)(it->time_offset) - (int)(q_offset);
                    match_histograms[it->song_id][offset_diff]++;
                }
            }
        }

        vector<MatchResult> results;
        for (const auto& [song_id, diffs] : match_histograms) {
            int max_score = 0;
            for (const auto& [diff, count] : diffs) {
                if (count > max_score) {
                    max_score = count;
                }
            }
            results.push_back({song_id, max_score});
        }

        sort(results.begin(), results.end(), [](const MatchResult& a, const MatchResult& b) {
            return a.score > b.score;
        });

        json response_data = json::array();
        for (size_t i = 0; i < min(results.size(), size_t(3)); ++i) {
            response_data.push_back({
                {"song_id", results[i].song_id},
                {"score", results[i].score}
            });
        }

        res.set_content(response_data.dump(), "application/json");
    } catch (exception& e) {
        res.status = 400;
        res.set_content(json{{"error", e.what()}}.dump(), "application/json");
    }
}

// Clear database index
void clear(const httplib::Request& req, httplib::Response& res) {
    lock_guard<mutex> lock(db_mutex);
    db_index.clear();
    db_index.shrink_to_fit();
    res.set_content("{\"status\":\"success\"}", "application/json");
}

int main() {
    httplib::Server svr;
    svr.Post("/add", add_fingerprints);
    svr.Post("/identify", identify);
    svr.Post("/clear", clear);
    const char* port_env = std::getenv("PORT");
    int port = port_env ? std::stoi(port_env) : 8080;
    std::cout << "Search server running on port " << port << std::endl;
    svr.listen("0.0.0.0", port);
}
