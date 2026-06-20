import os

filepath = r"C:\Users\Dheer\.gemini\antigravity\brain\cca9c48f-1cc3-4157-a613-949a3abf2f88\.system_generated\logs\overview.txt"

if os.path.exists(filepath):
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        lines = f.readlines()
    
    matches = []
    for idx, line in enumerate(lines):
        if "vastu" in line.lower():
            matches.append((idx+1, line.strip()))
            
    print(f"Found {len(matches)} lines containing 'vastu':")
    for m in matches[:20]:
        print(f"Line {m[0]}: {m[1][:100]}")
else:
    print("File not found!")
