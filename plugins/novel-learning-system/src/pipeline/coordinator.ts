/**
 * Pipeline Coordinator
 * 流水线协调器 - 编排小说学习的四阶段流程
 *
 * Phase 1: INGEST  — Parse multi-format file → raw text
 * Phase 2: SEGMENT — Detect chapters/scenes → structured hierarchy
 * Phase 3: ANALYZE — 4-dimension parallel analysis via Agent Teams
 * Phase 4: SYNTHESIZE — Cross-chapter aggregation
 */

import { parseNovel, type ParsedNovel } from '../parsers/index.js';
import { detectChapters, splitScenes, type SegmentResult } from '../segmenter/index.js';

// ============================================================
// Types
// ============================================================

export interface PipelineConfig {
  /** Neon Project ID */
  neonProjectId: string;
  /** Novel file path */
  filePath: string;
  /** Novel title (optional, auto-detected if not provided) */
  title?: string;
  /** Author name */
  author?: string;
  /** Genre tag */
  genre?: string;
}

export interface PipelineState {
  novelId?: string;
  jobId?: string;
  phase: 'ingest' | 'segment' | 'analyze' | 'synthesize' | 'completed' | 'error';
  parsed?: ParsedNovel;
  segmented?: SegmentResult;
  totalChapters: number;
  processedChapters: number;
  error?: string;
}

// ============================================================
// Phase 1: INGEST
// ============================================================

/**
 * Parse the novel file and prepare metadata.
 * Zero LLM token cost.
 */
export async function phaseIngest(config: PipelineConfig): Promise<ParsedNovel> {
  console.log(`[INGEST] Parsing file: ${config.filePath}`);
  const parsed = await parseNovel(config.filePath);

  // Override title/author if provided
  if (config.title) parsed.title = config.title;
  if (config.author) parsed.author = config.author;

  console.log(`[INGEST] Parsed: "${parsed.title}" (${parsed.totalChars} chars, ${parsed.sourceFormat})`);
  return parsed;
}

// ============================================================
// Phase 2: SEGMENT
// ============================================================

/**
 * Detect chapters and split into scenes.
 * Zero LLM token cost.
 */
export function phaseSegment(rawText: string): SegmentResult {
  console.log(`[SEGMENT] Detecting chapters...`);
  const result = detectChapters(rawText);

  console.log(`[SEGMENT] Found ${result.chapters.length} chapters, ${result.volumes.length} volumes`);

  // Split each chapter into scenes
  let totalScenes = 0;
  for (const chapter of result.chapters) {
    const scenes = splitScenes(chapter.rawText);
    totalScenes += scenes.length;
  }
  console.log(`[SEGMENT] Total scenes: ${totalScenes}`);

  return result;
}

// ============================================================
// SQL Generation Helpers (for Neon MCP execution)
// ============================================================

/**
 * Generate SQL to insert a novel record.
 * Returns the SQL string to be executed via Neon MCP.
 */
export function sqlInsertNovel(parsed: ParsedNovel, genre?: string): string {
  const title = escSql(parsed.title);
  const author = parsed.author ? `'${escSql(parsed.author)}'` : 'NULL';
  const genreVal = genre ? `'${escSql(genre)}'` : 'NULL';

  return `
    INSERT INTO novel_kb.novels (title, author, source_format, total_chars, genre, status)
    VALUES ('${title}', ${author}, '${parsed.sourceFormat}', ${parsed.totalChars}, ${genreVal}, 'ingested')
    RETURNING id
  `.trim();
}

/**
 * Generate SQL to insert a chapter.
 */
export function sqlInsertChapter(
  novelId: string,
  volumeId: string | null,
  chapterNumber: number,
  title: string,
  rawText: string,
  charCount: number
): string {
  const volId = volumeId ? `'${volumeId}'` : 'NULL';
  return `
    INSERT INTO novel_kb.chapters (novel_id, volume_id, chapter_number, title, raw_text, char_count)
    VALUES ('${novelId}', ${volId}, ${chapterNumber}, '${escSql(title)}', '${escSql(rawText)}', ${charCount})
    ON CONFLICT (novel_id, chapter_number) DO UPDATE
    SET title = EXCLUDED.title, raw_text = EXCLUDED.raw_text, char_count = EXCLUDED.char_count
    RETURNING id
  `.trim();
}

/**
 * Generate SQL to insert a volume.
 */
export function sqlInsertVolume(
  novelId: string,
  volumeNumber: number,
  title: string,
  startChapter: number,
  endChapter: number
): string {
  return `
    INSERT INTO novel_kb.volumes (novel_id, volume_number, title, start_chapter, end_chapter)
    VALUES ('${novelId}', ${volumeNumber}, '${escSql(title)}', ${startChapter}, ${endChapter})
    ON CONFLICT (novel_id, volume_number) DO UPDATE
    SET title = EXCLUDED.title, start_chapter = EXCLUDED.start_chapter, end_chapter = EXCLUDED.end_chapter
    RETURNING id
  `.trim();
}

/**
 * Generate SQL to insert a scene.
 */
export function sqlInsertScene(
  chapterId: string,
  novelId: string,
  sceneNumber: number,
  rawText: string,
  charCount: number,
  timeMarker?: string
): string {
  const tm = timeMarker ? `'${escSql(timeMarker)}'` : 'NULL';
  return `
    INSERT INTO novel_kb.scenes (chapter_id, novel_id, scene_number, raw_text, char_count, time_marker)
    VALUES ('${chapterId}', '${novelId}', ${sceneNumber}, '${escSql(rawText)}', ${charCount}, ${tm})
    ON CONFLICT (chapter_id, scene_number) DO UPDATE
    SET raw_text = EXCLUDED.raw_text, char_count = EXCLUDED.char_count
    RETURNING id
  `.trim();
}

/**
 * Generate SQL to create a job.
 */
export function sqlCreateJob(novelId: string, jobType: string, totalSteps: number): string {
  return `
    INSERT INTO novel_kb.jobs (novel_id, job_type, status, total_steps, started_at)
    VALUES ('${novelId}', '${jobType}', 'running', ${totalSteps}, NOW())
    RETURNING id
  `.trim();
}

/**
 * Generate SQL to update novel status.
 */
export function sqlUpdateNovelStatus(novelId: string, status: string): string {
  return `
    UPDATE novel_kb.novels SET status = '${status}', updated_at = NOW() WHERE id = '${novelId}'
  `.trim();
}

/**
 * Generate SQL to update novel chapter counts.
 */
export function sqlUpdateNovelCounts(novelId: string, totalChapters: number, totalVolumes: number): string {
  return `
    UPDATE novel_kb.novels
    SET total_chapters = ${totalChapters}, total_volumes = ${totalVolumes}, updated_at = NOW()
    WHERE id = '${novelId}'
  `.trim();
}

/**
 * Generate SQL to get analysis status.
 */
export function sqlGetAnalysisStatus(novelId: string): string {
  return `
    SELECT
      n.id, n.title, n.status, n.total_chapters,
      (SELECT COUNT(*) FROM novel_kb.chapters c WHERE c.novel_id = n.id AND c.style_status = 'completed') AS style_done,
      (SELECT COUNT(*) FROM novel_kb.chapters c WHERE c.novel_id = n.id AND c.narrative_status = 'completed') AS narrative_done,
      (SELECT COUNT(*) FROM novel_kb.chapters c WHERE c.novel_id = n.id AND c.character_status = 'completed') AS character_done,
      (SELECT COUNT(*) FROM novel_kb.chapters c WHERE c.novel_id = n.id AND c.world_status = 'completed') AS world_done
    FROM novel_kb.novels n
    WHERE n.id = '${novelId}'
  `.trim();
}

/**
 * Generate SQL to get writing context for a chapter.
 */
export function sqlGetWritingContext(novelId: string, currentChapter: number): {
  characters: string;
  style: string;
  world: string;
  power: string;
  recentChapters: string;
  currentArc: string;
  novelSummary: string;
} {
  const recentStart = Math.max(1, currentChapter - 5);
  return {
    characters: `SELECT name, aliases, role_type, gender, personality_tags, speech_patterns, dialogue_samples[1:3] AS top_dialogues, power_level, faction, motivation, arc_summary FROM novel_kb.characters WHERE novel_id = '${novelId}' AND role_type IN ('protagonist', 'antagonist', 'supporting') ORDER BY total_appearances DESC`,
    style: `SELECT * FROM novel_kb.v_style_summary WHERE novel_id = '${novelId}'`,
    world: `SELECT category, rule_name, description FROM novel_kb.v_world_rules_compact WHERE novel_id = '${novelId}'`,
    power: `SELECT system_name, description, tiers, rules FROM novel_kb.power_systems WHERE novel_id = '${novelId}'`,
    recentChapters: `SELECT chapter_number, title, summary FROM novel_kb.chapters WHERE novel_id = '${novelId}' AND chapter_number BETWEEN ${recentStart} AND ${currentChapter} ORDER BY chapter_number`,
    currentArc: `SELECT arc_name, arc_type, summary, tension_curve FROM novel_kb.plot_arcs WHERE novel_id = '${novelId}' AND start_chapter <= ${currentChapter} AND end_chapter >= ${currentChapter}`,
    novelSummary: `SELECT novel_summary, style_profile, narrative_profile, world_system FROM novel_kb.novels WHERE id = '${novelId}'`,
  };
}

// ============================================================
// Utility
// ============================================================

/** Escape single quotes for SQL string literals */
function escSql(str: string): string {
  return str.replace(/'/g, "''");
}
