import { readFile } from 'node:fs/promises';
import type { ParsedNovel } from './types.js';

/**
 * Parse a .epub novel file.
 * Extracts text content from EPUB chapters, strips HTML.
 */
export async function parseEpub(filePath: string): Promise<ParsedNovel> {
  const EPub = (await import('epub2')).default;

  const epub = await EPub.createAsync(filePath);

  const title = epub.metadata?.title ?? 'Untitled';
  const author = epub.metadata?.creator ?? undefined;

  // Get all chapters in order
  const flow = epub.flow ?? [];
  const textParts: string[] = [];

  for (const chapter of flow) {
    if (!chapter.id) continue;
    try {
      const html = await new Promise<string>((resolve, reject) => {
        epub.getChapter(chapter.id!, (err: Error | null, text: string) => {
          if (err) reject(err);
          else resolve(text);
        });
      });

      // Strip HTML tags, decode entities
      const text = stripHtml(html);
      if (text.trim().length > 0) {
        textParts.push(text);
      }
    } catch {
      // Skip chapters that can't be read
    }
  }

  const rawText = textParts.join('\n\n');

  return {
    title,
    author,
    rawText,
    sourceFormat: 'epub',
    totalChars: rawText.length,
  };
}

function stripHtml(html: string): string {
  return html
    // Remove script/style blocks
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '')
    // Replace block-level tags with newlines
    .replace(/<\/(p|div|h[1-6]|li|tr|br)[^>]*>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    // Remove all remaining tags
    .replace(/<[^>]+>/g, '')
    // Decode common HTML entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    // Normalize whitespace
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
