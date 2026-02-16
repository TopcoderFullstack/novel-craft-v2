---
name: novel-learning
description: 学习一本网络小说，拆解为文笔风格、叙事结构、人物设计、世界观设定四个维度的知识库 | Learn a web novel and decompose it into a 4-dimension knowledge base
user-invokable: true
---

# /learn-novel — 网络小说学习系统

## 用法 | Usage

```
/learn-novel <file_path> [--title "书名"] [--author "作者"] [--genre "玄幻"]
```

## 功能 | What It Does

从一本中文网络小说（最大1500万字）中学习并构建全维度知识库：

1. **文件解析**: 支持 .txt / .md / .epub / .docx 格式，自动检测编码
2. **章节切分**: 自动检测 第X章/第X卷 等章节标记，切分为 卷→章→场景 层级
3. **四维度分析** (Agent Teams 并行):
   - 文笔风格: 句式、词汇、修辞、对话风格、节奏
   - 叙事结构: 节奏、悬念、伏笔、高潮、冲突
   - 人物设计: 角色追踪、对话指纹、关系网络
   - 世界观设定: 力量体系、世界规则、地点、势力、金手指
4. **综合聚合**: 情节弧段检测、角色关系图、分层摘要、伏笔配对

## 执行步骤 | Steps

当用户调用 /learn-novel 时，按以下步骤执行：

### Step 1: 解析文件
```
使用 src/parsers/ 解析小说文件
检测编码、提取文本、获取元数据
```

### Step 2: 写入数据库
```
通过 Neon MCP (Project: muddy-credit-26606950) 执行 SQL:
- INSERT INTO novel_kb.novels
- 获取返回的 novel_id
```

### Step 3: 切分章节
```
使用 src/segmenter/ 检测章节和场景
将结果写入 novel_kb.chapters 和 novel_kb.scenes
创建 novel_kb.jobs 追踪记录
```

### Step 4: 启动分析团队
```
创建 Agent Team (novel-analyzer-{novel_id})
启动 4 个分析器 Teammate:
- style-analyzer (使用 .claude/agents/style-analyzer.md)
- narrative-analyzer (使用 .claude/agents/narrative-analyzer.md)
- character-analyzer (使用 .claude/agents/character-analyzer.md)
- world-analyzer (使用 .claude/agents/world-analyzer.md)
```

### Step 5: 监控进度
```
定期查询 novel_kb.jobs 和 novel_kb.job_steps
向用户报告进度:
- 文笔分析: XX/总章节
- 叙事分析: XX/总章节
- 人物分析: XX/总章节
- 世界观分析: XX/总章节
```

### Step 6: 综合聚合
```
所有维度分析完成后:
- 检测情节弧段 → novel_kb.plot_arcs
- 构建角色关系图 → novel_kb.character_relationships
- 生成全书摘要 → novel_kb.novels.novel_summary
- 标记状态为 'completed'
```

## 数据库信息 | Database

- **Neon Project ID**: muddy-credit-26606950
- **Schema**: novel_kb
- **18 tables + 4 views**
- 使用 Neon MCP 的 `run_sql` tool 执行所有 SQL 操作

## 查询知识库 | Query Knowledge Base

学习完成后，写作 agent 可以使用以下 SQL 查询获取写作上下文（~7.5K tokens）：

```sql
-- 角色卡片
SELECT * FROM novel_kb.v_character_card WHERE novel_id = '<id>';

-- 文笔风格
SELECT * FROM novel_kb.v_style_summary WHERE novel_id = '<id>';

-- 世界规则
SELECT * FROM novel_kb.v_world_rules_compact WHERE novel_id = '<id>';

-- 力量体系
SELECT system_name, tiers, rules FROM novel_kb.power_systems WHERE novel_id = '<id>';

-- 近期章节摘要
SELECT chapter_number, title, summary FROM novel_kb.chapters
WHERE novel_id = '<id>' AND chapter_number BETWEEN X AND Y ORDER BY chapter_number;

-- 当前弧段
SELECT * FROM novel_kb.plot_arcs WHERE novel_id = '<id>' AND start_chapter <= N AND end_chapter >= N;
```
