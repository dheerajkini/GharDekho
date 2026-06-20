import os
import json

log_paths = [
    r"C:\Users\Dheer\.gemini\antigravity\brain\e2e8450b-27ff-4e0d-9ac1-3751c9d306f9\.system_generated\logs\overview.txt",
    r"C:\Users\Dheer\.gemini\antigravity\brain\40d223dd-9735-4d1c-abea-fb090f60a84e\.system_generated\logs\overview.txt",
    r"C:\Users\Dheer\.gemini\antigravity\brain\f25d2983-1baa-4a42-9a3b-83732d0a7b4a\.system_generated\logs\overview.txt",
]

found = False
for filepath in log_paths:
    if not os.path.exists(filepath):
        continue
    print(f"Checking {filepath}...")
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    # Let's search for "write_to_file" or "replace_file_content"
    # We want a very large block of code
    idx = 0
    while True:
        idx = content.find('"write_to_file"', idx)
        if idx == -1:
            break
        # Let's see if the arguments contain Canvas3D.jsx and have a large size
        snippet = content[idx:idx+150000] # read up to 150kb
        if "Canvas3D.jsx" in snippet and len(snippet) > 50000:
            print(f"Found a potential write_to_file call in {filepath} at index {idx}!")
            # Let's extract the JSON block
            # The line is usually JSON: {"step_index":..., "tool_calls":[...]}
            # Let's find the start of the line: find the last newline before idx
            line_start = content.rfind("\n", 0, idx)
            if line_start == -1:
                line_start = 0
            # Find the end of the line: find the first newline after idx
            line_end = content.find("\n", idx)
            if line_end == -1:
                line_end = len(content)
            
            line_text = content[line_start:line_end].strip()
            try:
                data = json.loads(line_text)
                # Let's find the write_to_file tool call and extract CodeContent
                for tool in data.get("tool_calls", []):
                    if tool.get("name") == "write_to_file" and "Canvas3D.jsx" in tool.get("args", {}).get("TargetFile", ""):
                        code = tool["args"]["CodeContent"]
                        with open("recovered_Canvas3D.jsx", "w", encoding="utf-8") as out:
                            out.write(code)
                        print("RECOVERED FULL FILE successfully to recovered_Canvas3D.jsx!")
                        found = True
                        break
            except Exception as e:
                print("Failed to parse JSON line:", e)
                # Fallback: let's save the raw line to a file
                with open("failed_line.txt", "w", encoding="utf-8") as out:
                    out.write(line_text)
                print("Saved raw line to failed_line.txt")
            if found:
                break
        idx += 1
    if found:
        break
