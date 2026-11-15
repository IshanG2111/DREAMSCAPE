from pathlib import Path
import re

html = Path("index.html").read_text(encoding="utf-8")
matches = re.findall(r'src=["\']([^"\']+)["\']', html)
for src in matches:
    if not src.startswith("http"):
        p = Path(src)
        print(f"{src}: exists={p.exists()}")
print("All script tags scanned successfully.")
