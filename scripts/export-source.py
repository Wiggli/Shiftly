#!/usr/bin/env python3
"""Export tracked Shiftly source, rejecting secrets and generated artifacts."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parent.parent
EXCLUDED_DIRS = {'node_modules', 'dist', '.next', '.vinext', '.wrangler', '.runtime', '.git', 'tool-state', 'coverage', 'outputs', 'work', '__pycache__'}
SECRET_PATTERNS = [
    rb'gh[pousr]_[A-Za-z0-9]{30,}',
    rb'github_pat_[A-Za-z0-9_]{30,}',
    rb'AKIA[A-Z0-9]{16}',
    rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----',
    rb'eyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}',
    rb'''(?i)(?:password|secret|api[_-]?key|access[_-]?token)\s*[:=]\s*["'][A-Za-z0-9_/-]{24,}["']''',
]

def excluded(name):
    path = Path(name)
    return (any(part in EXCLUDED_DIRS for part in path.parts)
            or any(part.startswith('.env') for part in path.parts)
            or name.startswith('public/offline-assets/')
            or path.name.endswith(('.tsbuildinfo', '.pem', '.key', '.p12', '.pfx', '.sqlite', '.sqlite3', '.db', '.log', '.zip', '.tar', '.gz')))

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('archive', type=Path)
    args = parser.parse_args()
    names = subprocess.check_output(['git', 'ls-files', '-z'], cwd=ROOT).decode().split('\0')
    # Compare against local dotenv values without exporting or reporting them.
    env_values = []
    for env_file in ROOT.glob('.env*'):
        if env_file.is_file():
            for line in env_file.read_text().splitlines():
                match = re.match(r'(?:export\s+)?[A-Za-z_][\w]*\s*=\s*(.*)', line.strip())
                if match:
                    value = match[1].strip().strip('"\'')
                    if len(value) >= 8 and not value.startswith(('#', '${')):
                        env_values.append(value.encode())
    contents = {}
    for name in sorted(set(names)):
        if not name or excluded(name):
            continue
        path = ROOT / name
        if path.is_symlink():
            raise SystemExit(f'Export refused: symlink {name}')
        payload = path.read_bytes()
        if any(re.search(pattern, payload) for pattern in SECRET_PATTERNS) or any(value in payload for value in env_values):
            raise SystemExit(f'Export refused: possible credential or dotenv value in {name}')
        contents[name] = payload
    manifest = {'source_commit': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT).decode().strip(),
                'files': {name: hashlib.sha256(data).hexdigest() for name, data in contents.items()}}
    args.archive.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(args.archive, 'w', zipfile.ZIP_DEFLATED) as archive:
        for name, payload in contents.items():
            info = zipfile.ZipInfo('Shiftly/' + name, (2026, 10, 18, 0, 0, 0))
            info.external_attr = (0o100755 if os.access(ROOT / name, os.X_OK) else 0o100644) << 16
            archive.writestr(info, payload, compress_type=zipfile.ZIP_DEFLATED)
        archive.writestr('Shiftly/SOURCE_MANIFEST.json', json.dumps(manifest, indent=2) + '\n')
    print(json.dumps({'archive': str(args.archive.resolve()), 'source_files': len(contents), 'sha256': hashlib.sha256(args.archive.read_bytes()).hexdigest(), 'secret_scan': 'passed'}))

if __name__ == '__main__':
    main()
