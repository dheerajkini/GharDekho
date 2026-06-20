import os

base_dir = r"C:\Users\Dheer\.gemini\antigravity\brain"
matches = []

for root, dirs, files in os.walk(base_dir):
    for file in files:
        if file.endswith('.txt') or file.endswith('.md'):
            filepath = os.path.join(root, file)
            try:
                with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                if 'fontSize: "10px"' in content:
                    idx = content.find('fontSize: "10px"')
                    matches.append((filepath, idx))
            except:
                pass

print(f"Found {len(matches)} files containing 'fontSize: \"10px\"':")
for filepath, idx in matches:
    print(f"\n====================================\nFILE: {filepath}\n")
    # print 1200 characters following the match
    print(content[idx:idx+1200])
