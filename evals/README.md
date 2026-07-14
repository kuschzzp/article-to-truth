# Evaluation Guide

本目录包含两类评测：

- `evals.json`：检查三个 Skill 的输出行为。
- `trigger-routing.json`：检查自然语言请求是否路由到正确 Skill。

`scripts/eval-runner.mjs` 不调用模型或绑定具体客户端。它验证评测定义，并对 Codex、Claude Code、OpenCode 或其他客户端产生的已保存结果执行同一套确定性断言。

## Validate Definitions

```bash
node scripts/eval-runner.mjs --check
```

该命令检查：

- Skill 名称和 case id 是否有效且唯一。
- 每条行为用例是否包含至少一个 assertion。
- 正则表达式、长度限制和事实保留字段是否合法。
- 路由目标与排除 Skill 是否自洽。

## Evaluate Behavior Outputs

把每条 prompt 交给对应客户端执行，将纯文本输出保存为：

```text
evals/output/1.txt
evals/output/2.txt
...
evals/output/13.txt
```

运行全部行为断言：

```bash
node scripts/eval-runner.mjs --outputs evals/output
```

只运行一条：

```bash
node scripts/eval-runner.mjs --outputs evals/output --case 1
```

支持的 assertion 类型：

| 类型 | 用途 |
|---|---|
| `contains`, `not_contains` | 检查必需或禁止文本 |
| `contains_any`, `not_contains_any` | 检查一组候选词 |
| `regex`, `not_regex` | 检查 pattern 编号等结构 |
| `ordered_contains` | 检查复合流程的输出顺序 |
| `preserves_terms` | 检查产品名、数字、对象等事实词 |
| `score_range` | 用人工锚点校准真实感分数区间 |
| `min_length`, `max_length` | 检查基本内容量或输出克制程度 |

确定性断言只能发现结构、事实词和明显越界问题。文体质量、作者声音和细节可信度仍需人工或独立模型评审。

## Evaluate Routing Results

客户端执行 `trigger-routing.json` 中的 query 后，将实际选择结果保存为 JSON：

```json
{
  "results": [
    {
      "id": "generate-novel",
      "selected_skills": ["article-to-truth", "article-to-truth", "article-to-truth"]
    },
    {
      "id": "score-only",
      "selected_skills": ["truth-score", "truth-score", "truth-score"]
    },
    {
      "id": "rewrite-only",
      "selected_skills": ["truth-rewrite", "truth-rewrite", "truth-rewrite"]
    }
  ]
}
```

每条 query 按 `runs_per_case` 重复执行，当前为 3 次。未触发任何 Skill 时，在对应位置写 `"none"`。结果文件必须覆盖被评测的全部 case；总命中率达到 `minimum_pass_rate`（当前为 95%）才通过。

运行路由评测：

```bash
node scripts/eval-runner.mjs --routing-results evals/output/routing-results.json
```

只检查一条路由：

```bash
node scripts/eval-runner.mjs --routing-results evals/output/routing-results.json --case generate-novel
```

`evals/output/` 已加入 `.gitignore`，真实输出和本地路由结果不会进入仓库。
