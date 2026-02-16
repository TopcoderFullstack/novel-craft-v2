/**
 * Parameterized SQL Query Library for Novel Knowledge Base
 * 网络小说知识库 - 参数化查询库
 *
 * All queries target the novel_kb schema in Neon PostgreSQL.
 * Project ID: muddy-credit-26606950
 */

// ============================================================
// Novel CRUD
// ============================================================

export const INSERT_NOVEL = `
INSERT INTO novel_kb.novels (title, author, source_format, total_chars, genre, raw_text, status)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING id
`;

export const UPDATE_NOVEL_STATUS = `
UPDATE novel_kb.novels SET status = $2, updated_at = NOW() WHERE id = $1
`;

export const UPDATE_NOVEL_CHAPTERS = `
UPDATE novel_kb.novels SET total_chapters = $2, total_volumes = $3, updated_at = NOW() WHERE id = $1
`;

export const UPDATE_NOVEL_SUMMARY = `
UPDATE novel_kb.novels
SET novel_summary = $2, style_profile = $3, narrative_profile = $4, world_system = $5,
    status = 'completed', updated_at = NOW()
WHERE id = $1
`;

export const GET_NOVEL = `
SELECT * FROM novel_kb.novels WHERE id = $1
`;

export const LIST_NOVELS = `
SELECT id, title, author, genre, total_chars, total_chapters, status, created_at
FROM novel_kb.novels ORDER BY created_at DESC
`;

// ============================================================
// Volume CRUD
// ============================================================

export const INSERT_VOLUME = `
INSERT INTO novel_kb.volumes (novel_id, volume_number, title, start_chapter, end_chapter)
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (novel_id, volume_number) DO UPDATE
SET title = EXCLUDED.title, start_chapter = EXCLUDED.start_chapter, end_chapter = EXCLUDED.end_chapter
RETURNING id
`;

// ============================================================
// Chapter CRUD
// ============================================================

export const INSERT_CHAPTER = `
INSERT INTO novel_kb.chapters (novel_id, volume_id, chapter_number, title, raw_text, char_count)
VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT (novel_id, chapter_number) DO UPDATE
SET title = EXCLUDED.title, raw_text = EXCLUDED.raw_text, char_count = EXCLUDED.char_count
RETURNING id
`;

export const UPDATE_CHAPTER_SUMMARY = `
UPDATE novel_kb.chapters SET summary = $2, scene_count = $3 WHERE id = $1
`;

export const UPDATE_CHAPTER_ANALYSIS_STATUS = `
UPDATE novel_kb.chapters
SET style_status = COALESCE($2, style_status),
    narrative_status = COALESCE($3, narrative_status),
    character_status = COALESCE($4, character_status),
    world_status = COALESCE($5, world_status)
WHERE id = $1
`;

export const GET_CHAPTER = `
SELECT * FROM novel_kb.chapters WHERE novel_id = $1 AND chapter_number = $2
`;

export const GET_CHAPTERS_RANGE = `
SELECT id, chapter_number, title, raw_text, char_count, summary,
       style_status, narrative_status, character_status, world_status
FROM novel_kb.chapters
WHERE novel_id = $1 AND chapter_number BETWEEN $2 AND $3
ORDER BY chapter_number
`;

export const GET_PENDING_CHAPTERS = `
SELECT id, chapter_number, title, raw_text, char_count
FROM novel_kb.chapters
WHERE novel_id = $1 AND ${/* dimension placeholder */''}style_status = 'pending'
ORDER BY chapter_number
LIMIT $2
`;

// Template for getting pending chapters per dimension
export function getPendingChaptersQuery(dimension: 'style' | 'narrative' | 'character' | 'world'): string {
  return `
    SELECT id, chapter_number, title, raw_text, char_count
    FROM novel_kb.chapters
    WHERE novel_id = $1 AND ${dimension}_status = 'pending'
    ORDER BY chapter_number
    LIMIT $2
  `;
}

// ============================================================
// Scene CRUD
// ============================================================

export const INSERT_SCENE = `
INSERT INTO novel_kb.scenes (chapter_id, novel_id, scene_number, raw_text, char_count, time_marker)
VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT (chapter_id, scene_number) DO UPDATE
SET raw_text = EXCLUDED.raw_text, char_count = EXCLUDED.char_count
RETURNING id
`;

// ============================================================
// Style Analysis
// ============================================================

export const INSERT_STYLE_ANALYSIS = `
INSERT INTO novel_kb.style_analysis (
    chapter_id, novel_id,
    avg_sentence_length, sentence_length_variance,
    short_sentence_ratio, long_sentence_ratio,
    unique_word_ratio, classical_word_ratio,
    modern_slang_ratio, four_char_idiom_count,
    rhetoric_devices,
    dialogue_ratio, dialogue_avg_length,
    narration_ratio, description_ratio,
    paragraph_avg_length, rhythm_score, tension_score,
    sample_passages
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
ON CONFLICT (chapter_id) DO UPDATE SET
    avg_sentence_length = EXCLUDED.avg_sentence_length,
    dialogue_ratio = EXCLUDED.dialogue_ratio,
    rhetoric_devices = EXCLUDED.rhetoric_devices,
    rhythm_score = EXCLUDED.rhythm_score,
    tension_score = EXCLUDED.tension_score
`;

// ============================================================
// Narrative Analysis
// ============================================================

export const INSERT_NARRATIVE_ANALYSIS = `
INSERT INTO novel_kb.narrative_analysis (
    chapter_id, novel_id,
    pacing_type, pacing_score,
    suspense_hooks, cliffhanger_score,
    foreshadowing_planted, foreshadowing_resolved,
    key_events, conflict_type, conflict_intensity,
    chapter_function
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
ON CONFLICT (chapter_id) DO UPDATE SET
    pacing_type = EXCLUDED.pacing_type,
    pacing_score = EXCLUDED.pacing_score,
    key_events = EXCLUDED.key_events,
    chapter_function = EXCLUDED.chapter_function
`;

// ============================================================
// Character CRUD
// ============================================================

export const UPSERT_CHARACTER = `
INSERT INTO novel_kb.characters (
    novel_id, name, aliases, role_type,
    first_appearance, gender, personality_tags,
    motivation, power_level, faction,
    speech_patterns, dialogue_samples, arc_type
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
ON CONFLICT (novel_id, name) DO UPDATE SET
    aliases = COALESCE(EXCLUDED.aliases, novel_kb.characters.aliases),
    role_type = COALESCE(EXCLUDED.role_type, novel_kb.characters.role_type),
    last_appearance = EXCLUDED.first_appearance,
    total_appearances = novel_kb.characters.total_appearances + 1,
    personality_tags = COALESCE(EXCLUDED.personality_tags, novel_kb.characters.personality_tags),
    power_level = COALESCE(EXCLUDED.power_level, novel_kb.characters.power_level),
    speech_patterns = COALESCE(EXCLUDED.speech_patterns, novel_kb.characters.speech_patterns),
    updated_at = NOW()
RETURNING id
`;

export const INSERT_CHARACTER_APPEARANCE = `
INSERT INTO novel_kb.character_appearances (
    character_id, chapter_id, novel_id,
    actions, dialogue_count, emotional_state, status_change
) VALUES ($1, $2, $3, $4, $5, $6, $7)
ON CONFLICT (character_id, chapter_id) DO UPDATE SET
    actions = EXCLUDED.actions,
    dialogue_count = EXCLUDED.dialogue_count,
    emotional_state = EXCLUDED.emotional_state,
    status_change = EXCLUDED.status_change
`;

export const UPSERT_CHARACTER_RELATIONSHIP = `
INSERT INTO novel_kb.character_relationships (
    novel_id, character_a_id, character_b_id,
    relationship_type, description, strength, first_chapter, evolution
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
ON CONFLICT (novel_id, character_a_id, character_b_id, relationship_type) DO UPDATE SET
    description = EXCLUDED.description,
    strength = EXCLUDED.strength,
    evolution = EXCLUDED.evolution
`;

// ============================================================
// World-building CRUD
// ============================================================

export const UPSERT_POWER_SYSTEM = `
INSERT INTO novel_kb.power_systems (novel_id, system_name, description, tiers, rules, first_mentioned)
VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT (novel_id, system_name) DO UPDATE SET
    description = EXCLUDED.description,
    tiers = EXCLUDED.tiers,
    rules = EXCLUDED.rules
RETURNING id
`;

export const UPSERT_WORLD_RULE = `
INSERT INTO novel_kb.world_rules (novel_id, category, rule_name, description, implications, first_mentioned, is_golden_finger)
VALUES ($1, $2, $3, $4, $5, $6, $7)
ON CONFLICT (novel_id, category, rule_name) DO UPDATE SET
    description = EXCLUDED.description,
    implications = EXCLUDED.implications
RETURNING id
`;

export const UPSERT_LOCATION = `
INSERT INTO novel_kb.locations (novel_id, name, description, parent_location, location_type, importance, first_mentioned)
VALUES ($1, $2, $3, $4, $5, $6, $7)
ON CONFLICT (novel_id, name) DO UPDATE SET
    description = EXCLUDED.description,
    importance = EXCLUDED.importance
RETURNING id
`;

export const UPSERT_FACTION = `
INSERT INTO novel_kb.factions (novel_id, name, description, leader_id, alignment, power_rank, first_mentioned)
VALUES ($1, $2, $3, $4, $5, $6, $7)
ON CONFLICT (novel_id, name) DO UPDATE SET
    description = EXCLUDED.description,
    alignment = EXCLUDED.alignment,
    power_rank = EXCLUDED.power_rank
RETURNING id
`;

export const UPSERT_GOLDEN_FINGER = `
INSERT INTO novel_kb.golden_fingers (novel_id, name, owner_id, description, abilities, limitations, evolution, first_mentioned)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
ON CONFLICT (novel_id, name) DO UPDATE SET
    description = EXCLUDED.description,
    abilities = EXCLUDED.abilities,
    limitations = EXCLUDED.limitations,
    evolution = EXCLUDED.evolution
RETURNING id
`;

// ============================================================
// Job Tracking
// ============================================================

export const INSERT_JOB = `
INSERT INTO novel_kb.jobs (novel_id, job_type, status, total_steps, started_at)
VALUES ($1, $2, 'running', $3, NOW())
RETURNING id
`;

export const UPDATE_JOB_PROGRESS = `
UPDATE novel_kb.jobs
SET completed_steps = $2, failed_steps = $3,
    tokens_input = $4, tokens_output = $5
WHERE id = $1
`;

export const COMPLETE_JOB = `
UPDATE novel_kb.jobs SET status = 'completed', completed_at = NOW() WHERE id = $1
`;

export const FAIL_JOB = `
UPDATE novel_kb.jobs SET status = 'failed', error_message = $2, completed_at = NOW() WHERE id = $1
`;

export const INSERT_JOB_STEP = `
INSERT INTO novel_kb.job_steps (job_id, step_type, target_id, chapter_number, status, started_at)
VALUES ($1, $2, $3, $4, 'running', NOW())
RETURNING id
`;

export const COMPLETE_JOB_STEP = `
UPDATE novel_kb.job_steps
SET status = 'completed', tokens_input = $2, tokens_output = $3, completed_at = NOW()
WHERE id = $1
`;

export const FAIL_JOB_STEP = `
UPDATE novel_kb.job_steps
SET status = 'failed', error_message = $2, retry_count = retry_count + 1
WHERE id = $1
`;

// ============================================================
// Writing Agent Retrieval Queries (Token-optimized)
// ============================================================

/** Get complete writing context for a specific chapter (~7.5K tokens) */
export const GET_WRITING_CONTEXT_CHARACTERS = `
SELECT name, aliases, role_type, gender, personality_tags,
       speech_patterns, dialogue_samples[1:3] AS top_dialogues,
       power_level, faction, motivation, arc_summary
FROM novel_kb.characters
WHERE novel_id = $1 AND role_type IN ('protagonist', 'antagonist', 'supporting')
ORDER BY total_appearances DESC
`;

export const GET_WRITING_CONTEXT_STYLE = `
SELECT * FROM novel_kb.v_style_summary WHERE novel_id = $1
`;

export const GET_WRITING_CONTEXT_WORLD = `
SELECT category, rule_name, description FROM novel_kb.v_world_rules_compact WHERE novel_id = $1
`;

export const GET_WRITING_CONTEXT_POWER = `
SELECT system_name, description, tiers, rules FROM novel_kb.power_systems WHERE novel_id = $1
`;

export const GET_WRITING_CONTEXT_RECENT_CHAPTERS = `
SELECT chapter_number, title, summary
FROM novel_kb.chapters
WHERE novel_id = $1 AND chapter_number BETWEEN $2 AND $3
ORDER BY chapter_number
`;

export const GET_WRITING_CONTEXT_CURRENT_ARC = `
SELECT arc_name, arc_type, summary, tension_curve
FROM novel_kb.plot_arcs
WHERE novel_id = $1 AND start_chapter <= $2 AND end_chapter >= $2
`;

export const GET_NOVEL_SUMMARY = `
SELECT novel_summary, style_profile, narrative_profile, world_system
FROM novel_kb.novels WHERE id = $1
`;

export const GET_ACTIVE_FORESHADOWING = `
SELECT na.foreshadowing_planted
FROM novel_kb.narrative_analysis na
JOIN novel_kb.chapters c ON na.chapter_id = c.id
WHERE c.novel_id = $1
  AND na.foreshadowing_planted IS NOT NULL
  AND na.foreshadowing_planted != '[]'::jsonb
ORDER BY c.chapter_number DESC
LIMIT 20
`;

// ============================================================
// Analysis Status
// ============================================================

export const GET_ANALYSIS_STATUS = `
SELECT
    n.id, n.title, n.status, n.total_chapters,
    (SELECT COUNT(*) FROM novel_kb.chapters c WHERE c.novel_id = n.id AND c.style_status = 'completed') AS style_done,
    (SELECT COUNT(*) FROM novel_kb.chapters c WHERE c.novel_id = n.id AND c.narrative_status = 'completed') AS narrative_done,
    (SELECT COUNT(*) FROM novel_kb.chapters c WHERE c.novel_id = n.id AND c.character_status = 'completed') AS character_done,
    (SELECT COUNT(*) FROM novel_kb.chapters c WHERE c.novel_id = n.id AND c.world_status = 'completed') AS world_done
FROM novel_kb.novels n
WHERE n.id = $1
`;
