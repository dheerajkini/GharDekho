import os

filepath = r"C:\Users\Dheer\.gemini\antigravity\brain\e2e8450b-27ff-4e0d-9ac1-3751c9d306f9\.system_generated\logs\overview.txt"

with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Let's find occurrences of function VastuOverlay
idx = 0
occurrences = []
while True:
    idx = content.find("function VastuOverlay", idx)
    if idx == -1:
        break
    occurrences.append(idx)
    idx += 1

print(f"Found {len(occurrences)} occurrences")

# We want the longest continuous definition that was added/modified or has the full code.
# Let's output 8000 characters for the last occurrence to see if it contains the full function.
if occurrences:
    last_idx = occurrences[-1]
    with open('vastu_overlay_recovered.txt', 'w', encoding='utf-8') as out:
        out.write(content[last_idx:last_idx+8000])
    print("Wrote last occurrence to vastu_overlay_recovered.txt")
