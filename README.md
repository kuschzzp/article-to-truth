<div align="center">

# Article To Truth

**中文文章去模板化、AI 味评测与改写技能。**

把中文文章带回真实、具体、可信的人类表达。

[技能入口](./skills/article-to-truth/SKILL.md) · [规则库](./skills/article-to-truth/references/patterns.md) · [示例](./skills/article-to-truth/references/examples.md) · [测试集](./evals/evals.json)

[![技能](https://img.shields.io/badge/技能-article--to--truth-2563EB)](./skills/article-to-truth/SKILL.md)
[![版本](https://img.shields.io/badge/版本-v0.1.0-111827)](./.codex-plugin/plugin.json)
[![规则](https://img.shields.io/badge/规则-32-10B981)](./skills/article-to-truth/references/patterns.md)
[![许可证: MIT](https://img.shields.io/badge/许可证-MIT-10B981)](./LICENSE)

</div>

---

## Article To Truth 是什么？

Article To Truth 是一个面向智能体写作工具的中文写作技能，用于评测、改写和生成中文文章、公众号稿、营销文案、小红书笔记、短视频脚本、邮件、报告、故事和创意草稿。

它不是“绕过检测器”的提示词。它的目标是让文本更真实、更具体、更可信：先保护事实、来源、数字、责任边界、作者意图和文体，再处理语言自然度、信息密度和表达节奏。

技能内置 32 个中文原生 AI 味 pattern，覆盖内容、语言、结构、格式、机器人残留和误判保护。每次评测或改写都应该引用具体 pattern 编号，让用户知道问题来自哪里，而不是只得到一句“AI 味有点重”。

本技能基于 [blader/humanizer](https://github.com/blader/humanizer) 的思路开发，并针对中文文章、中文互联网文体、公众号、小红书、营销文案、短视频脚本、产品介绍和中文 AI 味 pattern 做了本地化扩展。

## 安装

### Codex

```bash
npx skills add https://github.com/kuschzzp/article-to-truth -g --skill article-to-truth -a codex
```

### Claude Code

```bash
npx skills add https://github.com/kuschzzp/article-to-truth -g --skill article-to-truth -a claude-code
```

### OpenCode

```bash
npx skills add https://github.com/kuschzzp/article-to-truth -g --skill article-to-truth -a opencode
```

### 多客户端安装

```bash
npx skills add https://github.com/kuschzzp/article-to-truth -g --skill article-to-truth -a codex -a claude-code -a opencode
```

### 本地安装

```bash
npx skills add ./ -g --skill article-to-truth -a codex
```

### 更新已安装技能

更新全局安装版本：

```bash
npx skills update article-to-truth -g -y
```

更新项目内安装版本：

```bash
npx skills update article-to-truth -p -y
```

更新全部全局技能：

```bash
npx skills update -g -y
```

### 移除已安装技能

移除全局安装版本：

```bash
npx skills remove article-to-truth -g -y
```

移除项目内安装版本：

```bash
npx skills remove article-to-truth -y
```

只从某个客户端移除：

```bash
npx skills remove article-to-truth -g -a codex -y
```

## 快速开始

安装后，可以这样让智能体使用这个技能：

```text
用 article-to-truth 给这段文案打 AI 味分，并指出证据句。
用 article-to-truth 把这段公众号稿改得更像人写，但不要编造案例。
用 article-to-truth 写一篇小红书笔记，避免通用营销腔。
用 article-to-truth 写一个 45 秒短视频脚本，不要通用口播模板。
按我的旧文风格，把这篇 AI 初稿改成更自然的版本。
```

技能会引导智能体：

1. 判断任务类型：评测、原创生成、改写、评测加改写、规则整理或作者声音校准。
2. 按复合任务引用矩阵读取最小必要资料。
3. 在动笔前锁定事实、数字、来源、承诺范围和作者意图。
4. 匹配文本本身的文体，不把所有内容都改成松弛口语。
5. 使用 32 个 pattern 解释主要问题。
6. 改写时执行“识别 -> 初改 -> 复审 -> 终改”的循环。
7. 避免编造个人经历、用户反馈、模糊权威和无来源数据。
8. 根据用户需求交付干净终稿或结构化评测。

## 规则系统

| 分组 | 关注点 | 示例 |
|---|---|---|
| `C` 内容事实 | 意义膨胀、模糊归因、伪数据、缺少边界 | `C01`, `C03`, `C06` |
| `L` 语言词汇 | 虚浮动词、过度形容、行业黑话、伪人味 | `L02`, `L03`, `L08` |
| `S` 结构句式 | 强行转折、三件套、同义词轮换、伪金句 | `S01`, `S03`, `S05` |
| `F` 格式排版 | 粗体冒号列表、过度标题化、符号装饰 | `F01`, `F02`, `F04` |
| `B` 机器人残留 | 对话残留、能力免责声明、过度顺从 | `B01`, `B02`, `B03` |
| `P` 误判保护 | 正式写作保护、真实人类痕迹保留 | `P01`, `P02` |

完整规则见 [patterns.md](./skills/article-to-truth/references/patterns.md)。

## 工作流程

用于评测和改写时，技能会按这个顺序工作：

1. 锁定事实和承诺范围。
2. 识别最关键的 pattern 命中项。
3. 输出初改版。
4. 复审仍然像 AI 的地方。
5. 输出终稿。
6. 用 pattern 编号解释主要改动。

用于原创生成时，技能会先判断文体、声音、素材密度和高风险 pattern，再直接生成低模板感正文。

## 包含内容

```text
skills/article-to-truth/
├── SKILL.md                         # 技能入口
└── references/
    ├── patterns.md                  # 32 个中文 AI 味 pattern
    ├── process.md                   # 评测与改写流程
    ├── generation.md                # 从零生成写作准则
    ├── voice-calibration.md         # 作者声音校准
    ├── rubric.md                    # 100 分制评测量表
    └── examples.md                  # 前后对比和触发示例
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

它用于手动冒烟测试和后续正式评测，覆盖 AI 味评测、改写、评测加改写、作者风格校准、短视频脚本和产品介绍。当前仓库只提供测试提示集，不包含自动评测脚本。

## 安全边界

Article To Truth 不应该用于伪造真人经历、用户反馈、采访、来源、实验结果或资质。原始素材缺少证据时，智能体应该要求用户补充素材，或者把无来源结论改成有边界的作者判断。

涉及医疗、法律、金融等高风险内容时，技能应保留来源限制和责任边界，不把不确定建议改成确定承诺。

## 开发

检查仓库结构：

```bash
find skills/article-to-truth -maxdepth 2 -type f | sort
```

校验测试集 JSON：

```bash
python -m json.tool evals/evals.json
```

本地安装并做快速测试：

```bash
npx skills add ./ -g --skill article-to-truth -a codex
```
