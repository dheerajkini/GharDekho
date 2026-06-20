import os

filepath = r"C:\Users\Dheer\.gemini\antigravity\brain\40d223dd-9735-4d1c-abea-fb090f60a84e\.system_generated\logs\overview.txt"

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

    print(f"Found {len(occurrences)} occurrences in 40d223dd")
    for i, o_idx in enumerate(occurrences):
        snippet = content[o_idx:o_idx+4000]
        # Check if it has the closing tags (i.e. return ( ... ) )
        if "return (" in snippet and "FurnitureMesh" in snippet:
            print(f"Occurrence {i} is complete! Writing to vastu_recovered_40d223dd.txt")
            with open('vastu_recovered_40d223dd.txt', 'w', encoding='utf-8') as out:
                out.write(snippet)
            break
        else:
            print(f"Occurrence {i} is incomplete (length {len(snippet)}).")
            # Let's save a larger block just in case
            with open(f'vastu_occ_{i}.txt', 'w', encoding='utf-8') as out:
                out.write(content[o_idx:o_idx+8000])
else:
    print("Log file not found!")
