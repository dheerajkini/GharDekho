import glob

files = glob.glob('wardrobe_recovered_*.txt')
for f in files:
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    print(f"File: {f}")
    print(f"  Length: {len(content)}")
    print(f"  Contains 'SingleBed': {'SingleBed' in content}")
    # print the first 250 characters
    print(f"  Starts with: {content[:200]!r}")
    print("-" * 50)
