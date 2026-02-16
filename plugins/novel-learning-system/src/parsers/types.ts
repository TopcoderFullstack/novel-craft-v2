/** Parsed novel result from any format */
export interface ParsedNovel {
  title: string;
  author?: string;
  rawText: string;
  sourceFormat: 'txt' | 'md' | 'epub' | 'docx';
  totalChars: number;
  detectedEncoding?: string;
}

/** Supported file extensions */
export const SUPPORTED_EXTENSIONS = ['.txt', '.md', '.epub', '.docx'] as const;
export type SupportedExtension = (typeof SUPPORTED_EXTENSIONS)[number];

export function getExtension(filePath: string): SupportedExtension | null {
  const ext = filePath.slice(filePath.lastIndexOf('.')).toLowerCase();
  return SUPPORTED_EXTENSIONS.includes(ext as SupportedExtension)
    ? (ext as SupportedExtension)
    : null;
}
