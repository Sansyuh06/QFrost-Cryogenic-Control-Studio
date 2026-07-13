import os
import re

dir_path = r"d:\fyeshi\project\quantum\Cryo\frontend\src\components"

for fname in os.listdir(dir_path):
    if fname.endswith('.jsx'):
        fpath = os.path.join(dir_path, fname)
        with open(fpath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # Replace <a ... href="#"> with <Link ... to="/analytics">
        content = re.sub(r'<a([^>]*?)href="#"', r'<Link\1to="/analytics"', content)
        
        # We also need to change </a> to </Link> but only for the ones we changed.
        # Actually, in these files, ALL </a> tags belong to the footer links. So replacing all </a> is fine.
        content = content.replace('</a>', '</Link>')
        
        with open(fpath, 'w', encoding='utf-8') as f:
            f.write(content)

print("Fixed links!")
