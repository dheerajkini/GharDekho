import os
import json

filepath = r"C:\Users\Dheer\.gemini\antigravity\brain\e2e8450b-27ff-4e0d-9ac1-3751c9d306f9\.system_generated\logs\overview.txt"

if os.path.exists(filepath):
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        lines = f.readlines()
    
    print(f"Read {len(lines)} lines")
    for idx, line in enumerate(lines):
        if "Canvas3D.jsx" in line and "write_to_file" in line:
            print(f"Line {idx+1} contains both. Length: {len(line)}")
            # Try parsing
            try:
                data = json.loads(line.strip())
                # Print keys
                print("  Keys:", data.keys())
                if "tool_calls" in data:
                    for tc in data["tool_calls"]:
                        print(f"    Tool: {tc.get('name')}, TargetFile: {tc.get('args', {}).get('TargetFile')}")
            except Exception as e:
                print("  JSON parse error:", e)
else:
    print("Log not found")
