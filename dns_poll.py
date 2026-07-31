#!/usr/bin/env python3
"""Poll site.de API for PENDING_UPDATE clearance, then enable DNS control + set A records."""
import requests, json, sys

API_KEY = "ce9ab5ee8921eea74ebf913376e13ecec18682e39a4fc936ae5f7cd99aec73cb243142f444d45dd0d0e48842812358797041947325cdbadf35630a00b533ff7dc82af51603ada94776f24ea06679746d62d6e4055c51916e8f1864ab3b712fba3159708de0b2fcd98c32de27b0ca01d43486aea0f5bed55420db6f53cffff8b3"
DOMAIN_ID = 35051
VPS_IP = "37.114.41.246"
BASE = "https://backend.site.de/v2"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/merge-patch+json",
    "Accept": "application/json"
}

def check_and_apply():
    # 1. Check registry status
    resp = requests.get(f"{BASE}/domain_names/{DOMAIN_ID}", headers=headers, timeout=15)
    if resp.status_code != 200:
        print(f"GET failed: {resp.status_code} {resp.text[:200]}")
        return False
    data = resp.json()
    reg_status = data.get("registry_status", [])
    dns_control = data.get("dns_control_enabled", 0)

    print(f"registry_status: {reg_status}, dns_control_enabled: {dns_control}")

    if "PENDING_UPDATE" in reg_status:
        # Stay silent — no output = no notification
        return False

    # 2. Enable DNS control if not already
    if not dns_control:
        print("PENDING_UPDATE cleared! Enabling DNS control...")
        resp2 = requests.patch(
            f"{BASE}/domain_names/{DOMAIN_ID}/update_dns_control",
            json={"dns_control_enabled": True},
            headers=headers, timeout=30
        )
        if resp2.status_code != 200:
            print(f"DNS control failed: {resp2.status_code} {resp2.text[:300]}")
            return False
        print("DNS control enabled!")
    else:
        print("DNS control already enabled.")

    # 3. Set A records
    print("Setting A records...")
    dns_records = [
        {"name": "@", "type": "A", "content": VPS_IP, "ttl": 3600, "prio": 0},
        {"name": "www", "type": "A", "content": VPS_IP, "ttl": 3600, "prio": 0},
        {"name": "app", "type": "A", "content": VPS_IP, "ttl": 3600, "prio": 0},
    ]
    resp3 = requests.patch(
        f"{BASE}/domain_names/{DOMAIN_ID}/dns_records",
        json={"dns_records": dns_records},
        headers=headers, timeout=30
    )
    if resp3.status_code == 200:
        print("DNS records set successfully!")
        result = resp3.json()
        print(f"dns_records: {json.dumps(result.get('dns_records'), indent=2)}")
        return True
    else:
        print(f"DNS records failed: {resp3.status_code} {resp3.text[:300]}")
        return False

if __name__ == "__main__":
    success = check_and_apply()
    sys.exit(0 if success else 1)
