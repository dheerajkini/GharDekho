import os

filepath = r"C:\Users\Dheer\.gemini\antigravity\brain\cca9c48f-1cc3-4157-a613-949a3abf2f88\.system_generated\logs\overview.txt"

if os.path.exists(filepath):
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    idx = 0
    occurrences = []
    while True:
        idx = content.find("function Wardrobe", idx)
        if idx == -1:
            break
        occurrences.append(idx)
        idx += 1

    print(f"Found {len(occurrences)} occurrences in cca9c48f")
    for i, o_idx in enumerate(occurrences):
        snippet = content[o_idx:o_idx+12000]
        with open(f"wardrobe_cca9_{i}.txt", "w", encoding="utf-8") as out:
            out.write(snippet)
        print(f"Saved occurrence {i} to wardrobe_cca9_{i}.txt")
else:
    print("Log not found")
