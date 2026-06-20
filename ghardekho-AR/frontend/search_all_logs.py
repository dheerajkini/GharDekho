import os

base_dir = r"C:\Users\Dheer\.gemini\antigravity\brain"

for root, dirs, files in os.walk(base_dir):
    for file in files:
        if file.endswith('.txt') or file.endswith('.md') or file.endswith('.jsx'):
            filepath = os.path.join(root, file)
            try:
                with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                
                # Look for JavaScript definition function VastuOverlay
                target = "function VastuOverlay("
                idx = content.find(target)
                while idx != -1:
                    # Let's verify it looks like a JavaScript function definition
                    snippet = content[idx:idx+2500]
                    if "return" in snippet and "Html" in snippet:
                        print(f"FOUND IN {filepath}:")
                        print(snippet)
                        print("===================================\n")
                        break
                    idx = content.find(target, idx + 1)
            except Exception as e:
                pass
