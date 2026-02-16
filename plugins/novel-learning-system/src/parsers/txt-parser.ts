import { readFile } from 'node:fs/promises';
import type { ParsedNovel } from './types.js';

/**
 * Parse a .txt novel file.
 * Handles UTF-8, GBK, GB2312 encoding detection via chardet.
 */
export async function parseTxt(filePath: string): Promise<ParsedNovel> {
  const buffer = await readFile(filePath);

  // Try UTF-8 first, then detect encoding
  let rawText: string;
  let detectedEncoding = 'utf-8';

  try {
    const decoder = new TextDecoder('utf-8', { fatal: true });
    rawText = decoder.decode(buffer);
  } catch {
    // Not valid UTF-8, try to detect encoding
    const chardet = await import('chardet');
    const detected = chardet.detect(buffer);
    detectedEncoding = detected ?? 'gbk';

    // Map common Chinese encodings
    const encodingMap: Record<string, string> = {
      'GB2312': 'gbk',
      'GB18030': 'gbk',
      'GBK': 'gbk',
      'Big5': 'big5',
      'EUC-KR': 'euc-kr',
    };
    const decoderLabel = encodingMap[detectedEncoding] ?? detectedEncoding;

    const fallbackDecoder = new TextDecoder(decoderLabel, { fatal: false });
    rawText = fallbackDecoder.decode(buffer);
  }

  // Normalize line endings
  rawText = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Try to extract title from first non-empty line
  const lines = rawText.split('\n').filter(l => l.trim().length > 0);
  const title = lines[0]?.trim().slice(0, 100) ?? 'Untitled';

  return {
    title,
    rawText,
    sourceFormat: 'txt',
    totalChars: rawText.length,
    detectedEncoding,
  };
}
