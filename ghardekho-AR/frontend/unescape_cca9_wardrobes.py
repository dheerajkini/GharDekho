def decode_log_file(in_path, out_path):
    with open(in_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    text = content
    text = text.replace('\\\\n', '\n')
    text = text.replace('\\\\"', '"')
    text = text.replace('\\\\/', '/')
    text = text.replace('\\\\t', '\t')
    text = text.replace('\\\\\'', "'")
    text = text.replace('\\\\', '\\')
    text = text.replace('\\n', '\n')
    text = text.replace('\\"', '"')
    text = text.replace('\\t', '\t')
    text = text.replace('\\\'', "'")
        
    with open(out_path, 'w', encoding='utf-8') as f_out:
        f_out.write(text)
    print(f"Decoded {in_path} to {out_path}")

decode_log_file('wardrobe_cca9_0.txt', 'wardrobe_cca9_0_decoded.jsx')
decode_log_file('wardrobe_cca9_1.txt', 'wardrobe_cca9_1_decoded.jsx')
