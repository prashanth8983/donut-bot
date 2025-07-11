import requests
import json
import time

BASE_URL = "http://localhost:8089/api/v1"
HEADERS = {"Content-Type": "application/json"}
# If you need authentication, add: HEADERS["Authorization"] = "Bearer <token>"

def print_response(name, resp):
    print(f"\n=== {name} ===")
    print(f"Status: {resp.status_code}")
    try:
        print(json.dumps(resp.json(), indent=2))
    except Exception:
        print(resp.text)

def main():
    # Crawler Management
    print_response("Start Crawler", requests.post(f"{BASE_URL}/crawler/start", headers=HEADERS, json={}))
    print_response("Stop Crawler", requests.post(f"{BASE_URL}/crawler/stop", headers=HEADERS))
    print_response("Get Crawler Status", requests.get(f"{BASE_URL}/crawler/status", headers=HEADERS))
    print_response("Reset Crawler", requests.post(f"{BASE_URL}/crawler/flush_status?clear_completed=true&clear_seen=true&clear_processing=true&clear_queue=true&clear_bloom_filter=true", headers=HEADERS))

    # Configuration
    print_response("Get Config", requests.get(f"{BASE_URL}/config", headers=HEADERS))
    print_response("Update Config", requests.put(f"{BASE_URL}/config/", headers=HEADERS, json={
        "workers": 3,
        "max_depth": 3,
        "max_pages": 1000,
        "default_delay": 2.0,
        "allowed_domains": ["northeastern.edu", "nyu.edu", "stanford.edu", "mit.edu"],
        "kafka_brokers": ["kafka:29092"],
        "output_topic": "raw-documents",
        "enable_kafka_output": False,
        "enable_local_save": True,
        "local_output_dir": "/app/crawler_output",
        "redis_host": "redis",
        "redis_port": 6379,
        "respect_robots_txt": True,
        "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }))
    print_response("Get Allowed Domains", requests.get(f"{BASE_URL}/config/domains", headers=HEADERS))
    print_response("Update Allowed Domains", requests.put(f"{BASE_URL}/config/domains", headers=HEADERS, json={"action": "add", "domains": ["example.com"]}))

    # Jobs
    job_payload = {
        "name": f"Test Job {int(time.time())}",
        "domain": "example.com",
        "priority": "medium",
        "max_pages": 100,
        "max_depth": 3,
        "description": "",
        "tags": []
    }
    resp = requests.post(f"{BASE_URL}/jobs", headers=HEADERS, json=job_payload)
    print_response("Create Job", resp)
    
    # Extract job ID from response
    job_data = resp.json()
    job_id = job_data.get("id") if resp.status_code == 201 else "<replace_with_job_id>"
    
    print_response("Get Jobs", requests.get(f"{BASE_URL}/jobs", headers=HEADERS))
    
    # Only test job operations if we have a real job ID
    if job_id != "<replace_with_job_id>":
        print_response("Start Job", requests.post(f"{BASE_URL}/jobs/{job_id}/start", headers=HEADERS))
        print_response("Stop Job", requests.post(f"{BASE_URL}/jobs/{job_id}/stop", headers=HEADERS))
        print_response("Pause Job", requests.post(f"{BASE_URL}/jobs/{job_id}/pause", headers=HEADERS))
        print_response("Resume Job", requests.post(f"{BASE_URL}/jobs/{job_id}/resume", headers=HEADERS))
        print_response("Delete Job", requests.delete(f"{BASE_URL}/jobs/{job_id}", headers=HEADERS))
    else:
        print("\n=== Skipping Job Operations (no valid job ID) ===")

    # Scheduled Jobs
    sched_payload = {
        "name": "Scheduled Job",
        "domain": "example.com",
        "schedule": "0 2 * * *",
        "priority": "medium",
        "max_pages": 1000,
        "max_depth": 3,
        "description": "",
        "tags": []
    }
    resp = requests.post(f"{BASE_URL}/scheduler/jobs", headers=HEADERS, json=sched_payload)
    print_response("Create Scheduled Job", resp)
    
    # Extract scheduled job ID from response
    sched_data = resp.json()
    sched_id = sched_data.get("_id") if resp.status_code == 201 else "<replace_with_sched_id>"
    
    print_response("Get Scheduled Jobs", requests.get(f"{BASE_URL}/scheduler/jobs", headers=HEADERS))
    
    # Only test scheduled job operations if we have a real ID
    if sched_id != "<replace_with_sched_id>":
        print_response("Enable Scheduled Job", requests.post(f"{BASE_URL}/scheduler/jobs/{sched_id}/enable", headers=HEADERS))
        print_response("Disable Scheduled Job", requests.post(f"{BASE_URL}/scheduler/jobs/{sched_id}/disable", headers=HEADERS))
        print_response("Delete Scheduled Job", requests.delete(f"{BASE_URL}/scheduler/jobs/{sched_id}", headers=HEADERS))
    else:
        print("\n=== Skipping Scheduled Job Operations (no valid job ID) ===")
    
    print_response("Get Next Runs", requests.get(f"{BASE_URL}/scheduler/next-runs", headers=HEADERS))

    # Queue/URL Management
    print_response("Get Queue Status", requests.get(f"{BASE_URL}/urls/queue", headers=HEADERS))
    print_response("Add URLs", requests.post(f"{BASE_URL}/urls/add", headers=HEADERS, json={"urls": ["https://example.com"]}))
    print_response("Clear URLs", requests.delete(f"{BASE_URL}/urls/clear", headers=HEADERS))

    # Results
    print_response("Get Results", requests.get(f"{BASE_URL}/results", headers=HEADERS))
    print_response("Clear Results", requests.delete(f"{BASE_URL}/results", headers=HEADERS))

    # Metrics/Stats
    print_response("Get Metrics", requests.get(f"{BASE_URL}/metrics?time_range=24h", headers=HEADERS))
    print_response("Get Stats", requests.get(f"{BASE_URL}/stats", headers=HEADERS))

    # Health
    print_response("Health Check", requests.get(f"{BASE_URL}/health", headers=HEADERS))

if __name__ == "__main__":
    main() 