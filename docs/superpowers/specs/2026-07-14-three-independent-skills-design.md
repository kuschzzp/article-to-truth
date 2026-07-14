# Three Independent Skills Design

## Goal

将仓库中的 `article-to-truth`、`truth-score`、`truth-rewrite` 从“完整技能 + 两个依赖兄弟目录的轻量入口”调整为三个同级、可单独安装、可独立运行的 Agent Skill，同时保持同一套中文 AI 味 pattern 和事实保护规则。

完成后，安装整个仓库会发现三个 Skill；单独安装任意一个 Skill 时，其工作流和引用文件仍然完整，不依赖其他 Skill 是否存在。

## Selected Approach

采用“发布产物自包含，仓库规则单源维护”的结构：

- `article-to-truth` 保留完整规则库，并作为共享 reference 的规范源。
- `truth-score` 在自己的目录中携带评分所需的 `patterns.md`、`rubric.md` 和按需示例。
- `truth-rewrite` 在自己的目录中携带改写所需的 `patterns.md`、`process.md` 和按需示例。
- 仓库提供同步检查脚本，将规范源中的选定 reference 复制到两个专项 Skill，并支持在本地检查副本是否漂移。
- 三个 `SKILL.md` 各自写全核心契约、边界与工作流，不再读取 `../article-to-truth/SKILL.md`。

这种结构让安装后的每个目录满足 Skill 自包含要求，同时避免维护者手工同步 500 多行 pattern。

## Alternatives Considered

### Keep Lightweight Wrappers

继续让 `truth-score` 和 `truth-rewrite` 通过 `../article-to-truth/` 读取规则。代码量最小，但单独安装时引用失效，且依赖安装器保留兄弟目录布局，因此不采用。

### Maintain Three Fully Separate Rule Sets

在三个目录中手工维护各自规则。安装最独立，但公共 pattern 容易逐渐出现编号、措辞和安全边界不一致，因此不采用。

### Generate All Three Skills From A Separate Source Tree

在 `source/` 中维护规则，再生成三个完整 Skill。边界最纯粹，但会让当前小型仓库多出一层构建系统；现阶段收益不足。若未来出现更多专项 Skill，可再迁移到这种结构。

## Skill Responsibilities

### article-to-truth

负责：

- 从零创作中文文章、小说、故事、公众号、营销文案、脚本、邮件和报告。
- 同时包含评测与改写的复合任务。
- 作者样稿分析与声音校准。
- 写作规则、SOP、验收标准和其他需要组合多套规则的任务。
- 用户明确点名 `article-to-truth` 的任务。

不主动争抢：仅评分现有文本、仅做通用改写现有文本。

### truth-score

只负责对用户提供的现有中文文本进行 AI 味评分、自然度或模板感检测、证据定位和修改优先级排序。

- 默认不输出完整改写稿。
- 不负责从零创作。
- 用户同时要求改写时，交由 `article-to-truth` 处理复合任务。

### truth-rewrite

只负责对用户提供的现有中文文本进行通用去模板化改写，保留事实、范围、责任边界和作者意图。

- 默认不执行完整评分流程。
- 不负责从零创作。
- 作者风格校准或“先评分再改写”等复合任务交由 `article-to-truth`。

## Routing Examples

| 用户请求 | 预期 Skill |
|---|---|
| “帮我写一篇小说” | `article-to-truth` |
| “给这段文案打 AI 味分，不要改写” | `truth-score` |
| “把这段产品介绍改得自然一点” | `truth-rewrite` |
| “先检测这篇稿子，再重写并复评” | `article-to-truth` |
| “按我的旧文风格改写这段初稿” | `article-to-truth` |

三个 frontmatter `description` 必须包含正向触发条件和排除条件，减少自然语言路由重叠。显式点名 Skill 时，以用户点名为准。

## Directory Layout

```text
skills/
├── article-to-truth/
│   ├── SKILL.md
│   └── references/
│       ├── patterns.md
│       ├── process.md
│       ├── generation.md
│       ├── voice-calibration.md
│       ├── rubric.md
│       └── examples.md
├── truth-score/
│   ├── SKILL.md
│   └── references/
│       ├── patterns.md
│       ├── rubric.md
│       └── examples.md
└── truth-rewrite/
    ├── SKILL.md
    └── references/
        ├── patterns.md
        ├── process.md
        └── examples.md
scripts/
└── sync-skill-references.mjs
```

专项 Skill 只能引用自身目录下的相对路径，例如 `references/patterns.md`。任何 `../article-to-truth/` 引用都视为失败。

## Reference Synchronization

`scripts/sync-skill-references.mjs` 使用 Node.js 标准库，不引入项目依赖，并提供两种模式：

- 默认模式：把规范源文件同步到两个专项 Skill。
- `--check`：只比较内容；发现缺失或不一致时返回非零状态，不修改文件。

生成的副本提交到 Git，使远程和本地安装都能直接得到完整 Skill，不要求用户先运行构建步骤。脚本只同步映射表中声明的文件，不删除目录中的其他内容。

## Installation Contract

仓库级安装必须暴露三个 Skill。文档区分两种行为：

- 交互式安装：`npx skills add <repo> -g -a codex`，由 CLI 展示仓库中的三个 Skill 供用户选择。
- 确定性全量安装：追加 `--skill '*' -y`，保证非交互安装三个 Skill。

文档同时给出三个 Skill 的单独安装命令。不能把外部 CLI 的交互默认值描述成仓库自身保证；仓库能保证的是可发现、可全选、可单装。

## Evaluation And Verification

保留 `skill-creator` 约定的聚合入口 `evals/evals.json`，在每个测试项中标注目标 Skill，并按职责分组覆盖：

- `article-to-truth`：原创生成、复合评测改写、风格校准和 SOP。
- `truth-score`：只评分、误判保护和高风险文本边界。
- `truth-rewrite`：只改写、事实保护和文体保护。

另增 `evals/trigger-routing.json`，记录自然语言请求应触发或不应触发哪个 Skill，重点覆盖三个 description 的边界。

结构验证至少包括：

1. 三个 `SKILL.md` frontmatter 合法且名称与目录一致。
2. 仓库扫描能够发现三个 Skill。
3. 每个 Skill 分别安装到隔离目录后，所有本地 reference 路径存在。
4. `rg` 不再发现专项 Skill 引用 `../article-to-truth/`。
5. 同步脚本 `--check` 通过。
6. 两份 eval JSON 均能解析，且每个测试项都能明确归属目标 Skill 或路由预期。

## Documentation And Compatibility

README 将三个目录称为“独立 Skill”，不再称 `truth-score` 和 `truth-rewrite` 为“轻量入口”。Codex prompt 和 OpenCode command 继续作为可选显式命令适配层，但它们不承担 Skill 独立性的职责，也不由 `npx skills add` 自动安装。

`.codex-plugin/plugin.json` 继续使用 `"skills": "./skills/"` 暴露三个 Skill，并更新说明文字，避免暗示两个专项 Skill 依赖主 Skill。

## Non-Goals

- 不改变 44 个 pattern 的编号和语义。
- 不新增网络服务、运行时依赖或自动内容评分模型。
- 不承诺所有宿主模型都能 100% 确定性路由；通过互斥描述和 eval 提高触发准确率。
- 不删除现有 Codex prompt 或 OpenCode command 兼容文件。

## Acceptance Criteria

- 任意一个 Skill 单独安装后都能完成其声明的任务，不读取兄弟目录。
- “帮我写一篇小说”预期路由到 `article-to-truth`。
- 仅评分和仅通用改写分别路由到 `truth-score`、`truth-rewrite`。
- 复合任务由 `article-to-truth` 处理。
- README 的安装命令与 `npx skills` 实际参数一致。
- 共享 reference 不存在未检测的内容漂移。
