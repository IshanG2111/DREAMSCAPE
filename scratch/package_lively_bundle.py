import zipfile
from pathlib import Path

def create_lively_packages():
    dist_html = Path("dist/index.html")
    if not dist_html.exists():
        print("dist/index.html does not exist. Please run 'pnpm run build' first.")
        return

    info_json = Path("LivelyInfo.json")
    if not info_json.exists():
        print("LivelyInfo.json not found.")
        return

    targets = ["Dreamscape.zip", "Dreamscape.lively"]
    for target in targets:
        with zipfile.ZipFile(target, "w", compression=zipfile.ZIP_DEFLATED) as z:
            # Write singlefile html as index.html in the archive root
            z.write(dist_html, arcname="index.html")
            z.write(info_json, arcname="LivelyInfo.json")
        print(f"Successfully packaged {target} with single-file bundle.")

if __name__ == "__main__":
    create_lively_packages()
