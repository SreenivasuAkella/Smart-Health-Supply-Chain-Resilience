#!/usr/bin/env python3
"""
Provision User CLI Script for Sanjeevani AI.
Demonstrates calling the backend API `POST /api/auth/register` with the Base64 Admin Secret Key.
Strictly ensures no public signup exists; users are registered centrally via this secure mechanism.
"""

import sys
import os
import json
import argparse
import requests

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.config import ADMIN_SECRET_KEY_B64, PORT, HOST

DEFAULT_API_URL = f"http://127.0.0.1:{PORT}/api/auth/register"


def provision_user(
    email: str,
    password: str,
    full_name: str,
    role: str = "PHC_OFFICER",
    department: str = "District Health Unit",
    assigned_state: str = "Maharashtra",
    assigned_district: str = "Pune",
    secret_key_b64: str = ADMIN_SECRET_KEY_B64,
    api_url: str = DEFAULT_API_URL
):
    headers = {
        "Content-Type": "application/json",
        "X-Admin-Secret": secret_key_b64
    }
    payload = {
        "email": email,
        "password": password,
        "full_name": full_name,
        "role": role,
        "department": department,
        "assigned_state": assigned_state,
        "assigned_district": assigned_district
    }

    print(f"\n🔐 Calling Backend API: {api_url}")
    print(f"🔑 Header 'X-Admin-Secret': {secret_key_b64[:12]}... (Base64 Secret)")
    print(f"📧 Registering Email: {email} ({full_name})")

    try:
        response = requests.post(api_url, json=payload, headers=headers, timeout=10)
        if response.status_code == 201:
            res_json = response.json()
            print("\n✅ USER SUCCESSFULLY PROVISIONED IN FIREBASE RTDB!")
            print(json.dumps(res_json, indent=2))
            return res_json
        else:
            print(f"\n❌ FAILED (HTTP {response.status_code}): {response.text}")
            return None
    except requests.exceptions.RequestException as e:
        print(f"\n❌ Network error contacting backend server: {e}")
        return None


def main():
    parser = argparse.ArgumentParser(description="Provision a healthcare staff email in Firebase RTDB using Base64 Secret Key")
    parser.add_argument("--email", required=True, help="Healthcare personnel email to register")
    parser.add_argument("--password", required=True, help="Initial account password")
    parser.add_argument("--name", required=True, help="Full name of personnel")
    parser.add_argument("--role", default="PHC_OFFICER", choices=["NATIONAL_DIRECTOR", "PHC_OFFICER", "LOGISTICS_COORDINATOR", "SURVEILLANCE_EPIDEMIOLOGIST"])
    parser.add_argument("--state", default="Maharashtra", help="Assigned State")
    parser.add_argument("--district", default="Pune", help="Assigned District")
    parser.add_argument("--secret", default=ADMIN_SECRET_KEY_B64, help="Base64 Admin Provisioning Secret Key")
    parser.add_argument("--url", default=DEFAULT_API_URL, help="Backend Auth API URL")

    args = parser.parse_args()
    provision_user(
        email=args.email,
        password=args.password,
        full_name=args.name,
        role=args.role,
        assigned_state=args.state,
        assigned_district=args.district,
        secret_key_b64=args.secret,
        api_url=args.url
    )


if __name__ == "__main__":
    main()
