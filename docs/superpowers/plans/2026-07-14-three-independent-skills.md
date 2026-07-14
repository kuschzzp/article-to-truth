# Three Independent Skills Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `article-to-truth`、`truth-score`、`truth-rewrite` 重构为三个职责清晰、目录自包含、可分别安装的 Agent Skill。

**Architecture:** `skills/article-to-truth/references/` 继续作为公共规则的规范源，Node.js 同步脚本将评分与改写所需文件生成到两个专项 Skill 内。三个 `SKILL.md` 使用互斥 description 和本地 reference 路径；README、适配命令、插件元数据和 eval 同步表达这套路由。

**Tech Stack:** Markdown、YAML frontmatter、JSON、Node.js 标准库、`npx skills` CLI。

## Global Constraints

- 任意一个 Skill 单独安装后都必须能完成声明任务，不得读取兄弟目录。
- 不改变现有 44 个 pattern 的编号和语义。
- 不新增 npm 依赖、网络服务或自动内容评分模型。
- 生成的 reference 副本必须提交到 Git，用户安装后无需运行构建步骤。
- `article-to-truth` 负责原创、复合任务、声音校准和 SOP；`truth-score` 只评分；`truth-rewrite` 只做通用改写。
- 保留 Codex prompt 和 OpenCode command 兼容文件，但让它们只指向对应专项 Skill。
- 保留 `evals/evals.json` 作为聚合评测入口，并新增 `evals/trigger-routing.json`。
- 未经用户明确允许，不创建 Git commit；本计划执行结果保留为工作区修改。

---

### Task 1: Self-Contained Reference Bundles

**Files:**
- Create: `scripts/sync-skill-references.mjs`
- Create: `skills/truth-score/references/patterns.md`
- Create: `skills/truth-score/references/rubric.md`
- Create: `skills/truth-score/references/examples.md`
- Create: `skills/truth-rewrite/references/patterns.md`
- Create: `skills/truth-rewrite/references/process.md`
- Create: `skills/truth-rewrite/references/examples.md`

**Interfaces:**
- Consumes: canonical files under `skills/article-to-truth/references/`.
- Produces: `node scripts/sync-skill-references.mjs` for synchronization and `node scripts/sync-skill-references.mjs --check` for read-only drift detection.

- [ ] **Step 1: Verify the current package is not self-contained**

Run:

```bash
test ! -d skills/truth-score/references
test ! -d skills/truth-rewrite/references
```

Expected: both commands exit `0`, proving the reference bundles do not exist yet.

- [ ] **Step 2: Add the synchronization script**

Create `scripts/sync-skill-references.mjs` with this implementation:

```javascript
#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const checkOnly = process.argv.includes("--check");
const unknownArguments = process.argv.slice(2).filter((argument) => argument !== "--check");

if (unknownArguments.length > 0) {
  console.error(`Unknown argument: ${unknownArguments.join(" ")}`);
  process.exit(2);
}

const mappings = [
  {
    source: "skills/article-to-truth/references/patterns.md",
    targets: [
      "skills/truth-score/references/patterns.md",
      "skills/truth-rewrite/references/patterns.md",
    ],
  },
  {
    source: "skills/article-to-truth/references/rubric.md",
    targets: ["skills/truth-score/references/rubric.md"],
  },
  {
    source: "skills/article-to-truth/references/process.md",
    targets: ["skills/truth-rewrite/references/process.md"],
  },
  {
    source: "skills/article-to-truth/references/examples.md",
    targets: [
      "skills/truth-score/references/examples.md",
      "skills/truth-rewrite/references/examples.md",
    ],
  },
];

let hasDrift = false;

for (const mapping of mappings) {
  const sourcePath = resolve(repositoryRoot, mapping.source);
  const sourceContent = await readFile(sourcePath);

  for (const target of mapping.targets) {
    const targetPath = resolve(repositoryRoot, target);
    let targetContent;

    try {
      targetContent = await readFile(targetPath);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }

    if (targetContent?.equals(sourceContent)) continue;

    if (checkOnly) {
      console.error(`OUT_OF_SYNC ${target}`);
      hasDrift = true;
      continue;
    }

    await mkdir(dirname(targetPath), { recursive: true });
    await writeFile(targetPath, sourceContent);
    console.log(`SYNCED ${target}`);
  }
}

if (hasDrift) {
  process.exitCode = 1;
} else if (checkOnly) {
  console.log("Skill references are in sync.");
}
```

- [ ] **Step 3: Generate the committed bundles**

Run:

```bash
node scripts/sync-skill-references.mjs
```

Expected: six `SYNCED` lines and both `references/` directories are created.

- [ ] **Step 4: Verify synchronization is idempotent**

Run:

```bash
node scripts/sync-skill-references.mjs --check
```

Expected: exit `0` and `Skill references are in sync.`

- [ ] **Step 5: Review the reference bundle changes**

```bash
git status --short scripts/sync-skill-references.mjs skills/truth-score/references skills/truth-rewrite/references
```

Expected: the script and six generated reference files are visible as uncommitted changes.

### Task 2: Mutually Exclusive Skill Definitions

**Files:**
- Modify: `skills/article-to-truth/SKILL.md`
- Modify: `skills/truth-score/SKILL.md`
- Modify: `skills/truth-rewrite/SKILL.md`

**Interfaces:**
- Consumes: local `references/*.md` files created in Task 1.
- Produces: three valid Skill frontmatters whose descriptions define non-overlapping natural-language routing.

- [ ] **Step 1: Capture the failing cross-directory check**

Run:

```bash
rg -n "\.\./article-to-truth" skills/truth-score skills/truth-rewrite
```

Expected: matches in both current `SKILL.md` files.

- [ ] **Step 2: Narrow the comprehensive Skill trigger**

Replace the frontmatter description in `skills/article-to-truth/SKILL.md` with:

```yaml
---
name: article-to-truth
description: 中文真实感写作的综合技能。用户要求从零写、创作、生成或起草中文文章、散文诗、小说、故事、公众号、营销文案、小红书、SEO、产品介绍、短视频脚本、邮件、报告时必须使用；用户要求在同一任务中先评测再改写、改写后复评、按作者样稿校准风格，或制定写作规则、SOP、验收标准时也使用。用户仅要求对已有文本做 AI 味评分或模板感检测时改用 truth-score；仅要求通用改写已有文本时改用 truth-rewrite。用户明确点名 article-to-truth 时仍使用本技能。
---
```

在 `# Article To Truth` 后加入：

```markdown
## Routing Boundary

- 从零创作、复合评测改写、作者声音校准、规则与 SOP：由本技能处理。
- 仅评测已有文本：优先使用 `truth-score`。
- 仅通用改写已有文本：优先使用 `truth-rewrite`。
- 用户明确点名 `article-to-truth` 时，按用户要求完成任务，即使任务范围较窄。
```

- [ ] **Step 3: Make truth-score independent**

将 `skills/truth-score/SKILL.md` 的 description 定义为：

```yaml
description: 只对用户提供的已有中文文本做 AI 味评分、自然度打分、模板感检测和问题定位。用户明确输入 truth-score、$truth-score、/truth-score，或要求给中文文章、公众号、产品介绍、营销文案、小红书笔记、短视频脚本、邮件、报告评分并提供 pattern 编号、证据句、扣分说明、修改优先级时必须使用。默认不输出完整改写稿，也不从零创作；用户同时要求改写、改写后复评或其他复合流程时改用 article-to-truth。
```

正文必须：

- 将定位改为“独立评分 Skill”。
- 增加事实保护、不以规避检测器为目标和高风险文本边界。
- 只读取 `references/patterns.md`、`references/rubric.md`，示例按需读取 `references/examples.md`。
- 保留当前评分工作流和默认输出格式。
- 删除“可以继续改写”的主动引导，避免越过只评分边界。

- [ ] **Step 4: Make truth-rewrite independent**

将 `skills/truth-rewrite/SKILL.md` 的 description 定义为：

```yaml
description: 只对用户提供的已有中文文本做通用去 AI 味、去模板化和自然化改写。用户明确输入 truth-rewrite、$truth-rewrite、/truth-rewrite，或要求把中文文章、公众号、产品介绍、营销文案、小红书笔记、短视频脚本、邮件、报告改得更自然、更具体、更像人写时必须使用。保留事实、范围、责任边界、作者意图和原文用途，不编造数据、来源、案例、反馈或个人经历；不从零创作，也不执行完整评分流程。作者风格校准、先评测再改写或改写后复评等复合任务改用 article-to-truth。
```

正文必须：

- 将定位改为“独立改写 Skill”。
- 只读取 `references/patterns.md`、`references/process.md`，示例按需读取 `references/examples.md`。
- 保留锁定事实、识别 pattern、改写、复审、终稿和改动说明流程。
- 删除对 `rubric.md`、`voice-calibration.md` 和兄弟 Skill 的文件依赖。

- [ ] **Step 5: Validate the three definitions**

Run:

```bash
rg -n "\.\./article-to-truth" skills/truth-score skills/truth-rewrite
```

Expected: exit `1` with no matches.

Run the installed skill validator against each `SKILL.md`; expected result for all three is `Skill is valid!`.

- [ ] **Step 6: Review the Skill definition changes**

```bash
git diff -- skills/article-to-truth/SKILL.md skills/truth-score/SKILL.md skills/truth-rewrite/SKILL.md
```

Expected: the diff contains the three routing descriptions and no sibling-directory reference.

### Task 3: Installation And Compatibility Documentation

**Files:**
- Modify: `README.md`
- Modify: `.codex-plugin/plugin.json`
- Modify: `integrations/codex/prompts/truth-score.md`
- Modify: `integrations/codex/prompts/truth-rewrite.md`
- Modify: `.opencode/commands/truth-score.md`
- Modify: `.opencode/commands/truth-rewrite.md`

**Interfaces:**
- Consumes: the three Skill names and routing contract from Task 2.
- Produces: correct interactive, all-Skill, and single-Skill installation instructions plus compatible explicit commands.

- [ ] **Step 1: Confirm obsolete wording is present**

Run:

```bash
rg -n "轻量入口|不维护第二套规则|\$truth-score.*\$article-to-truth|truth-score.*article-to-truth" README.md .codex-plugin integrations .opencode
```

Expected: matches in README, plugin metadata and command adapters.

- [ ] **Step 2: Rewrite README installation and routing copy**

Document these exact installation forms:

```bash
# Interactive discovery and selection
npx skills add https://github.com/kuschzzp/article-to-truth -g -a codex

# Deterministic installation of all three Skills
npx skills add https://github.com/kuschzzp/article-to-truth -g -a codex --skill '*' -y

# Install one Skill
npx skills add https://github.com/kuschzzp/article-to-truth -g -a codex --skill truth-score -y
```

Update the Skill table to this contract:

```markdown
| Skill | 用途 | 不处理 |
|---|---|---|
| `article-to-truth` | 从零创作、复合评测改写、作者风格校准、规则与 SOP | 自动路由时不争抢仅评分或仅通用改写 |
| `truth-score` | 对已有文本做 AI 味评分和问题定位 | 完整改写、从零创作 |
| `truth-rewrite` | 对已有文本做通用去模板化改写 | 从零创作、完整评分、作者风格校准 |
```

目录树必须展示两个专项 Skill 各自的 `references/`，开发章节加入：

```bash
node scripts/sync-skill-references.mjs --check
python -m json.tool evals/evals.json
python -m json.tool evals/trigger-routing.json
npx skills add ./ -l
```

- [ ] **Step 3: Update plugin metadata**

保持 `"skills": "./skills/"`，将长描述改成明确提供三个可独立安装的 Skill，并让默认提示分别覆盖原创、只评分、只改写和复合任务。

- [ ] **Step 4: Point compatibility adapters at one Skill**

评分适配文件只写：

```markdown
使用 `$truth-score` 的评分规则评测下面的中文文本。
```

OpenCode 对应文本使用不带 `$` 的 `truth-score`。改写适配文件同理只指向 `truth-rewrite`，不再以 `article-to-truth` 作为隐式后备。

- [ ] **Step 5: Validate Markdown references and JSON**

Run:

```bash
python -m json.tool .codex-plugin/plugin.json
rg -n "轻量入口|不维护第二套规则|\$truth-score / \$article-to-truth|\$truth-rewrite / \$article-to-truth" README.md .codex-plugin integrations .opencode
```

Expected: JSON parsing succeeds; obsolete dependency wording has no matches.

- [ ] **Step 6: Review documentation and adapters**

```bash
git diff -- README.md .codex-plugin/plugin.json integrations/codex/prompts .opencode/commands
```

Expected: the diff describes three independent Skills and each adapter names only its matching Skill.

### Task 4: Evaluation And Routing Coverage

**Files:**
- Modify: `evals/evals.json`
- Create: `evals/trigger-routing.json`

**Interfaces:**
- Consumes: exact Skill names and route boundaries from Task 2.
- Produces: package-level behavior cases with `target_skill` and description-routing cases with `expected_skill`.

- [ ] **Step 1: Verify routing coverage is missing**

Run:

```bash
test ! -f evals/trigger-routing.json
```

Expected: exit `0`.

- [ ] **Step 2: Assign every behavior eval to a Skill**

Add `"target_skill"` to each object in `evals/evals.json` and align prompts with the route:

```text
1 truth-score
2 truth-rewrite
3 article-to-truth
4 article-to-truth
5 article-to-truth
6 article-to-truth
7 truth-score
8 truth-rewrite
9 truth-score
10 truth-rewrite
11 article-to-truth
12 truth-score
```

Change pure-score prompts 1 and 12 to name `truth-score`; change pure-rewrite prompt 2 to name `truth-rewrite`. Keep compound, generation and author-style prompts on `article-to-truth`.

Add a generation case with `target_skill: "article-to-truth"` and prompt `帮我写一篇发生在县城旧书店里的短篇小说，人物和情节可以虚构，不要写成标准励志故事。`

- [ ] **Step 3: Add description-routing cases**

Create `evals/trigger-routing.json` with this complete case set:

```json
{
  "suite": "article-to-truth-skill-routing",
  "cases": [
    {
      "id": "generate-novel",
      "query": "帮我写一篇小说",
      "expected_skill": "article-to-truth",
      "excluded_skills": ["truth-score", "truth-rewrite"],
      "reason": "从零虚构创作由综合 Skill 处理。"
    },
    {
      "id": "score-only",
      "query": "看看这段公众号开头 AI 味重不重，只评分不要改",
      "expected_skill": "truth-score",
      "excluded_skills": ["article-to-truth", "truth-rewrite"],
      "reason": "仅评测已有文本。"
    },
    {
      "id": "rewrite-only",
      "query": "把这段产品介绍改得自然一点，不要增加事实",
      "expected_skill": "truth-rewrite",
      "excluded_skills": ["article-to-truth", "truth-score"],
      "reason": "仅通用改写已有文本。"
    },
    {
      "id": "score-then-rewrite",
      "query": "先给这篇文章打分，再按问题重写一版",
      "expected_skill": "article-to-truth",
      "excluded_skills": ["truth-score", "truth-rewrite"],
      "reason": "评测加改写属于复合任务。"
    },
    {
      "id": "rewrite-then-rescore",
      "query": "把这段文案改自然，最后再给终稿评分",
      "expected_skill": "article-to-truth",
      "excluded_skills": ["truth-score", "truth-rewrite"],
      "reason": "改写后复评需要组合两套流程。"
    },
    {
      "id": "voice-calibration",
      "query": "参考我的三篇旧文，把这篇初稿改成我的语气",
      "expected_skill": "article-to-truth",
      "excluded_skills": ["truth-score", "truth-rewrite"],
      "reason": "作者样稿分析和声音校准由综合 Skill 处理。"
    },
    {
      "id": "writing-sop",
      "query": "给团队制定一份公众号去 AI 味审稿 SOP 和验收标准",
      "expected_skill": "article-to-truth",
      "excluded_skills": ["truth-score", "truth-rewrite"],
      "reason": "规则、SOP 和验收标准属于综合任务。"
    },
    {
      "id": "explicit-score",
      "query": "用 $truth-score 检测这段邮件，只指出问题",
      "expected_skill": "truth-score",
      "excluded_skills": ["article-to-truth", "truth-rewrite"],
      "reason": "用户明确点名评分 Skill。"
    },
    {
      "id": "explicit-rewrite",
      "query": "用 $truth-rewrite 改写这段产品说明，事实不要动",
      "expected_skill": "truth-rewrite",
      "excluded_skills": ["article-to-truth", "truth-score"],
      "reason": "用户明确点名改写 Skill。"
    },
    {
      "id": "explicit-main",
      "query": "用 $article-to-truth 给这段话打分",
      "expected_skill": "article-to-truth",
      "excluded_skills": ["truth-score", "truth-rewrite"],
      "reason": "显式点名优先，即使任务范围较窄。"
    },
    {
      "id": "high-risk-score",
      "query": "只检查这段医疗科普有没有 AI 味和过度确定的表达，不要改写",
      "expected_skill": "truth-score",
      "excluded_skills": ["article-to-truth", "truth-rewrite"],
      "reason": "仍是只评分任务，但需执行高风险边界检查。"
    },
    {
      "id": "generate-video-script",
      "query": "从零写一个 45 秒产品短视频脚本，不要套话",
      "expected_skill": "article-to-truth",
      "excluded_skills": ["truth-score", "truth-rewrite"],
      "reason": "从零生成脚本由综合 Skill 处理。"
    },
    {
      "id": "generate-report",
      "query": "根据这些会议纪要起草一份中文项目复盘报告",
      "expected_skill": "article-to-truth",
      "excluded_skills": ["truth-score", "truth-rewrite"],
      "reason": "从素材起草新报告属于生成任务。"
    }
  ]
}
```

- [ ] **Step 4: Validate both eval files**

Run:

```bash
python -m json.tool evals/evals.json
python -m json.tool evals/trigger-routing.json
```

Expected: both commands exit `0` and print normalized JSON.

- [ ] **Step 5: Review evaluation coverage**

```bash
git diff -- evals/evals.json evals/trigger-routing.json
```

Expected: all behavior cases have `target_skill`, and routing cases cover the three responsibility boundaries.

### Task 5: Package And Isolated Installation Verification

**Files:**
- Modify only if verification reveals a defect in files owned by Tasks 1-4.

**Interfaces:**
- Consumes: final repository package.
- Produces: evidence that discovery, synchronization and isolated installs work for all three Skills.

- [ ] **Step 1: Run static validation**

```bash
node scripts/sync-skill-references.mjs --check
python -m json.tool evals/evals.json
python -m json.tool evals/trigger-routing.json
python -m json.tool .codex-plugin/plugin.json
git diff --check
```

Expected: every command exits `0`.

- [ ] **Step 2: Verify repository discovery**

Run:

```bash
npx skills add ./ -l
```

Expected: output lists exactly `article-to-truth`, `truth-score`, and `truth-rewrite` as discoverable Skills.

- [ ] **Step 3: Verify each Skill in an isolated project**

Create three fresh directories under `/private/tmp`. Run one command from each matching directory and inspect the installed Skill:

```bash
npx skills add /Users/kusch/Desktop/all-tools-test/article-to-truth -a codex --skill article-to-truth -y
npx skills add /Users/kusch/Desktop/all-tools-test/article-to-truth -a codex --skill truth-score -y
npx skills add /Users/kusch/Desktop/all-tools-test/article-to-truth -a codex --skill truth-rewrite -y
```

Expected for each run:

- Only the selected Skill package is installed.
- Every `references/...` path named by its `SKILL.md` exists inside that installed package.
- No installed file requires `../article-to-truth/`.

Delete all temporary installation directories after inspection.

- [ ] **Step 4: Review final diff and status**

```bash
git status --short
git log -5 --oneline
```

Expected: `HEAD` remains on the pre-existing `07509d7` commit and all intended implementation files remain visible as uncommitted changes.
