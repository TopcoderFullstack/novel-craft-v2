# novel-craft-v2

Chinese web novel writing toolkit - Claude Code plugin marketplace.

中文网络小说创作工具集 — Claude Code 插件市场。

## Plugins

### novel-learning-system (v1.0.0)

Learn and deconstruct Chinese web novels (up to 15M characters) across 4 dimensions:

从专业网文大神视角拆解小说，四维分析构建全维度知识库：

- **Writing Style** (文笔风格): Sentence patterns, vocabulary, rhetoric, dialogue style, rhythm
- **Narrative Structure** (叙事结构): Pacing, suspense, foreshadowing, conflicts, chapter function
- **Character Design** (人物设计): Character tracking, dialogue fingerprints, relationship networks
- **World Building** (世界观设定): Power systems, world rules, locations, factions

### Features

- Multi-format support: `.txt` / `.md` / `.epub` / `.docx`
- Auto encoding detection (UTF-8, GBK, GB2312)
- Regex-based chapter detection for Chinese novel formats
- 4-way parallel analysis via Agent Teams
- Neon PostgreSQL knowledge base (18 tables + 4 views)
- Efficient retrieval for writing agents (~7.5K tokens per query)

## Installation

In Claude Code:

```
/install novel-craft-v2
```

Then select `novel-learning-system` to install.

## Usage

After installation, use in Claude Code:

```
/learn-novel /path/to/novel.txt --title "Book Name" --genre "玄幻"
```

## License

MIT
