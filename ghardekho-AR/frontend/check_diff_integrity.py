with open('diff_canvas3d_utf8.txt', 'r', encoding='utf-8-sig') as f:
    lines = f.readlines()

for idx, line in enumerate(lines):
    if 'FurnitureMesh' in line:
        print(f"Found on line {idx+1}: {line.strip()}")
        # print 15 lines before and after
        start = max(0, idx - 15)
        end = min(len(lines), idx + 15)
        for i in range(start, end):
            print(f"{i+1}: {lines[i].rstrip()}")
