// Velvet Vault — the hand-in program for the best-heist-game bounty.
// Node 22, standard library only, no network, no clock, no randomness:
// it copies this repository's game/ and screenshots/ into the output
// directory and writes dossier.json with the kit's vendored library.
// The grader runs it twice; both runs must write the same bytes.

import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The caps mirror the scorer's gate: at most 4 screenshots, each at most
// 256 KiB; game/ at most 993 files and 48 MiB, every path at most
// 1,000 bytes; the dossier text at most 160 KiB.
const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});

const dossierPath = join(out, 'dossier.json');
writeFileSync(dossierPath, dossier);

// Read-back self-check: buildDossier returns bytes (a Uint8Array), so
// compare the file's bytes with what the library produced. If they
// differ, the hand-in is corrupt and must fail loudly instead of
// shipping a dossier the gate would refuse.
const writtenBytes = readFileSync(dossierPath);
const expectedBytes = Buffer.from(dossier);
if (!writtenBytes.equals(expectedBytes)) {
  throw new Error('dossier.json read-back mismatch: wrote ' + expectedBytes.length + ' bytes, read ' + writtenBytes.length);
}
