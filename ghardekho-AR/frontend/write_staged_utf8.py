import subprocess

# Run git show and capture raw bytes
result = subprocess.run(['git', 'show', ':src/components/Canvas3D.jsx'], capture_output=True)
raw_bytes = result.stdout

# Check if it starts with UTF-16 BOM
if raw_bytes.startswith(b'\xff\xfe') or raw_bytes.startswith(b'\xfe\xff'):
    content = raw_bytes.decode('utf-16')
else:
    # Try decoding as utf-8, fallback to latin1
    try:
        content = raw_bytes.decode('utf-8')
    except:
        content = raw_bytes.decode('latin1')

print("Decoded content length:", len(content))
print("Lines count:", len(content.splitlines()))
print("Has VastuOverlay:", "VastuOverlay" in content)
print("Has Wardrobe:", "Wardrobe" in content)

# Write to a clean utf-8 file
with open('staged_correct_canvas3d_utf8.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Saved clean UTF-8 copy as staged_correct_canvas3d_utf8.jsx")
