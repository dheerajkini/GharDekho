import os

log_path = r"C:\Users\Dheer\.gemini\antigravity\brain\cca9c48f-1cc3-4157-a613-949a3abf2f88\.system_generated\logs\overview.txt"

if os.path.exists(log_path):
    with open(log_path, 'r', encoding='utf-8', errors='replace') as f:
        content = f.read()
    
    # Search for VastuOverlay
    idx = 0
    matches = []
    while True:
        idx = content.find("function VastuOverlay", idx)
        if idx == -1:
            break
        matches.append(idx)
        idx += 1
        
    print(f"Found {len(matches)} occurrences of 'function VastuOverlay'")
    # Print a snippet of the last occurrence
    if matches:
        last_idx = matches[-1]
        print("Last occurrence:")
        print(content[last_idx:last_idx+2000])
else:
    print(f"Log path does not exist: {log_path}")
