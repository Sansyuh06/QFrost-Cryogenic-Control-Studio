import os
import re

dir_path = r"d:\fyeshi\project\quantum\Cryo\frontend\src\components"
new_links = """
<Link className="flex items-center gap-md px-sm py-sm text-text-muted hover:text-text-main hover:bg-surface-container transition-colors duration-150 rounded" to="/circuit">
<span aria-hidden="true" className="material-symbols-outlined text-[20px]">route</span>
<span className="font-label-caps text-label-caps">Circuit Orchestrator</span>
</Link>
<Link className="flex items-center gap-md px-sm py-sm text-text-muted hover:text-text-main hover:bg-surface-container transition-colors duration-150 rounded" to="/studio">
<span aria-hidden="true" className="material-symbols-outlined text-[20px]">grid_on</span>
<span className="font-label-caps text-label-caps">Decoder Studio</span>
</Link>
"""

# Regex to find the <Link ... to="/config">...</Link> block
pattern = re.compile(r'(<Link[^>]*to="/config"[^>]*>.*?</Link>)', re.DOTALL)

# Let's also remove any existing /circuit or /studio links so we don't duplicate
remove_circuit = re.compile(r'<Link[^>]*to="/circuit"[^>]*>.*?</Link>\s*', re.DOTALL)
remove_studio = re.compile(r'<Link[^>]*to="/studio"[^>]*>.*?</Link>\s*', re.DOTALL)

for fname in os.listdir(dir_path):
    if fname.endswith(".jsx"):
        fpath = os.path.join(dir_path, fname)
        with open(fpath, "r", encoding="utf-8") as f:
            content = f.read()
            
        content = remove_circuit.sub('', content)
        content = remove_studio.sub('', content)
        
        def replacer(match):
            return match.group(1) + "\n" + new_links.strip() + "\n"

        new_content = pattern.sub(replacer, content)
        
        if new_content != content:
            print(f"Updated {fname}")
            with open(fpath, "w", encoding="utf-8") as f:
                f.write(new_content)
