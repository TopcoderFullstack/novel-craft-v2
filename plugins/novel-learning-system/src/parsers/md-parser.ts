import { readFile } from 'node:fs/promises';
import type { ParsedNovel } from './types.js';

/**
 * Parse a .md (Markdown) novel file.
 * Strips Markdown formatting, preserves text structure.
 */
export async function parseMd(filePath: string): Promise<ParsedNovel> {
  const content = await readFile(filePath, 'utf-8');

  // Extract title from first H1 heading
  const titleMatch = content.match(/^#\s+(.+)$/m);
  const title = titleMatch?.[1]?.trim() ?? 'Untitled';

  // Strip Markdown formatting but keep structure
  let rawText = content
    // Remove HTML tags
    .replace(/<[^>]+>/g, '')
    // Convert headings to plain text with markers
    .replace(/^#{1,6}\s+(.+)$/gm, '\n$1\n')
    // Remove bold/italic markers
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
    .replace(/_{1,3}([^_]+)_{1,3}/g, '$1')
    // Remove links, keep text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove images
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
    // Remove inline code backticks
    .replace(/`([^`]+)`/g, '$1')
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, '')
    // Remove blockquote markers
    .replace(/^>\s*/gm, '')
    // Remove horizontal rules
    .replace(/^[-*_]{3,}$/gm, '\n')
    // Normalize whitespace
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  return {
    title,
    rawText,
    sourceFormat: 'md',
    totalChars: rawText.length,
  };
}
