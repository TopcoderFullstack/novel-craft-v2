/**
 * Chapter Detector for Chinese Web Novels
 * 中文网络小说章节检测器
 *
 * Detects chapter boundaries using regex patterns common in Chinese web novels.
 * Zero LLM token cost — pure regex/heuristic processing.
 */

export interface DetectedChapter {
  chapterNumber: number;
  title: string;
  rawText: string;
  charCount: number;
  startOffset: number;
  endOffset: number;
}

export interface DetectedVolume {
  volumeNumber: number;
  title: string;
  startChapter: number;
  endChapter: number;
}

export interface SegmentResult {
  chapters: DetectedChapter[];
  volumes: DetectedVolume[];
  preface?: string; // Text before first chapter
}

// Chinese number mapping for conversion
const CN_NUM_MAP: Record<string, number> = {
  '零': 0, '〇': 0, '一': 1, '二': 2, '三': 3, '四': 4,
  '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10,
  '百': 100, '千': 1000, '万': 10000,
};

/** Convert Chinese number string to integer */
export function chineseToNumber(cn: string): number {
  if (/^\d+$/.test(cn)) return parseInt(cn, 10);

  let result = 0;
  let current = 0;

  for (const char of cn) {
    const val = CN_NUM_MAP[char];
    if (val === undefined) continue;

    if (val >= 10) {
      if (current === 0) current = 1;
      current *= val;
      if (val === 10 && cn.length === 1) {
        result += current;
        current = 0;
      }
    } else {
      if (current >= 10) {
        result += current;
        current = 0;
      }
      current = val;
    }
  }
  result += current;
  return result || 1;
}

// Pattern components
const CN_NUMS = '零〇一二三四五六七八九十百千万';
const NUM_PATTERN = `[${CN_NUMS}\\d]+`;

// Chapter detection patterns (priority order)
const CHAPTER_PATTERNS: RegExp[] = [
  // 第X章 标题 (most common)
  new RegExp(`^\\s*第${NUM_PATTERN}章[\\s　]*(.*)$`, 'gm'),
  // 第X节/回/折/话
  new RegExp(`^\\s*第${NUM_PATTERN}[节回折话][\\s　]*(.*)$`, 'gm'),
  // Numeric prefix: "1234. 标题" or "1234、标题"
  /^\s*(\d{1,5})[.、．]\s*(.+)$/gm,
];

// Volume detection patterns
const VOLUME_PATTERNS: RegExp[] = [
  new RegExp(`^\\s*第${NUM_PATTERN}[卷部][\\s　]*(.*)$`, 'gm'),
];

interface RawMatch {
  index: number;
  fullMatch: string;
  title: string;
  numberStr: string;
}

function findChapterMatches(text: string): RawMatch[] {
  const matches: RawMatch[] = [];
  const seenIndices = new Set<number>();

  // Try each pattern
  for (const pattern of CHAPTER_PATTERNS) {
    pattern.lastIndex = 0;
    let m: RegExpExecArray | null;

    while ((m = pattern.exec(text)) !== null) {
      // Avoid duplicates at same position
      if (seenIndices.has(m.index)) continue;
      seenIndices.add(m.index);

      const fullMatch = m[0].trim();

      // Extract number portion
      const numMatch = fullMatch.match(
        new RegExp(`第(${NUM_PATTERN})[章节回折话]`)
      );
      let numberStr: string;
      if (numMatch) {
        numberStr = numMatch[1];
      } else {
        const digitMatch = fullMatch.match(/^(\d+)/);
        numberStr = digitMatch?.[1] ?? '0';
      }

      // Extract title (everything after the chapter marker)
      const titleParts = fullMatch.match(
        new RegExp(`第${NUM_PATTERN}[章节回折话][\\s　]*(.*)`)
      );
      const title = titleParts?.[1]?.trim() ?? m[1]?.trim() ?? fullMatch;

      matches.push({
        index: m.index,
        fullMatch,
        title,
        numberStr,
      });
    }
  }

  // Sort by position in text
  matches.sort((a, b) => a.index - b.index);
  return matches;
}

function findVolumeMatches(text: string): Array<{ index: number; title: string; numberStr: string }> {
  const matches: Array<{ index: number; title: string; numberStr: string }> = [];

  for (const pattern of VOLUME_PATTERNS) {
    pattern.lastIndex = 0;
    let m: RegExpExecArray | null;

    while ((m = pattern.exec(text)) !== null) {
      const fullMatch = m[0].trim();
      const numMatch = fullMatch.match(new RegExp(`第(${NUM_PATTERN})[卷部]`));
      const numberStr = numMatch?.[1] ?? '1';
      const title = m[1]?.trim() ?? fullMatch;

      matches.push({ index: m.index, title, numberStr });
    }
  }

  matches.sort((a, b) => a.index - b.index);
  return matches;
}

/**
 * Detect chapters and volumes in a Chinese web novel text.
 * Returns structured segment result with zero LLM token cost.
 */
export function detectChapters(rawText: string): SegmentResult {
  const chapterMatches = findChapterMatches(rawText);
  const volumeMatches = findVolumeMatches(rawText);

  // If no chapters detected, treat entire text as one chapter
  if (chapterMatches.length === 0) {
    return {
      chapters: [{
        chapterNumber: 1,
        title: 'Full Text',
        rawText: rawText.trim(),
        charCount: rawText.length,
        startOffset: 0,
        endOffset: rawText.length,
      }],
      volumes: [],
    };
  }

  // Build chapters
  const chapters: DetectedChapter[] = [];
  for (let i = 0; i < chapterMatches.length; i++) {
    const match = chapterMatches[i];
    const nextMatch = chapterMatches[i + 1];

    const startOffset = match.index;
    const endOffset = nextMatch ? nextMatch.index : rawText.length;

    // Extract chapter text (skip the chapter heading line itself)
    const headingEnd = rawText.indexOf('\n', startOffset);
    const chapterText = rawText.slice(
      headingEnd >= 0 ? headingEnd + 1 : startOffset,
      endOffset
    ).trim();

    const chapterNumber = chineseToNumber(match.numberStr) || (i + 1);

    chapters.push({
      chapterNumber: chapterNumber || (i + 1),
      title: match.title || `Chapter ${i + 1}`,
      rawText: chapterText,
      charCount: chapterText.length,
      startOffset,
      endOffset,
    });
  }

  // Build volumes
  const volumes: DetectedVolume[] = [];
  for (let i = 0; i < volumeMatches.length; i++) {
    const vol = volumeMatches[i];
    const nextVol = volumeMatches[i + 1];
    const volNumber = chineseToNumber(vol.numberStr);

    // Find which chapters fall within this volume's range
    const volStart = vol.index;
    const volEnd = nextVol ? nextVol.index : rawText.length;

    const volChapters = chapters.filter(
      ch => ch.startOffset >= volStart && ch.startOffset < volEnd
    );

    if (volChapters.length > 0) {
      volumes.push({
        volumeNumber: volNumber,
        title: vol.title,
        startChapter: volChapters[0].chapterNumber,
        endChapter: volChapters[volChapters.length - 1].chapterNumber,
      });
    }
  }

  // Extract preface (text before first chapter)
  const preface = rawText.slice(0, chapterMatches[0].index).trim() || undefined;

  return { chapters, volumes, preface };
}
