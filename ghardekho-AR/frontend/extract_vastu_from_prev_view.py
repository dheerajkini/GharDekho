import os

filepath = r"C:\Users\Dheer\.gemini\antigravity\brain\cca9c48f-1cc3-4157-a613-949a3abf2f88\.system_generated\logs\overview.txt"

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

print(f"Found {len(occurrences)} occurrences of 'function VastuOverlay'")

# Output a large snippet for each occurrence to see which one is complete
for i, o_idx in enumerate(occurrences):
    snippet = content[o_idx:o_idx+4000]
    # Look for the definition end or FurnitureMesh
    print(f"Occurrence {i} starts with: {snippet[:200]!r}")
    if "FurnitureMesh" in snippet:
        print(f"Occurrence {i} contains FurnitureMesh!")
        with open(f"vastu_overlay_view_{i}.txt", "w", encoding="utf-8") as out:
            out.write(snippet)
        print(f"Saved to vastu_overlay_view_{i}.txt")
