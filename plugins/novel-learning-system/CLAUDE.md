# Novel Learning System (网络小说学习系统)

## 项目概述 | Overview

Claude Code 大型插件，用于学习和拆解中文网络小说（最大500万字/本）。从专业网文大神视角进行四维度分析（文笔风格、叙事结构、人物设计、世界观设定），构建知识库供写作 agent 高效检索。

## 核心架构 | Architecture

四阶段流水线:
- **Phase 1 INGEST**: 多格式文件解析 (txt/md/epub/docx) → 零 token
- **Phase 2 SEGMENT**: 正则章节/场景检测 → 零 token
- **Phase 3 ANALYZE**: Agent Teams 四维度并行分析 → ~12-14M tokens/本
- **Phase 4 SYNTHESIZE**: 跨章节综合聚合 → ~260K tokens

## 数据库 | Database

- **Neon PostgreSQL** Project ID: `muddy-credit-26606950`
- **Schema**: `novel_kb` (18 tables + 4 views)
- 写作 agent 检索成本: ~7.5K tokens/次

## 项目结构 | Structure

```
src/
├── parsers/        — 多格式文件解析器
├── segmenter/      — 章节/场景检测器
├── analyzers/      — 四维度分析 prompts + schemas
├── synthesizer/    — Phase 4 聚合
├── db/             — Schema + 查询库
├── mcp-server/     — MCP Server (future)
└── pipeline/       — 流水线编排 + 进度追踪

.claude/
├── agents/         — 5个 Custom Agents
└── skills/         — /learn-novel skill
```

## 入口命令 | Entry Point

```
/learn-novel <文件路径> [--title "书名"] [--author "作者"] [--genre "玄幻"]
```

## 编码规范 | Conventions

- TypeScript strict mode, ESM modules
- 所有 SQL 通过 Neon MCP `run_sql` 执行
- Agent 输出必须严格符合 JSON Schema
- 中英双语注释
