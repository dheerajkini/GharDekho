import os

base_dir = r"C:\Users\Dheer\.gemini\antigravity\brain"
matches = []

for root, dirs, files in os.walk(base_dir):
    for file in files:
        if file.endswith('.txt') or file.endswith('.md') or file.endswith('.json'):
            filepath = os.path.join(root, file)
            try:
                with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                idx = content.find("function VastuOverlay")
                if idx != -1:
                    matches.append((filepath, idx))
            except:
                pass

with open('vastu_raw_matches.txt', 'w', encoding='utf-8') as out:
    out.write(f"Found {len(matches)} files:\n")
    for filepath, idx in matches:
        out.write(f"\n=====================================\nFILE: {filepath}\n")
        try:
            with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                file_content = f.read()
            out.write(file_content[idx:idx+3500])
        except Exception as e:
            out.write(f"ERROR: {e}\n")
        out.write("\n=====================================\n")

print("Wrote matches to vastu_raw_matches.txt")
