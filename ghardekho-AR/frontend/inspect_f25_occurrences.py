import glob

files = glob.glob('vastu_f25_occ_*.txt')
for f in files:
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    print(f"File: {f}")
    print(f"  Length: {len(content)}")
    print(f"  Contains 'FurnitureMesh': {'FurnitureMesh' in content}")
    # print the first 200 characters to see what it starts with
    print(f"  Starts with: {content[:150]!r}")
    print("-" * 40)
