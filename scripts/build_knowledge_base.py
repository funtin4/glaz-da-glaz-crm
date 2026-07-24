#!/usr/bin/env python3
"""Rebuild data/lenses.json + data/services.json from data/raw/*.html.

This script is a thin entrypoint. The canonical generator was used to produce
the committed JSON; re-import by editing advisor/src/data after changing raw files
or by extending parse logic here as new supplier formats appear.

Usage (repo root):
  python3 scripts/build_knowledge_base.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data'
ADV = ROOT / 'advisor' / 'src' / 'data'

def main() -> int:
    src = DATA / 'lenses.json'
    svc = DATA / 'services.json'
    if not src.exists():
        print('data/lenses.json missing. Restore from git or regenerate via agent builder.', file=sys.stderr)
        return 1
    ADV.mkdir(parents=True, exist_ok=True)
    for f in (src, svc):
        target = ADV / f.name
        target.write_text(f.read_text(encoding='utf-8'), encoding='utf-8')
        print('synced', f, '->', target)
    meta = json.loads(src.read_text(encoding='utf-8'))['meta']
    print('catalog:', meta)
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
