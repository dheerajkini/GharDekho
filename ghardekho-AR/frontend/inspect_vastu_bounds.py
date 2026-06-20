with open('src/components/Canvas3D.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

v_idx = content.find('function VastuOverlay(')
f_idx = content.find('function FurnitureMesh(')

with open('vastu_bounds_output.txt', 'w', encoding='utf-8') as f:
    if v_idx != -1 and f_idx != -1:
        f.write(f"VastuOverlay block length: {f_idx - v_idx}\n")
        f.write("VastuOverlay snippet:\n")
        f.write(content[v_idx:v_idx+500])
        f.write("\n...\n")
        f.write("FurnitureMesh snippet (preceding lines):\n")
        f.write(content[f_idx-500:f_idx])
    else:
        f.write(f"Could not find signatures: VastuOverlay={v_idx}, FurnitureMesh={f_idx}\n")

print("Wrote output to vastu_bounds_output.txt")
