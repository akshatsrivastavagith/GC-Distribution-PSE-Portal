#!/usr/bin/env python3
import csv
import requests
import uuid
import time
import base64
import sys
import os
import json
import random
import struct
from datetime import datetime
from queue import Queue
import threading
import concurrent.futures

# This is your original script with a *small* control hook.
# Invocation: python3 voucher_upload_controlled.py <base_url> <username> <password> <raw_csv_path> <run_folder> <rzp_commission_paisa>

if len(sys.argv) < 7:
    print('\nUsage: python3 voucher_upload_controlled.py base_url username password raw_csv run_folder rzp_commission_paisa')
    sys.exit(1)

API_BASE_URL = sys.argv[1]
USERNAME = sys.argv[2]
PASSWORD = sys.argv[3]
RAW_CSV_PATH = sys.argv[4]
RUN_FOLDER = sys.argv[5]
RZP_COMMISSION = int(sys.argv[6])

API_ENDPOINT = "/offers/voucher-benefits"

# Verify meta.json exists and get environment info for logging
try:
    meta = json.loads(open(os.path.join(RUN_FOLDER,'meta.json')).read())
    env = meta.get('env', 'UNKNOWN').upper()
    print(f"\n{'='*60}")
    print(f"Environment: {env}")
    print(f"API Base URL: {API_BASE_URL}")
    print(f"API Endpoint: {API_ENDPOINT}")
    print(f"Full URL: {API_BASE_URL}{API_ENDPOINT}")
    print(f"{'='*60}\n")
except FileNotFoundError:
    print("ERROR: meta.json not found in run folder")
    sys.exit(1)
except Exception as e:
    print(f"ERROR: Failed to read meta.json: {e}")
    sys.exit(1)

# Minimal helper control check
CONTROL_PATH = os.path.join(RUN_FOLDER, 'control.json')

def should_continue():
    try:
        with open(CONTROL_PATH, 'r') as f:
            ctrl = json.load(f)
            state = ctrl.get('state','running')
            if state == 'stopped':
                return False
            if state == 'paused':
                # sleep until resumed or stopped
                while True:
                    time.sleep(1)
                    with open(CONTROL_PATH, 'r') as f2:
                        ctrl2 = json.load(f2)
                        if ctrl2.get('state') == 'running':
                            break
                        if ctrl2.get('state') == 'stopped':
                            return False
                return True
            return True
    except Exception:
        return True

# --- Load CSV and validate ---
required_columns = ["offer_id", "voucher_value", "expiry_date", "voucher_code", "rzp_commission"]
optional_columns = ["pin"]

with open(RAW_CSV_PATH, mode='r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    headers = reader.fieldnames
    if not headers:
        print('Error: CSV file is empty or has no headers')
        sys.exit(1)
    missing_columns = [col for col in required_columns if col not in headers]
    if missing_columns:
        print(f"Error: Required columns missing from CSV: {', '.join(missing_columns)}")
        sys.exit(1)

# prepare vouchers list
vouchers_list = []
with open(RAW_CSV_PATH, mode='r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        voucher = {
            "offer_id": row['offer_id'].strip(),
            "voucher_type": "VOUCHER_TYPE_PERSONALISED",
            "voucher_status": "VOUCHER_BENEFIT_STATUS_UNCLAIMED",
            "voucher_value": int(row['voucher_value'].strip()),
            "expiry_date": int(row['expiry_date'].strip()),
            "voucher_code": row['voucher_code'].strip(),
            "rzp_commission": int(row['rzp_commission'].strip())
        }
        if 'pin' in row and row['pin'].strip():
            voucher['pin'] = row['pin'].strip()
        vouchers_list.append((row, voucher))

print(f"Preparing to upload {len(vouchers_list)} vouchers")

# per-row result containers
results = []
failed = []

MAX_WORKERS = 3
REQUESTS_PER_SECOND = 3
CHUNK_SIZE = 50
MAX_RETRIES = 3
SLEEP_TIME = 1.0 / REQUESTS_PER_SECOND

request_semaphore = threading.Semaphore(REQUESTS_PER_SECOND)

# headers
AUTH_TOKEN = base64.b64encode(f"{USERNAME}:{PASSWORD}".encode()).decode()
HEADERS = {
    "X-User-Type": "advertiser",
    "X-User-Id": "rzp.merchant.MK6oPUp488NKF6",
    "Content-Type": "application/json",
    "Authorization": f"Basic {AUTH_TOKEN}"
}

import requests

def upload_voucher(data_tuple):
    if not should_continue():
        return None
    row, voucher_data = data_tuple
    result = { **row, 'success': False, 'error_message': '', 'retry_count': 0 }
    payload = { 'voucher_benefits': [voucher_data] }
    for retry in range(MAX_RETRIES):
        if not should_continue():
            return None
        try:
            with request_semaphore:
                response = requests.post(f"{API_BASE_URL}{API_ENDPOINT}", headers=HEADERS, json=payload)
                time.sleep(SLEEP_TIME)
            result['retry_count'] = retry+1
            result['status_code'] = response.status_code
            result['full_response'] = response.text
            if response.status_code == 200:
                result['success'] = True
                print(f"✅ SUCCESS - {voucher_data['voucher_code']}")
                return result
            elif response.status_code == 429:
                print('Rate limit hit, retrying...')
                time.sleep(SLEEP_TIME * 5)
            else:
                if retry < MAX_RETRIES - 1:
                    print(f"Retry {retry+1}/{MAX_RETRIES}")
                    time.sleep(SLEEP_TIME * 2)
                else:
                    result['error_message'] = response.text
                    print(f"❌ FAILED - {voucher_data['voucher_code']} - {response.text}")
                    return result
        except Exception as e:
            if retry == MAX_RETRIES - 1:
                result['error_message'] = str(e)
                print(f"❌ ERROR - {voucher_data['voucher_code']} - {str(e)}")
                return result
            else:
                print(f"Retry due to error: {str(e)}")
                time.sleep(SLEEP_TIME * 2)
    return result

import concurrent.futures

def process_chunk(chunk):
    with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as ex:
        for r in ex.map(upload_voucher, chunk):
            if r is None:
                # paused/stopped
                continue
            results.append(r)
            if not r.get('success'):
                failed.append(r)

start_time = time.time()
current_chunk = []
processed_count = 0

for index, data_tuple in enumerate(vouchers_list):
    current_chunk.append(data_tuple)
    if len(current_chunk) >= CHUNK_SIZE:
        process_chunk(current_chunk)
        processed_count += len(current_chunk)
        print(f"Progress: {processed_count}/{len(vouchers_list)}")
        current_chunk = []
        # check control state
        if not should_continue():
            break

if current_chunk:
    process_chunk(current_chunk)

# write outputs
base_name = os.path.splitext(os.path.basename(RAW_CSV_PATH))[0]
output_file = os.path.join(RUN_FOLDER, f"{base_name}_upload_results.csv")
failed_file = os.path.join(RUN_FOLDER, f"{base_name}_failed_uploads.csv")

if results:
    keys = list(results[0].keys())
    with open(output_file, 'w', newline='', encoding='utf-8') as fout:
        writer = csv.DictWriter(fout, fieldnames=keys)
        writer.writeheader()
        writer.writerows(results)

if failed:
    keys = list(failed[0].keys())
    with open(failed_file, 'w', newline='', encoding='utf-8') as fout:
        writer = csv.DictWriter(fout, fieldnames=keys)
        writer.writeheader()
        writer.writerows(failed)

print('\nUpload Summary:')
print(f"Total: {len(vouchers_list)}, Success: {len([r for r in results if r.get('success')])}, Failed: {len(failed)}")
print(f"Results saved to: {output_file}")
if failed:
    print(f"Failed uploads saved to: {failed_file}")

