<div align="center">

# Article To Truth

**三个可独立安装的中文 AI 味评测、去模板化改写和真实感写作 Skill。**

让 Agent 先守住事实、边界和作者意图，再处理语言自然度。

[综合写作](./skills/article-to-truth/SKILL.md) · [独立评分](./skills/truth-score/SKILL.md) · [独立改写](./skills/truth-rewrite/SKILL.md) · [规则库](./skills/article-to-truth/references/patterns.md) · [测试集](./evals/evals.json)

[![Agent Skill](https://img.shields.io/badge/Agent%20Skill-article--to--truth-2563EB)](./skills/article-to-truth/SKILL.md)
[![Skills](https://img.shields.io/badge/skills-3-111827)](./skills)
[![Patterns](https://img.shields.io/badge/patterns-44-10B981)](./skills/article-to-truth/references/patterns.md)
[![License: MIT](https://img.shields.io/badge/license-MIT-10B981)](./LICENSE)

</div>

---

## 这是什么？

Article To Truth 是一组面向智能体写作工具的中文 Skill：`article-to-truth` 负责原创和复合任务，`truth-score` 负责只评分，`truth-rewrite` 负责只改写。三个 Skill 都能单独安装和运行，覆盖中文文章、公众号稿、营销文案、小红书笔记、短视频脚本、邮件、报告、故事和创意草稿。

它不是“绕过检测器”的提示词。它的目标是让文本更真实、更具体、更可信：先保护事实、来源、数字、责任边界、作者意图和文体，再处理语言自然度、信息密度和表达节奏。

技能内置 44 个中文原生 AI 味 pattern，覆盖内容、语言、结构、格式、机器人残留和误判保护。每次评测或改写都应该引用具体 pattern 编号，让用户知道问题来自哪里，而不是只得到一句“AI 味有点重”。

本项目基于 [blader/humanizer](https://github.com/blader/humanizer) 的思路开发，并针对中文文章、中文互联网文体、公众号、小红书、营销文案、短视频脚本、产品介绍和中文 AI 味 pattern 做了本地化扩展。

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

仓库会被识别为 3 个独立 Skill：`article-to-truth`、`truth-score`、`truth-rewrite`。当前 `skills` CLI 在指定 `-a codex` 时会默认安装全部三个；如果其他版本或客户端进入交互选择，保持三个全选即可。

需要无交互地安装全部三个 Skill 时，使用：

```bash
npx skills add https://github.com/kuschzzp/article-to-truth -g -a codex --skill '*' -y
```

只安装其中一个 Skill 时，使用：

```bash
npx skills add https://github.com/kuschzzp/article-to-truth -g -a codex --skill article-to-truth -y
npx skills add https://github.com/kuschzzp/article-to-truth -g -a codex --skill truth-score -y
npx skills add https://github.com/kuschzzp/article-to-truth -g -a codex --skill truth-rewrite -y
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

安装后，可以这样让 Agent 使用这些 Skill：

```text
用 $truth-score 给这段文案打 AI 味分，并指出证据句。
用 $truth-rewrite 把这段产品介绍去 AI 味，不要编造用户反馈。
用 $article-to-truth 先评测这段公众号稿，再改写并给终稿复评。
帮我写一篇发生在县城旧书店里的短篇小说。
用 article-to-truth 写一个 45 秒短视频脚本，不要通用口播模板。
用 article-to-truth 按我的旧文风格，把这篇 AI 初稿改成更自然的版本。
```

在支持技能斜杠调用的工具里，也可以直接调用专项 Skill：

```text
/truth-score 给这段文案打 AI 味分，并指出证据句。
/truth-rewrite 把这段产品介绍去 AI 味，不要编造用户反馈。
```

Codex 的可选 prompt 模板不是裸 `/truth-score`，而是：

```text
/prompts:truth-score 给这段文案打 AI 味分，并指出证据句。
/prompts:truth-rewrite 把这段产品介绍去 AI 味，不要编造用户反馈。
```

三个 Skill 会按各自职责引导 Agent：

1. 判断任务类型：评测、原创生成、改写、评测加改写、规则整理或作者声音校准。
2. 按复合任务引用矩阵读取最小必要资料。
3. 在动笔前锁定事实、数字、来源、承诺范围和作者意图。
4. 匹配文本本身的文体，不把所有内容都改成松弛口语。
5. 使用 44 个 pattern 解释主要问题。
6. 改写时执行“识别 -> 初改 -> 复审 -> 终改”的循环。
7. 避免编造个人经历、用户反馈、模糊权威和无来源数据。
8. 根据用户需求交付干净终稿或结构化评测。

## 三个独立 Skill

| Skill | 用途 | 不处理 |
|---|---|---|
| `article-to-truth` | 从零创作、复合评测改写、作者风格校准、规则与 SOP | 自动路由时不争抢仅评分或仅通用改写 |
| `truth-score` | 对已有文本做真实感评分、AI 味风险判断和问题定位 | 完整改写、从零创作 |
| `truth-rewrite` | 对已有文本做通用去模板化改写 | 从零创作、完整评分、作者风格校准 |

公共 pattern 由仓库中的规范源统一维护，并同步到两个专项 Skill 的目录。安装后的三个 Skill 都只读取自身文件，不依赖兄弟目录。

`truth-score` 的数值是**真实感评分**：`100` 表示更自然、更具体、更可信；同时单独输出“低、较低、中、高、很高”五档 AI 味风险，避免把高分误解为 AI 味更重。

## 工具支持

| 工具 | 推荐调用 | 说明 |
|---|---|---|
| Codex | `$article-to-truth`、`$truth-score`、`$truth-rewrite` 或自然语言点名 | Skill 安装后按任务边界路由。仓库另附可选 prompt 模板，调用形式是 `/prompts:truth-score` 和 `/prompts:truth-rewrite`。 |
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
├── SKILL.md                         # 独立 AI 味评分 Skill
└── references/
    ├── patterns.md                  # 同步的 pattern 规则
    ├── rubric.md                    # 同步的 100 分制量表
    └── examples.md                  # 同步的评测示例
skills/truth-rewrite/
├── SKILL.md                         # 独立去模板化改写 Skill
└── references/
    ├── patterns.md                  # 同步的 pattern 规则
    ├── process.md                   # 同步的改写流程
    └── examples.md                  # 同步的改写示例
scripts/
├── sync-skill-references.mjs        # 同步并检查公共 reference
├── eval-runner.mjs                  # 校验定义并评估已保存输出
├── eval-runner.test.mjs             # 评测运行器单元测试
└── verify-installs.mjs              # 验证单装与默认全量安装
.opencode/commands/
├── truth-score.md                   # OpenCode 评分命令
└── truth-rewrite.md                 # OpenCode 改写命令
integrations/codex/prompts/
├── truth-score.md                   # Codex 可选评分 prompt
└── truth-rewrite.md                 # Codex 可选改写 prompt
evals/
├── README.md                        # 评测运行说明
├── evals.json                       # 三个 Skill 的行为测试集与 assertions
└── trigger-routing.json             # 自然语言触发路由测试集
.codex-plugin/
└── plugin.json                      # Codex 插件元数据
```

## 测试集

固定测试集位于：

```text
evals/evals.json
```

它用于手动冒烟测试和自动断言评测。每个测试项通过 `target_skill` 标明目标 Skill，并用 `assertions` 检查评分方向、风险等级、pattern、事实词保留、职责越界和输出顺序。自然语言触发边界另见 `evals/trigger-routing.json`。

使用方式：

1. 运行 `node scripts/eval-runner.mjs --check` 校验定义。
2. 安装 Skill 后，逐条把 `prompt` 交给目标工具执行。
3. 将结果保存到 `evals/output/<id>.txt`。
4. 运行 `node scripts/eval-runner.mjs --outputs evals/output` 执行确定性断言。
5. 再人工检查文体质量、作者声音和是否编造经历、数据或来源。

完整用法和路由结果格式见 [评测指南](./evals/README.md)。

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
python -m json.tool evals/trigger-routing.json
```

运行评测定义检查和单元测试：

```bash
node scripts/eval-runner.mjs --check
node --test scripts/eval-runner.test.mjs
```

使用固定的 `skills@1.5.17` 验证三个 Skill 的单独安装和默认全量安装：

```bash
node scripts/verify-installs.mjs
```

该脚本只在系统临时目录中安装，结束时自动清理。仓库不配置 GitHub Actions，所有检查均由开发者在本地按需执行。

检查专项 Skill 的 reference 是否与规范源一致：

```bash
node scripts/sync-skill-references.mjs --check
```

查看本地可安装的技能：

```bash
npx skills add ./ -l
```
