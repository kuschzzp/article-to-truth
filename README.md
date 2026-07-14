<div align="center">

# Article To Truth

**一个覆盖中文真实感创作、AI 味评测和自然化改写的综合 Skill。**

让 Agent 先守住事实、边界和作者意图，再处理语言自然度。

[技能入口](./skills/article-to-truth/SKILL.md) · [规则库](./skills/article-to-truth/references/patterns.md) · [测试集](./evals/evals.json) · [评测指南](./evals/README.md)

[![Agent Skill](https://img.shields.io/badge/Agent%20Skill-article--to--truth-2563EB)](./skills/article-to-truth/SKILL.md)
[![Skills](https://img.shields.io/badge/skills-1-111827)](./skills)
[![Patterns](https://img.shields.io/badge/patterns-44-10B981)](./skills/article-to-truth/references/patterns.md)
[![License: MIT](https://img.shields.io/badge/license-MIT-10B981)](./LICENSE)

</div>

---

## 这是什么？

Article To Truth 是一个面向智能体写作工具的中文 Skill。它通过同一个入口处理从零创作、真实感评分、AI 味风险定位、自然化改写、先评后改、作者风格校准和写作 SOP。

它不是“绕过检测器”的提示词。它的目标是让文本更真实、更具体、更可信：先保护事实、来源、数字、责任边界、作者意图和文体，再处理语言自然度、信息密度和表达节奏。

技能内置 44 个中文原生 AI 味 pattern，覆盖内容、语言、结构、格式、机器人残留和误判保护。评测会引用具体 pattern 编号和证据句；改写只在需要说明时用 pattern 解释关键改动，不把内部自审过程全部摊给用户。

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

仓库只会被识别为一个 Skill：`article-to-truth`。创作、评分和改写不是额外安装项，而是它根据请求选择的内部模式。

### 移除

```bash
npx skills remove article-to-truth -g -y
```

## 快速开始

安装后直接描述任务即可，不需要记忆评分或改写命令：

```text
帮我写一篇发生在县城旧书店里的短篇小说。
给这段公众号开头做真实感评分，只指出问题，不要改写。
把这段产品介绍改得自然一点，事实和数字不要动。
先评测这篇稿子，再改写并给终稿复评。
参考我的三篇旧文，把这篇 AI 初稿改成我的语气。
给团队制定一份公众号去 AI 味审稿 SOP 和验收标准。
```

也可以显式点名唯一 Skill：

```text
用 $article-to-truth 给这段文案做真实感评分。
用 $article-to-truth 把这篇 AI 初稿改得更自然，不要编造案例。
```

## 一个 Skill，多个内部模式

| 模式 | 何时使用 | 默认输出 |
|---|---|---|
| Generation | 从零写文章、小说、故事、公众号、文案、脚本、邮件或报告 | 用户要求的正文 |
| Evaluation | 只检测已有文本 | 真实感评分、AI 味风险、pattern 证据和修改优先级 |
| Rewrite | 只改写已有文本 | 终稿和必要的改动说明 |
| Evaluation And Rewrite | 先评测、再改写、最后复评 | 原文评测、终稿和终稿复评 |
| Voice Calibration | 参考作者样稿创作或改写 | 风格观察和校准后的正文 |
| Rules And Review | 制定规则、SOP、验收标准或综合审稿 | 可执行规则或审稿结果 |

模式只用于 Skill 内部决策，不会作为新的安装项或命令暴露。

## 评分语义

数值是**真实感评分**：`100` 表示更自然、更具体、更可信。技能同时单独输出“低、较低、中、高、很高”五档 AI 味风险，避免把高分误解为 AI 味更重。

```text
真实感评分：xx/100（越高越自然）
AI 味风险：低 / 较低 / 中 / 高 / 很高
```

只要求评分时，默认不输出完整改写稿；只要求改写时，默认不展开完整评分报告。

## 工具支持

| 工具 | 推荐调用 | 说明 |
|---|---|---|
| Codex | `$article-to-truth` 或自然语言描述任务 | Skill 根据最终目标选择内部模式。 |
| Claude Code | `/article-to-truth` 或自然语言描述任务 | 只有一个可调用 Skill。 |
| OpenCode | 安装后自然语言描述任务 | 不提供额外项目级命令文件。 |

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

1. 判断用户最终需要只评分、只改写还是复合处理。
2. 锁定事实、数字、来源和承诺范围。
3. 识别最关键的 pattern 命中项。
4. 改写时在内部完成初改和复审。
5. 默认输出终稿和必要的简短改动说明，不展示内部过程。
6. 用 pattern 编号解释主要问题或改动。

用于原创生成时，技能会先判断文体、声音、素材密度和高风险 pattern，再生成低模板感正文。短视频脚本会优先处理画面、旁白、字幕和节奏点；产品介绍会优先说明产品是什么、谁使用、解决哪一步问题和适用边界。

## 仓库结构

```text
skills/article-to-truth/
├── SKILL.md                         # 唯一技能入口与内部模式
└── references/
    ├── patterns.md                  # 44 个中文 AI 味 pattern
    ├── process.md                   # 评测与改写流程
    ├── generation.md                # 从零生成写作准则
    ├── voice-calibration.md         # 作者声音校准
    ├── rubric.md                    # 100 分制评测量表
    └── examples.md                  # 前后对比和触发示例
scripts/
├── eval-runner.mjs                  # 校验定义并评估已保存输出
├── eval-runner.test.mjs             # 评测运行器单元测试
├── model-regression.mjs              # 隔离运行真实 Codex 模型回归
├── model-regression.test.mjs         # 模型回归工具单元测试
└── verify-installs.mjs              # 验证显式安装与默认安装
evals/
├── README.md                        # 评测运行说明
├── evals.json                       # 各内部模式的行为测试与 assertions
└── trigger-routing.json             # Skill 触发与不触发测试
.codex-plugin/
└── plugin.json                      # Codex 插件元数据
```

## 测试集

固定测试集位于 `evals/evals.json`。每个测试项用 `assertions` 检查评分方向、风险等级、pattern、事实词、日期、数字、否定边界和输出顺序。自然语言触发边界另见 `evals/trigger-routing.json`。

使用方式：

1. 运行 `node scripts/eval-runner.mjs --check` 校验定义。
2. 安装 Skill 后，逐条把 `prompt` 交给目标工具执行。
3. 将结果保存到 `evals/output/<id>.txt`。
4. 运行 `node scripts/eval-runner.mjs --outputs evals/output` 执行确定性断言。
5. 再人工检查文体质量、作者声音和是否编造经历、数据或来源。

完整用法和路由结果格式见 [评测指南](./evals/README.md)。

## 真实模型回归

`model-regression.mjs` 使用 `codex exec` 在隔离工作区中比较两个版本：

- `candidate`：当前工作树中的单一 `article-to-truth` Skill。
- `released`：Git 引用 `fe14b7f` 中已经发布的三 Skill 版本；评分和改写入口会归一为同一能力后比较。

脚本会隔离全局 `.agents/skills`，复用现有 `CODEX_HOME` 的登录状态，固定模型与 reasoning effort，使用只读 sandbox，并在结束或中断时清理临时工作区。原始输出、JSONL 事件、断言结果和汇总报告保存在已忽略的 `evals/output/<timestamp>-<model>/`。

先运行小规模冒烟回归：

```bash
node scripts/model-regression.mjs --smoke --model gpt-5.6-sol --reasoning-effort medium
```

完整回归并增加匿名 A/B 质量比较：

```bash
node scripts/model-regression.mjs --full --model gpt-5.6-sol --reasoning-effort medium --compare
```

模型回归会产生真实调用成本。首次验证脚本时可以限制到少量 case：

```bash
node scripts/model-regression.mjs --smoke --cases 1,2,15,16 --runs 1 --routing-runs 1 --reasoning-effort medium
```

候选版质量门槛为：路由命中率至少 95%，负向路由和关键事实断言 100%，其他断言至少 95%，同一评分锚点多次运行的最大差值不超过 8 分。失败用例会显式调用 `$article-to-truth` 再跑一次，用于区分触发问题与 Skill 正文问题。

## 安全边界

Article To Truth 不应该用于伪造真人经历、用户反馈、采访、来源、实验结果或资质。原始素材缺少证据时，智能体应该要求用户补充素材，或者把无来源结论改成有边界的作者判断。

涉及医疗、法律、金融等高风险内容时，技能应保留来源限制和责任边界，不把不确定建议改成确定承诺。

## 本地开发检查

```bash
python -m json.tool evals/evals.json
python -m json.tool evals/trigger-routing.json
python -m json.tool .codex-plugin/plugin.json
node scripts/eval-runner.mjs --check
node --test scripts/eval-runner.test.mjs
node --test scripts/model-regression.test.mjs
node scripts/model-regression.mjs --dry-run
node scripts/verify-installs.mjs
npx --yes skills@1.5.17 add ./ -l
```

`verify-installs.mjs` 使用隔离的系统临时目录和 npm 缓存，验证显式安装与默认安装都只得到 `article-to-truth`，结束时会自动清理。

仓库不配置 GitHub Actions，所有检查均由开发者在本地按需执行。
