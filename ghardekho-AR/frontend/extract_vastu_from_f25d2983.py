import os

filepath = r"C:\Users\Dheer\.gemini\antigravity\brain\f25d2983-1baa-4a42-9a3b-83732d0a7b4a\.system_generated\logs\overview.txt"

if os.path.exists(filepath):
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    idx = 0
    occurrences = []
    while True:
        idx = content.find("function VastuOverlay", idx)
        if idx == -1:
            break
        occurrences.append(idx)
        idx += 1

    print(f"Found {len(occurrences)} occurrences in f25d2983")
    for i, o_idx in enumerate(occurrences):
        # Let's save a large block (12000 characters) to check if it's the full code
        snippet = content[o_idx:o_idx+12000]
        with open(f'vastu_f25_occ_{i}.txt', 'w', encoding='utf-8') as out:
            out.write(snippet)
        print(f"Saved occurrence {i} to vastu_f25_occ_{i}.txt")
else:
    print("Log file not found!")
