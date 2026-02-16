/**
 * Scene Splitter for Chinese Web Novel Chapters
 * 中文网络小说场景切分器
 *
 * Splits a chapter into individual scenes based on:
 * - Blank line clusters
 * - Scene transition markers (***、---、===)
 * - Time/location jump markers
 *
 * Zero LLM token cost.
 */

export interface DetectedScene {
  sceneNumber: number;
  rawText: string;
  charCount: number;
  timeMarker?: string;
  locationHint?: string;
}

// Scene break patterns
const SCENE_BREAK_PATTERN = /\n\s*(?:\*{3,}|-{3,}|={3,}|…{3,}|·{3,})\s*\n/g;

// Time jump markers commonly used in Chinese web novels
const TIME_MARKERS = [
  '三天后', '三日后', '五天后', '数天后', '数日后', '半个月后', '一个月后',
  '次日', '翌日', '第二天', '第二日', '几天之后', '数月后', '一年后',
  '半年后', '数年后', '百年后', '千年后', '万年后',
  '与此同时', '此时此刻', '就在这时', '就在此时', '话说另一边',
  '另一边', '在另一处', '同一时间', '几乎同时',
  '清晨', '傍晚', '黄昏', '深夜', '午夜', '拂晓', '黎明',
];

const TIME_MARKER_PATTERN = new RegExp(
  `^\\s*(${TIME_MARKERS.join('|')})`,
  'gm'
);

/**
 * Split a chapter's text into scenes.
 * If chapter is too short (<2000 chars), treats entire chapter as one scene.
 */
export function splitScenes(chapterText: string, minSceneLength = 500): DetectedScene[] {
  // Short chapters → single scene
  if (chapterText.length < 2000) {
    return [{
      sceneNumber: 1,
      rawText: chapterText.trim(),
      charCount: chapterText.length,
    }];
  }

  // Collect all potential break points
  const breakPoints: Array<{ index: number; type: string }> = [];

  // 1. Explicit scene break markers
  SCENE_BREAK_PATTERN.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = SCENE_BREAK_PATTERN.exec(chapterText)) !== null) {
    breakPoints.push({ index: m.index, type: 'marker' });
  }

  // 2. Double blank lines (paragraph clusters)
  const doubleBlank = /\n\s*\n\s*\n/g;
  while ((m = doubleBlank.exec(chapterText)) !== null) {
    breakPoints.push({ index: m.index, type: 'blank' });
  }

  // 3. Time/location jump markers at line start
  TIME_MARKER_PATTERN.lastIndex = 0;
  while ((m = TIME_MARKER_PATTERN.exec(chapterText)) !== null) {
    breakPoints.push({ index: m.index, type: 'time' });
  }

  // Deduplicate nearby break points (within 50 chars)
  breakPoints.sort((a, b) => a.index - b.index);
  const filtered: typeof breakPoints = [];
  for (const bp of breakPoints) {
    const last = filtered[filtered.length - 1];
    if (!last || bp.index - last.index > 50) {
      filtered.push(bp);
    }
  }

  // If no break points, single scene
  if (filtered.length === 0) {
    return [{
      sceneNumber: 1,
      rawText: chapterText.trim(),
      charCount: chapterText.length,
    }];
  }

  // Build scenes from break points
  const scenes: DetectedScene[] = [];
  let prevEnd = 0;

  for (const bp of filtered) {
    const text = chapterText.slice(prevEnd, bp.index).trim();
    if (text.length >= minSceneLength) {
      const timeMatch = text.match(TIME_MARKER_PATTERN);
      scenes.push({
        sceneNumber: scenes.length + 1,
        rawText: text,
        charCount: text.length,
        timeMarker: timeMatch?.[1],
      });
      prevEnd = bp.index;
    }
  }

  // Last scene (from last break to end)
  const lastText = chapterText.slice(prevEnd).trim();
  if (lastText.length > 0) {
    // If too short, merge with previous scene
    if (lastText.length < minSceneLength && scenes.length > 0) {
      const prev = scenes[scenes.length - 1];
      prev.rawText += '\n\n' + lastText;
      prev.charCount = prev.rawText.length;
    } else {
      const timeMatch = lastText.match(TIME_MARKER_PATTERN);
      scenes.push({
        sceneNumber: scenes.length + 1,
        rawText: lastText,
        charCount: lastText.length,
        timeMarker: timeMatch?.[1],
      });
    }
  }

  // If merging left us with no scenes somehow, return full text
  if (scenes.length === 0) {
    return [{
      sceneNumber: 1,
      rawText: chapterText.trim(),
      charCount: chapterText.length,
    }];
  }

  return scenes;
}
