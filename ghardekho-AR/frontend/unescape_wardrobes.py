import json
import re

def decode_log_file(in_path, out_path):
    with open(in_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Unescape common JSON escapes
    # Since it might be multiple levels of escaping (e.g. \\\\n or \\n)
    # Let's replace \\\\ with \\, and then decode
    # But actually we can just use python's codec escape or parse it as a string
    # Let's clean it up:
    # First, let's turn double backslashes into single ones
    text = content
    # Let's unescape using json.loads of a double quoted string if possible, or simple regex
    # Since it starts with: function Wardrobe({ w, d, color, sel }) {\\n
    # let's wrap it in a JSON string literal and decode it:
    try:
        # Wrap in quotes and load as JSON to unescape
        # But we must escape actual quotes inside it if they are not already escaped.
        # Since it is a slice, let's do a simple replace first:
        # Unescape \\\" to \", \\n to \n, etc.
        text = text.replace('\\\\n', '\n')
        text = text.replace('\\\\"', '"')
        text = text.replace('\\\\/', '/')
        text = text.replace('\\\\t', '\t')
        text = text.replace('\\\\\'', "'")
        text = text.replace('\\\\', '\\')
        
        # Second pass in case there are single escapes left
        text = text.replace('\\n', '\n')
        text = text.replace('\\"', '"')
        text = text.replace('\\t', '\t')
        text = text.replace('\\\'', "'")
    except Exception as e:
        print(f"Error decoding {in_path}: {e}")
        
    with open(out_path, 'w', encoding='utf-8') as f_out:
        f_out.write(text)
    print(f"Decoded {in_path} to {out_path}")

decode_log_file('wardrobe_recovered_0.txt', 'wardrobe_0_decoded.jsx')
decode_log_file('wardrobe_recovered_2.txt', 'wardrobe_2_decoded.jsx')
