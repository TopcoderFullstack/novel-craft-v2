import { stat } from 'node:fs/promises';
import { getExtension, type ParsedNovel } from './types.js';
import { parseTxt } from './txt-parser.js';
import { parseMd } from './md-parser.js';
import { parseEpub } from './epub-parser.js';
import { parseDocx } from './docx-parser.js';

export type { ParsedNovel } from './types.js';

/**
 * Parse a novel file in any supported format.
 * Auto-detects format by extension and dispatches to the appropriate parser.
 */
export async function parseNovel(filePath: string): Promise<ParsedNovel> {
  // Verify file exists
  const fileStat = await stat(filePath);
  if (!fileStat.isFile()) {
    throw new Error(`Not a file: ${filePath}`);
  }

  const ext = getExtension(filePath);
  if (!ext) {
    throw new Error(
      `Unsupported file format: ${filePath}. Supported: .txt, .md, .epub, .docx`
    );
  }

  switch (ext) {
    case '.txt':
      return parseTxt(filePath);
    case '.md':
      return parseMd(filePath);
    case '.epub':
      return parseEpub(filePath);
    case '.docx':
      return parseDocx(filePath);
  }
}
