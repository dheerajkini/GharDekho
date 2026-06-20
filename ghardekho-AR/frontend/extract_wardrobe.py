import os

filepath = r"C:\Users\Dheer\.gemini\antigravity\brain\e2e8450b-27ff-4e0d-9ac1-3751c9d306f9\.system_generated\logs\overview.txt"

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

    print(f"Found {len(occurrences)} occurrences of function Wardrobe")
    for i, o_idx in enumerate(occurrences):
        snippet = content[o_idx:o_idx+8000]
        with open(f"wardrobe_recovered_{i}.txt", "w", encoding="utf-8") as out:
            out.write(snippet)
        print(f"Saved occurrence {i} to wardrobe_recovered_{i}.txt")
else:
    print("Log not found")
