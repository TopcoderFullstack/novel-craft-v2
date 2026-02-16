-- ============================================================
-- Novel Knowledge Base Schema (novel_kb)
-- 网络小说学习系统 - 数据库 Schema
-- ============================================================

CREATE SCHEMA IF NOT EXISTS novel_kb;

-- ============================================================
-- Table: novels (小说主表)
-- ============================================================
CREATE TABLE novel_kb.novels (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title           TEXT NOT NULL,
    author          TEXT,
    source_format   TEXT NOT NULL,
    total_chars     INTEGER NOT NULL,
    total_chapters  INTEGER,
    total_volumes   INTEGER DEFAULT 0,
    genre           TEXT,
    raw_text        TEXT,

    novel_summary       TEXT,
    style_profile       JSONB,
    narrative_profile   JSONB,
    world_system        JSONB,

    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    status          TEXT DEFAULT 'pending'
);

-- ============================================================
-- Table: volumes (卷/部)
-- ============================================================
CREATE TABLE novel_kb.volumes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    novel_id        UUID NOT NULL REFERENCES novel_kb.novels(id) ON DELETE CASCADE,
    volume_number   INTEGER NOT NULL,
    title           TEXT,
    start_chapter   INTEGER,
    end_chapter     INTEGER,
    summary         TEXT,
    UNIQUE(novel_id, volume_number)
);

-- ============================================================
-- Table: chapters (章节 - 核心分析单元)
-- ============================================================
CREATE TABLE novel_kb.chapters (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    novel_id        UUID NOT NULL REFERENCES novel_kb.novels(id) ON DELETE CASCADE,
    volume_id       UUID REFERENCES novel_kb.volumes(id),
    chapter_number  INTEGER NOT NULL,
    title           TEXT,
    raw_text        TEXT NOT NULL,
    char_count      INTEGER NOT NULL,

    summary         TEXT,
    scene_count     INTEGER,

    style_status        TEXT DEFAULT 'pending',
    narrative_status    TEXT DEFAULT 'pending',
    character_status    TEXT DEFAULT 'pending',
    world_status        TEXT DEFAULT 'pending',

    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(novel_id, chapter_number)
);

CREATE INDEX idx_chapters_novel ON novel_kb.chapters(novel_id, chapter_number);

-- ============================================================
-- Table: scenes (场景)
-- ============================================================
CREATE TABLE novel_kb.scenes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chapter_id      UUID NOT NULL REFERENCES novel_kb.chapters(id) ON DELETE CASCADE,
    novel_id        UUID NOT NULL REFERENCES novel_kb.novels(id) ON DELETE CASCADE,
    scene_number    INTEGER NOT NULL,
    raw_text        TEXT NOT NULL,
    char_count      INTEGER,
    summary         TEXT,
    location        TEXT,
    time_marker     TEXT,
    pov_character   TEXT,
    UNIQUE(chapter_id, scene_number)
);

-- ============================================================
-- Dimension 1: Writing Style (文笔风格)
-- ============================================================
CREATE TABLE novel_kb.style_analysis (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chapter_id      UUID NOT NULL REFERENCES novel_kb.chapters(id) ON DELETE CASCADE,
    novel_id        UUID NOT NULL,

    avg_sentence_length     REAL,
    sentence_length_variance REAL,
    short_sentence_ratio    REAL,
    long_sentence_ratio     REAL,

    unique_word_ratio       REAL,
    classical_word_ratio    REAL,
    modern_slang_ratio      REAL,
    four_char_idiom_count   INTEGER,

    rhetoric_devices        JSONB,

    dialogue_ratio          REAL,
    dialogue_avg_length     REAL,
    narration_ratio         REAL,
    description_ratio       REAL,

    paragraph_avg_length    REAL,
    rhythm_score            REAL,
    tension_score           REAL,

    sample_passages         TEXT[],

    created_at              TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(chapter_id)
);

-- ============================================================
-- Dimension 2: Narrative Structure (叙事结构)
-- ============================================================
CREATE TABLE novel_kb.narrative_analysis (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chapter_id      UUID NOT NULL REFERENCES novel_kb.chapters(id) ON DELETE CASCADE,
    novel_id        UUID NOT NULL,

    pacing_type         TEXT,
    pacing_score        REAL,

    suspense_hooks      JSONB,
    cliffhanger_score   REAL,

    foreshadowing_planted   JSONB,
    foreshadowing_resolved  JSONB,

    key_events          JSONB,
    conflict_type       TEXT,
    conflict_intensity  REAL,

    chapter_function    TEXT,

    created_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(chapter_id)
);

-- ============================================================
-- Table: plot_arcs (情节弧段)
-- ============================================================
CREATE TABLE novel_kb.plot_arcs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    novel_id        UUID NOT NULL REFERENCES novel_kb.novels(id) ON DELETE CASCADE,
    arc_name        TEXT NOT NULL,
    arc_type        TEXT,
    start_chapter   INTEGER NOT NULL,
    end_chapter     INTEGER NOT NULL,
    summary         TEXT,
    climax_chapter  INTEGER,
    key_characters  UUID[],
    tension_curve   JSONB,
    setup_payoff    JSONB,
    UNIQUE(novel_id, arc_name)
);

-- ============================================================
-- Dimension 3: Character Design (人物设计)
-- ============================================================
CREATE TABLE novel_kb.characters (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    novel_id        UUID NOT NULL REFERENCES novel_kb.novels(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    aliases         TEXT[],
    role_type       TEXT,
    first_appearance INTEGER,
    last_appearance  INTEGER,
    total_appearances INTEGER DEFAULT 0,

    gender          TEXT,
    age_description TEXT,
    appearance      TEXT,
    personality_tags TEXT[],
    motivation      TEXT,
    power_level     TEXT,
    faction         TEXT,

    speech_patterns     JSONB,
    dialogue_samples    TEXT[],

    arc_type            TEXT,
    arc_summary         TEXT,

    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(novel_id, name)
);

CREATE TABLE novel_kb.character_appearances (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    character_id    UUID NOT NULL REFERENCES novel_kb.characters(id) ON DELETE CASCADE,
    chapter_id      UUID NOT NULL REFERENCES novel_kb.chapters(id) ON DELETE CASCADE,
    novel_id        UUID NOT NULL,

    actions         TEXT,
    dialogue_count  INTEGER DEFAULT 0,
    emotional_state TEXT,
    status_change   TEXT,

    UNIQUE(character_id, chapter_id)
);

CREATE TABLE novel_kb.character_relationships (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    novel_id        UUID NOT NULL REFERENCES novel_kb.novels(id) ON DELETE CASCADE,
    character_a_id  UUID NOT NULL REFERENCES novel_kb.characters(id) ON DELETE CASCADE,
    character_b_id  UUID NOT NULL REFERENCES novel_kb.characters(id) ON DELETE CASCADE,

    relationship_type   TEXT NOT NULL,
    description         TEXT,
    strength            REAL DEFAULT 0.5,
    first_chapter       INTEGER,
    evolution           JSONB,

    UNIQUE(novel_id, character_a_id, character_b_id, relationship_type)
);

-- ============================================================
-- Dimension 4: World-building (世界观设定)
-- ============================================================
CREATE TABLE novel_kb.power_systems (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    novel_id        UUID NOT NULL REFERENCES novel_kb.novels(id) ON DELETE CASCADE,
    system_name     TEXT NOT NULL,
    description     TEXT,
    tiers           JSONB,
    rules           JSONB,
    first_mentioned INTEGER,
    UNIQUE(novel_id, system_name)
);

CREATE TABLE novel_kb.world_rules (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    novel_id        UUID NOT NULL REFERENCES novel_kb.novels(id) ON DELETE CASCADE,
    category        TEXT NOT NULL,
    rule_name       TEXT NOT NULL,
    description     TEXT NOT NULL,
    implications    TEXT,
    first_mentioned INTEGER,
    is_golden_finger BOOLEAN DEFAULT FALSE,
    UNIQUE(novel_id, category, rule_name)
);

CREATE TABLE novel_kb.locations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    novel_id        UUID NOT NULL REFERENCES novel_kb.novels(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    description     TEXT,
    parent_location UUID REFERENCES novel_kb.locations(id),
    location_type   TEXT,
    importance      TEXT DEFAULT 'minor',
    first_mentioned INTEGER,
    UNIQUE(novel_id, name)
);

CREATE TABLE novel_kb.factions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    novel_id        UUID NOT NULL REFERENCES novel_kb.novels(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    description     TEXT,
    leader_id       UUID REFERENCES novel_kb.characters(id),
    alignment       TEXT,
    power_rank      INTEGER,
    base_location   UUID REFERENCES novel_kb.locations(id),
    first_mentioned INTEGER,
    UNIQUE(novel_id, name)
);

CREATE TABLE novel_kb.golden_fingers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    novel_id        UUID NOT NULL REFERENCES novel_kb.novels(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    owner_id        UUID REFERENCES novel_kb.characters(id),
    description     TEXT NOT NULL,
    abilities       JSONB,
    limitations     JSONB,
    evolution       JSONB,
    first_mentioned INTEGER,
    UNIQUE(novel_id, name)
);

-- ============================================================
-- Processing Infrastructure (处理基础设施)
-- ============================================================
CREATE TABLE novel_kb.jobs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    novel_id        UUID NOT NULL REFERENCES novel_kb.novels(id) ON DELETE CASCADE,
    job_type        TEXT NOT NULL,
    status          TEXT DEFAULT 'pending',
    total_steps     INTEGER,
    completed_steps INTEGER DEFAULT 0,
    failed_steps    INTEGER DEFAULT 0,

    tokens_input    BIGINT DEFAULT 0,
    tokens_output   BIGINT DEFAULT 0,
    estimated_cost  REAL DEFAULT 0,

    error_message   TEXT,
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE novel_kb.job_steps (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id          UUID NOT NULL REFERENCES novel_kb.jobs(id) ON DELETE CASCADE,
    step_type       TEXT NOT NULL,
    target_id       UUID,
    chapter_number  INTEGER,
    status          TEXT DEFAULT 'pending',

    tokens_input    INTEGER DEFAULT 0,
    tokens_output   INTEGER DEFAULT 0,
    retry_count     INTEGER DEFAULT 0,
    error_message   TEXT,

    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(job_id, step_type, target_id)
);

CREATE INDEX idx_job_steps_status ON novel_kb.job_steps(job_id, status);
CREATE INDEX idx_job_steps_chapter ON novel_kb.job_steps(job_id, chapter_number);

-- ============================================================
-- Notable Passages (精华片段)
-- ============================================================
CREATE TABLE novel_kb.notable_passages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    novel_id        UUID NOT NULL REFERENCES novel_kb.novels(id) ON DELETE CASCADE,
    chapter_id      UUID REFERENCES novel_kb.chapters(id) ON DELETE CASCADE,
    passage_text    TEXT NOT NULL,
    tags            TEXT[],
    quality_score   INTEGER,
    analysis        TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Pre-computed Views (写作代理优化视图)
-- ============================================================

-- Compact character card for writing agent
CREATE VIEW novel_kb.v_character_card AS
SELECT
    c.novel_id,
    c.name,
    c.aliases,
    c.role_type,
    c.gender,
    c.personality_tags,
    c.speech_patterns,
    c.dialogue_samples[1:3] AS top_dialogue_samples,
    c.power_level,
    c.faction,
    c.motivation,
    c.arc_type,
    c.arc_summary
FROM novel_kb.characters c
WHERE c.role_type IN ('protagonist', 'antagonist', 'supporting');

-- Aggregated style summary
CREATE VIEW novel_kb.v_style_summary AS
SELECT
    novel_id,
    ROUND(AVG(avg_sentence_length)::numeric, 1) AS avg_sentence_length,
    ROUND(AVG(dialogue_ratio)::numeric, 3) AS avg_dialogue_ratio,
    ROUND(AVG(narration_ratio)::numeric, 3) AS avg_narration_ratio,
    ROUND(AVG(description_ratio)::numeric, 3) AS avg_description_ratio,
    ROUND(AVG(rhythm_score)::numeric, 2) AS avg_rhythm_score,
    ROUND(AVG(tension_score)::numeric, 2) AS avg_tension_score,
    ROUND(AVG(short_sentence_ratio)::numeric, 3) AS avg_short_sentence_ratio,
    ROUND(AVG(long_sentence_ratio)::numeric, 3) AS avg_long_sentence_ratio
FROM novel_kb.style_analysis
GROUP BY novel_id;

-- Compact world rules
CREATE VIEW novel_kb.v_world_rules_compact AS
SELECT
    novel_id,
    category,
    rule_name,
    description
FROM novel_kb.world_rules
ORDER BY novel_id, category, first_mentioned;

-- Character relationships summary
CREATE VIEW novel_kb.v_relationships_summary AS
SELECT
    cr.novel_id,
    ca.name AS character_a,
    cb.name AS character_b,
    cr.relationship_type,
    cr.description,
    cr.strength
FROM novel_kb.character_relationships cr
JOIN novel_kb.characters ca ON cr.character_a_id = ca.id
JOIN novel_kb.characters cb ON cr.character_b_id = cb.id
ORDER BY cr.strength DESC;
