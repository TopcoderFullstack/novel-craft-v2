---
description: Learn a web novel and build a 4-dimension knowledge base (style, narrative, characters, world) | 学习网络小说，构建四维知识库
argument-hint: <file_path> [--title "书名"] [--genre "玄幻"]
allowed-tools: [Read, Glob, Grep, Bash, Task, TeamCreate, SendMessage, TodoWrite]
---

# /learn-novel — 网络小说学习系统

You have been invoked as the `/learn-novel` command. The user wants to learn from a Chinese web novel.

## Arguments

The user provided: $ARGUMENTS

Parse the arguments:
- `file_path` (required): Path to the novel file (.txt / .md / .epub / .docx)
- `--title` (optional): Novel title (will auto-detect from filename if not provided)
- `--genre` (optional): Genre tag (e.g. 玄幻, 仙侠, 都市, 科幻)

## Execution Pipeline

### Phase 1: INGEST (文件摄入)
1. Read the novel file using the parsers in `src/parsers/`
2. Auto-detect encoding (UTF-8, GBK, GB2312)
3. Extract raw text content

### Phase 2: SEGMENT (章节切分)
1. Use `src/segmenter/chapter-detector.ts` to detect chapters
2. Use `src/segmenter/scene-splitter.ts` to detect scenes within chapters
3. Write novel, volume, chapter, and scene records to Neon PostgreSQL

### Phase 3: ANALYZE (四维分析)
Launch Agent Teams with 4 parallel analyzers:
- **style-analyzer**: 文笔风格 (句式、词汇、修辞、对话、节奏)
- **narrative-analyzer**: 叙事结构 (节奏、悬念、伏笔、冲突、章节功能)
- **character-analyzer**: 人物设计 (角色追踪、对话指纹、关系网络)
- **world-analyzer**: 世界观设定 (力量体系、世界规则、地点、势力)

### Phase 4: SYNTHESIZE (综合聚合)
- Plot arc detection (情节弧段检测)
- Character relationship graph (角色关系图)
- Hierarchical summaries (分层摘要)
- Foreshadowing pairing (伏笔配对)

## Database

- **Neon Project**: muddy-credit-26606950
- **Schema**: novel_kb (18 tables + 4 views)
- Use Neon MCP `run_sql` tool for all SQL operations

## Progress Reporting

Report progress to the user after each phase completes:
- Total characters / chapters detected
- Analysis progress per dimension (X/total chapters)
- Estimated remaining time

## Error Handling

- If file not found: inform user and suggest checking the path
- If encoding detection fails: try UTF-8 first, then GBK
- If analysis fails mid-way: record checkpoint in `novel_kb.job_steps`, can resume later
