"""Package the built add-on and exactly the inputs needed to rebuild it."""
import json
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / 'dist'
OUTPUT = ROOT / 'artifacts'
VERSION = json.loads((ROOT / 'manifest.json').read_text())['version']
PREFIX = f'animation-pack-exporter-{VERSION}'
TEXT = {'.ts', '.svelte', '.js', '.html', '.css', '.json', '.yaml', '.md', '.py'}


def archive(destination, base, files):
    with ZipFile(destination, 'w') as bundle:
        for path in sorted(files):
            if path.is_file():
                info = ZipInfo(path.relative_to(base).as_posix())
                info.create_system = 3
                info.external_attr = 0o100644 << 16
                data = path.read_bytes()
                if path.suffix in TEXT or path.name == 'LICENSE':
                    data = data.replace(b'\r\n', b'\n')
                bundle.writestr(info, data, compress_type=ZIP_DEFLATED)
    print(destination)


OUTPUT.mkdir(exist_ok=True)
archive(OUTPUT / f'{PREFIX}.xpi', DIST, DIST.rglob('*'))
source = [ROOT / name for name in (
    'README.md', 'LICENSE', 'CHANGELOG.md', 'manifest.json', 'index.html', 'permission.html',
    'images/firefox-pack.png', 'icon16.png', 'icon48.png', 'icon128.png', 'package.json', 'pnpm-lock.yaml',
    'svelte.config.js', 'tsconfig.json', 'tsconfig.svelte.json', 'tsconfig.chrome.json',
    'vite.config.ts', 'webpack.config.js', 'scripts/package_release.py',
)]
archive(OUTPUT / f'{PREFIX}-source.zip', ROOT, source + list((ROOT / 'src').rglob('*')))
