import { readFile } from 'node:fs/promises';
import type { ParsedNovel } from './types.js';

/**
 * Parse a .docx novel file using mammoth.
 * Extracts plain text from Word documents.
 */
export async function parseDocx(filePath: string): Promise<ParsedNovel> {
  const mammoth = await import('mammoth');
  const buffer = await readFile(filePath);

  const result = await mammoth.extractRawText({ buffer });
  let rawText = result.value;

  // Normalize line endings
  rawText = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Try to extract title from first non-empty line
  const lines = rawText.split('\n').filter(l => l.trim().length > 0);
  const title = lines[0]?.trim().slice(0, 100) ?? 'Untitled';

  return {
    title,
    rawText,
    sourceFormat: 'docx',
    totalChars: rawText.length,
  };
}
