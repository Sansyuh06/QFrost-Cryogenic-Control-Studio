import os

source_path = 'frontend/qfrost_system_wide_polish/code.html'
dest_path = 'frontend/index.html'

with open(source_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Inject mockup_integration.js before </body>
content = content.replace('</body>', '<script src="mockup_integration.js"></script>\n</body>')

# Update links
content = content.replace('href="#"', 'href="javascript:void(0)"') # disable all empty links first

# Then explicitly re-enable the ones we want by patching the whole blocks
# Or using a simple regex/replace. Let's just find the text and replace the href before it.
# Dashboard
content = content.replace(
    '<a class="flex items-center gap-md px-sm py-sm text-primary bg-surface-container-highest border-l-2 border-primary transition-all duration-150" href="javascript:void(0)">\n<span class="material-symbols-outlined" style="font-variation-settings: \'FILL\' 1;">dashboard</span>',
    '<a class="flex items-center gap-md px-sm py-sm text-primary bg-surface-container-highest border-l-2 border-primary transition-all duration-150" href="index.html">\n<span class="material-symbols-outlined" style="font-variation-settings: \'FILL\' 1;">dashboard</span>'
)

# Vacuum Control
content = content.replace(
    '<a class="flex items-center gap-md px-sm py-sm text-text-muted hover:text-text-main hover:bg-surface-container hover:border-l-2 hover:border-text-muted border-l-2 border-transparent transition-all duration-150" href="javascript:void(0)">\n<span class="material-symbols-outlined">vacuum</span>',
    '<a class="flex items-center gap-md px-sm py-sm text-text-muted hover:text-text-main hover:bg-surface-container hover:border-l-2 hover:border-text-muted border-l-2 border-transparent transition-all duration-150" href="vacuum_control/code.html">\n<span class="material-symbols-outlined">vacuum</span>'
)

# Analytics
content = content.replace(
    '<a class="flex items-center gap-md px-sm py-sm text-text-muted hover:text-text-main hover:bg-surface-container hover:border-l-2 hover:border-text-muted border-l-2 border-transparent transition-all duration-150" href="javascript:void(0)">\n<span class="material-symbols-outlined">monitoring</span>',
    '<a class="flex items-center gap-md px-sm py-sm text-text-muted hover:text-text-main hover:bg-surface-container hover:border-l-2 hover:border-text-muted border-l-2 border-transparent transition-all duration-150" href="system_analytics/code.html">\n<span class="material-symbols-outlined">monitoring</span>'
)

# System Config
content = content.replace(
    '<a class="flex items-center gap-md px-sm py-sm text-text-muted hover:text-text-main hover:bg-surface-container hover:border-l-2 hover:border-text-muted border-l-2 border-transparent transition-all duration-150" href="javascript:void(0)">\n<span class="material-symbols-outlined">settings_input_component</span>',
    '<a class="flex items-center gap-md px-sm py-sm text-text-muted hover:text-text-main hover:bg-surface-container hover:border-l-2 hover:border-text-muted border-l-2 border-transparent transition-all duration-150" href="system_configuration/code.html">\n<span class="material-symbols-outlined">settings_input_component</span>'
)

with open(dest_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated index.html")
