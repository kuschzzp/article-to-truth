<div align="center">

# Article To Truth

**中文文章与文案的 AI 味评分、去模板化改写和真实感写作技能。**

让 Agent 先守住事实、边界和作者意图，再处理语言自然度。

[技能入口](./skills/article-to-truth/SKILL.md) · [评分入口](./skills/truth-score/SKILL.md) · [改写入口](./skills/truth-rewrite/SKILL.md) · [规则库](./skills/article-to-truth/references/patterns.md) · [测试集](./evals/evals.json)

[![Agent Skill](https://img.shields.io/badge/Agent%20Skill-article--to--truth-2563EB)](./skills/article-to-truth/SKILL.md)
[![Skills](https://img.shields.io/badge/skills-3-111827)](./skills)
[![Patterns](https://img.shields.io/badge/patterns-44-10B981)](./skills/article-to-truth/references/patterns.md)
[![License: MIT](https://img.shields.io/badge/license-MIT-10B981)](./LICENSE)

</div>

---

## 这是什么？

Article To Truth 是一个面向智能体写作工具的中文写作技能，用于评测、改写和生成中文文章、公众号稿、营销文案、小红书笔记、短视频脚本、邮件、报告、故事和创意草稿。

它不是“绕过检测器”的提示词。它的目标是让文本更真实、更具体、更可信：先保护事实、来源、数字、责任边界、作者意图和文体，再处理语言自然度、信息密度和表达节奏。

技能内置 44 个中文原生 AI 味 pattern，覆盖内容、语言、结构、格式、机器人残留和误判保护。每次评测或改写都应该引用具体 pattern 编号，让用户知道问题来自哪里，而不是只得到一句“AI 味有点重”。

本技能基于 [blader/humanizer](https://github.com/blader/humanizer) 的思路开发，并针对中文文章、中文互联网文体、公众号、小红书、营销文案、短视频脚本、产品介绍和中文 AI 味 pattern 做了本地化扩展。

## 安装

### Codex

```bash
npx skills add https://github.com/kuschzzp/article-to-truth -g -a codex
```

### Claude Code

```bash
npx skills add https://github.com/kuschzzp/article-to-truth -g -a claude-code
```

### OpenCode

```bash
npx skills add https://github.com/kuschzzp/article-to-truth -g -a opencode
```

### 多客户端同时安装

```bash
npx skills add https://github.com/kuschzzp/article-to-truth -g -a codex -a claude-code -a opencode
```

### 从本地仓库安装

```bash
npx skills add ./ -g -a codex
```

默认会安装 3 个技能入口：`article-to-truth`、`truth-score`、`truth-rewrite`。如果只想安装完整技能本体，可以指定：

```bash
npx skills add https://github.com/kuschzzp/article-to-truth -g --skill article-to-truth -a codex
```

### 更新已安装的技能

```bash
npx skills update -g -y
```

### 移除已安装的技能

```bash
npx skills remove article-to-truth -g -y
npx skills remove truth-score -g -y
npx skills remove truth-rewrite -g -y
```

只从某个客户端移除：

```bash
npx skills remove article-to-truth -g -a codex -y
npx skills remove truth-score -g -a codex -y
npx skills remove truth-rewrite -g -a codex -y
```

## 快速开始

安装后，可以这样让 Agent 使用这个技能：

```text
用 $truth-score 给这段文案打 AI 味分，并指出证据句。
用 $truth-rewrite 把这段产品介绍去 AI 味，不要编造用户反馈。
用 $article-to-truth 把这段公众号稿改得更像人写，但不要编造案例。
用 article-to-truth 写一篇小红书笔记，避免通用营销腔。
用 article-to-truth 写一个 45 秒短视频脚本，不要通用口播模板。
按我的旧文风格，把这篇 AI 初稿改成更自然的版本。
```

在支持技能斜杠调用的工具里，也可以直接调用轻量入口：

```text
/truth-score 给这段文案打 AI 味分，并指出证据句。
/truth-rewrite 把这段产品介绍去 AI 味，不要编造用户反馈。
```

Codex 的可选 prompt 模板不是裸 `/truth-score`，而是：

```text
/prompts:truth-score 给这段文案打 AI 味分，并指出证据句。
/prompts:truth-rewrite 把这段产品介绍去 AI 味，不要编造用户反馈。
```

技能会引导 Agent：

1. 判断任务类型：评测、原创生成、改写、评测加改写、规则整理或作者声音校准。
2. 按复合任务引用矩阵读取最小必要资料。
3. 在动笔前锁定事实、数字、来源、承诺范围和作者意图。
4. 匹配文本本身的文体，不把所有内容都改成松弛口语。
5. 使用 44 个 pattern 解释主要问题。
6. 改写时执行“识别 -> 初改 -> 复审 -> 终改”的循环。
7. 避免编造个人经历、用户反馈、模糊权威和无来源数据。
8. 根据用户需求交付干净终稿或结构化评测。

## 技能入口

| 入口 | 用途 | 默认输出 |
|---|---|---|
| `article-to-truth` | 完整写作、评测、改写、原创生成和作者风格校准 | 按任务自动选择流程 |
| `truth-score` | 文案 AI 味评分 | 评分、pattern、证据句、扣分说明和修改优先级 |
| `truth-rewrite` | 通用去 AI 味改写 | 命中 pattern、终稿和简短改动说明 |

`truth-score` 和 `truth-rewrite` 只是轻量入口，规则仍然来自 `article-to-truth` 的 pattern、量表和改写流程，不维护第二套规则。

## 工具支持

| 工具 | 推荐调用 | 说明 |
|---|---|---|
| Codex | `$article-to-truth`、`$truth-score`、`$truth-rewrite` 或自然语言点名 | 技能安装后优先走技能入口。仓库另附可选 prompt 模板，调用形式是 `/prompts:truth-score` 和 `/prompts:truth-rewrite`。 |
| Claude Code | `/article-to-truth`、`/truth-score`、`/truth-rewrite` | Claude Code 可以把技能作为斜杠技能调用，因此仓库不再提供重复的 `.claude/commands` 文件。 |
| OpenCode | 技能调用，或使用仓库内 `.opencode/commands/*.md` | `.opencode/commands` 是 OpenCode 的原生命令文件，可按需复制到全局目录。 |

### OpenCode 可选斜杠命令

仓库保留两个项目级 OpenCode 命令：

```text
.opencode/commands/truth-score.md
.opencode/commands/truth-rewrite.md
```

如果想全局使用：

```bash
mkdir -p ~/.config/opencode/commands
cp .opencode/commands/truth-*.md ~/.config/opencode/commands/
```

### Codex 可选 prompt 模板

仓库提供两个 Codex prompt 模板，用于本地自定义调用：

```text
integrations/codex/prompts/truth-score.md
integrations/codex/prompts/truth-rewrite.md
```

安装到本机 Codex：

```bash
mkdir -p ~/.codex/prompts
cp integrations/codex/prompts/truth-*.md ~/.codex/prompts/
```

安装后调用形式是 `/prompts:truth-score` 和 `/prompts:truth-rewrite`。这不是 `npx skills add` 自动生成的入口，只是可选兼容模板。

## 规则系统

| 分组 | 关注点 | 示例 |
|---|---|---|
| `C` 内容事实 | 意义膨胀、模糊归因、伪数据、缺少边界、作文式通用细节、细节平均分配 | `C01`, `C03`, `C09`, `C10` |
| `L` 语言词汇 | 虚浮动词、过度形容、行业黑话、伪人味、教学解释腔、过度中性、精修无毛边 | `L02`, `L03`, `L09`, `L11`, `L12` |
| `S` 结构句式 | 强行转折、三件套、伪金句、过度结构化、过顺低跳跃、无旁枝叙事、可预测句法 | `S01`, `S03`, `S09`, `S11`, `S12` |
| `F` 格式排版 | 粗体冒号列表、过度标题化、符号装饰 | `F01`, `F02`, `F04` |
| `B` 机器人残留 | 对话残留、能力免责声明、过度顺从 | `B01`, `B02`, `B03` |
| `P` 误判保护 | 正式写作保护、真实人类痕迹保留、不把毛边误判成低质 | `P01`, `P02`, `P03` |

完整规则见 [patterns.md](./skills/article-to-truth/references/patterns.md)。

## 工作流程

用于评测和改写时，技能会按这个顺序工作：

1. 锁定事实和承诺范围。
2. 识别最关键的 pattern 命中项。
3. 根据任务决定只评分、只改写，还是先评测再改写。
4. 改写时先出初改版，再复审仍然像 AI 的地方。
5. 输出终稿。
6. 用 pattern 编号解释主要改动。

用于原创生成时，技能会先判断文体、声音、素材密度和高风险 pattern，再生成低模板感正文。短视频脚本会优先处理画面、旁白、字幕和节奏点；产品介绍会优先说明产品是什么、谁使用、解决哪一步问题和适用边界。

## 包含什么？

```text
skills/article-to-truth/
├── SKILL.md                         # 完整技能入口
└── references/
    ├── patterns.md                  # 44 个中文 AI 味 pattern
    ├── process.md                   # 评测与改写流程
    ├── generation.md                # 从零生成写作准则
    ├── voice-calibration.md         # 作者声音校准
    ├── rubric.md                    # 100 分制评测量表
    └── examples.md                  # 前后对比和触发示例
skills/truth-score/
└── SKILL.md                         # 文案 AI 味评分入口
skills/truth-rewrite/
└── SKILL.md                         # 通用去 AI 味改写入口
.opencode/commands/
├── truth-score.md                   # OpenCode 评分命令
└── truth-rewrite.md                 # OpenCode 改写命令
integrations/codex/prompts/
├── truth-score.md                   # Codex 可选评分 prompt
└── truth-rewrite.md                 # Codex 可选改写 prompt
evals/
└── evals.json                       # 固定测试提示集
.codex-plugin/
└── plugin.json                      # Codex 插件元数据
```

## 测试集

固定测试集位于：

```text
evals/evals.json
```

它用于手动冒烟测试和后续正式评测，覆盖 AI 味评测、改写、评测加改写、作者风格校准、短视频脚本、产品介绍、轻量技能入口和可选命令入口。

使用方式：

1. 先校验 JSON 是否有效。
2. 安装本技能后，逐条把 `prompt` 交给目标工具执行。
3. 对照 `expected_output` 检查是否包含评分、pattern 编号、证据句、终稿、改动说明和安全边界。
4. 如果输出编造数据、用户反馈、采访、来源或个人经历，视为失败。

当前仓库只提供测试提示集，不内置自动评分脚本。

## 安全边界

Article To Truth 不应该用于伪造真人经历、用户反馈、采访、来源、实验结果或资质。原始素材缺少证据时，智能体应该要求用户补充素材，或者把无来源结论改成有边界的作者判断。

涉及医疗、法律、金融等高风险内容时，技能应保留来源限制和责任边界，不把不确定建议改成确定承诺。

## 开发

检查仓库结构：

```bash
find skills -maxdepth 3 -type f | sort
```

校验测试集 JSON：

```bash
python -m json.tool evals/evals.json
```

查看本地可安装的技能：

```bash
npx skills add ./ -l
```
