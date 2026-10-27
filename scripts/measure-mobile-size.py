#!/usr/bin/env python3
"""Read-only size inventory. Source-map source bytes are not compressed bundle bytes.

Example: python3 scripts/measure-mobile-size.py --export-dir /tmp/export --output /tmp/size.json
Optional --source-map and --artifact (AAB/APK) add attribution and ZIP breakdowns.
"""
import argparse
from collections import defaultdict
import hashlib
import json
from pathlib import Path
import re
import struct
import zipfile

ROOT = Path(__file__).resolve().parents[1]
MOBILE = ROOT / "mobile-app"
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--export-dir", type=Path, required=True)
parser.add_argument("--source-map", type=Path)
parser.add_argument("--artifact", type=Path)
parser.add_argument("--output", type=Path, required=True)
args = parser.parse_args()

def digest(data):
    return hashlib.sha256(data).hexdigest()

def package_name(source):
    source = source.replace("\\", "/")
    if "node_modules/" not in source:
        return "application"
    parts = source.rsplit("node_modules/", 1)[1].split("/")
    return "/".join(parts[:2]) if parts[0].startswith("@") else parts[0]

metadata = json.loads((args.export_dir / "metadata.json").read_text())["fileMetadata"]["android"]
bundle = args.export_dir / metadata["bundle"]
assets = []
# Resolve hashed export assets back to their source names without changing them.
source_names = defaultdict(list)
for directory in [MOBILE / "assets", MOBILE / "node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts",
                  MOBILE / "node_modules/@react-navigation/elements/lib/module/assets"]:
    for source in directory.rglob("*"):
        if source.is_file():
            source_names[digest(source.read_bytes())].append(str(source.relative_to(MOBILE)))
totals = defaultdict(int)
for entry in metadata["assets"]:
    path = args.export_dir / entry["path"]
    data = path.read_bytes()
    item = {"path": entry["path"], "extension": entry["ext"], "bytes": len(data),
            "sha256": digest(data), "sources": source_names[digest(data)]}
    assets.append(item)
    totals[entry["ext"]] += len(data)

texts = {}
for source in MOBILE.rglob("*"):
    relative = source.relative_to(MOBILE)
    if any(part in {"node_modules", ".expo", ".git"} for part in relative.parts):
        continue
    if source.is_file() and source.suffix in {".ts", ".tsx", ".js", ".json", ".cjs"}:
        texts[str(relative)] = source.read_text(errors="replace")
large_media = []
extensions = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".ttf", ".otf", ".mp4", ".mov", ".mp3", ".wav", ".m4a"}
for source in (MOBILE / "assets").rglob("*"):
    if not source.is_file() or source.suffix.lower() not in extensions or source.stat().st_size <= 100_000:
        continue
    data = source.read_bytes()
    dimensions = list(struct.unpack(">II", data[16:24])) if data[:8] == b"\x89PNG\r\n\x1a\n" else None
    name = str(source.relative_to(MOBILE))
    references = [f"{file}:{number}" for file, content in texts.items()
                  for number, line in enumerate(content.splitlines(), 1) if name in line]
    large_media.append({"path": name, "bytes": len(data), "dimensions": dimensions,
                        "sha256": digest(data), "references": references})

manifest = json.loads((MOBILE / "package.json").read_text())
dependencies = []
for name in manifest["dependencies"]:
    directory = MOBILE / "node_modules" / name
    installed = json.loads((directory / "package.json").read_text())
    dependencies.append({"name": name, "version": installed["version"],
                         "nativeDirectory": (directory / "android").is_dir(),
                         "expoModule": (directory / "expo-module.config.json").exists()})
result = {"method": "Expo production Android export; no source maps for canonical HBC size",
          "bundleBytes": bundle.stat().st_size, "bundleSha256": digest(bundle.read_bytes()),
          "assetBytes": sum(totals.values()), "assetBytesByExtension": dict(totals),
          "assetCount": len(assets), "assets": sorted(assets, key=lambda x: -x["bytes"]),
          "sourceMediaOver100KB": large_media, "dependencies": dependencies,
          "nativeArtifact": None}
if args.source_map:
    groups = defaultdict(int)
    source_map = json.loads(args.source_map.read_text())
    def count_sources(sm):
        for source, content in zip(sm.get("sources", []), sm.get("sourcesContent", [])):
            groups[package_name(source)] += len((content or "").encode())
        for section in sm.get("sections", []):
            count_sources(section["map"])
    count_sources(source_map)
    result["analyzer"] = {"method": "source-map sourcesContent UTF-8 bytes (attribution only)",
                          "packages": sorted(({"name": name, "sourceBytes": size} for name, size in groups.items()),
                                             key=lambda x: -x["sourceBytes"])}
if args.artifact:
    categories = defaultdict(int)
    libraries = []
    with zipfile.ZipFile(args.artifact) as archive:
        items = []
        for entry in archive.infolist():
            if entry.is_dir():
                continue
            name = entry.filename
            category = ("native" if name.endswith(".so") else "dex" if name.endswith(".dex") else
                        "bundle" if name.endswith((".hbc", ".bundle")) else
                        "assets" if "/assets/" in "/" + name else "resources/metadata")
            categories[category] += entry.file_size
            item = {"path": name, "bytes": entry.file_size, "zipBytes": entry.compress_size}
            items.append(item)
            if name.endswith(".so"):
                libraries.append(item)
    result["nativeArtifact"] = {"file": args.artifact.name, "bytes": args.artifact.stat().st_size,
                                "sha256": digest(args.artifact.read_bytes()), "uncompressedCategories": dict(categories),
                                "nativeLibraries": libraries, "largest15": sorted(items, key=lambda x: -x["bytes"])[:15]}
args.output.parent.mkdir(parents=True, exist_ok=True)
args.output.write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps({key: result[key] for key in ["bundleBytes", "assetBytes", "assetBytesByExtension", "assetCount"]}))
