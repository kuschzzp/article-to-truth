import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateOutput,
  evaluateRoutingResults,
  validateEvalSuite,
  validateRoutingSuite,
} from "./eval-runner.mjs";

test("evaluateOutput supports deterministic assertion types", () => {
  const evalCase = {
    id: 1,
    target_skill: "truth-score",
    prompt: "评测这段文字",
    expected_output: "输出结构化评测",
    files: [],
    assertions: [
      { type: "contains", value: "真实感评分：", description: "包含评分" },
      { type: "not_contains", value: "终稿：", description: "不输出改写" },
      { type: "contains_any", values: ["AI 味风险：低", "AI 味风险：中"], description: "包含风险" },
      { type: "not_contains_any", values: ["行业领先", "全新升级"], description: "没有宣传词" },
      { type: "regex", pattern: "\\[(?:C|L|S)\\d{2}\\]", min_matches: 2, description: "至少两个 pattern" },
      { type: "not_regex", pattern: "用户反馈显示", description: "没有伪反馈" },
      { type: "ordered_contains", values: ["真实感评分：", "命中 pattern：", "优先修改："], description: "顺序正确" },
      { type: "preserves_terms", terms: ["ReviewPin", "内容团队"], description: "保留事实词" },
      { type: "score_range", min: 70, max: 80, description: "评分落在锚点范围" },
      { type: "min_length", value: 80, description: "信息足够" },
      { type: "max_length", value: 500, description: "输出克制" },
    ],
  };

  const output = `真实感评分：76/100（越高越自然）
AI 味风险：中

命中 pattern：
1. [C02] 宏大背景：证据句“在数字时代”
2. [L02] 虚浮动词：证据句“赋能内容团队”

ReviewPin 面向内容团队。

优先修改：
1. 直接说明产品功能。`;

  const result = evaluateOutput(evalCase, output);

  assert.equal(result.passed, true);
  assert.equal(result.passedAssertions, evalCase.assertions.length);
  assert.equal(result.failures.length, 0);
});

test("evaluateOutput reports actionable assertion failures", () => {
  const result = evaluateOutput(
    {
      id: 2,
      target_skill: "truth-rewrite",
      prompt: "改写",
      expected_output: "终稿",
      files: [],
      assertions: [
        { type: "contains", value: "终稿：", description: "包含终稿" },
        { type: "preserves_terms", terms: ["NotePilot"], description: "保留产品名" },
      ],
    },
    "改写完成。",
  );

  assert.equal(result.passed, false);
  assert.deepEqual(
    result.failures.map((failure) => failure.description),
    ["包含终稿", "保留产品名"],
  );
});

test("suite validators reject unknown skills and assertion types", () => {
  assert.throws(
    () =>
      validateEvalSuite({
        skill_name: "article-to-truth",
        evals: [
          {
            id: 1,
            target_skill: "unknown-skill",
            prompt: "test",
            expected_output: "test",
            files: [],
            assertions: [{ type: "mystery", description: "invalid" }],
          },
        ],
      }),
    /unknown target_skill/,
  );

  assert.throws(
    () => validateRoutingSuite({ suite: "routing", cases: [] }),
    /non-empty cases/,
  );
});

test("evaluateRoutingResults compares every selected skill", () => {
  const routingSuite = {
    suite: "routing",
    cases: [
      {
        id: "generate-novel",
        query: "帮我写一篇小说",
        expected_skill: "article-to-truth",
        excluded_skills: ["truth-score", "truth-rewrite"],
        reason: "原创任务",
      },
      {
        id: "score-only",
        query: "只评分",
        expected_skill: "truth-score",
        excluded_skills: ["article-to-truth", "truth-rewrite"],
        reason: "评分任务",
      },
    ],
  };

  const result = evaluateRoutingResults(routingSuite, {
    results: [
      { id: "generate-novel", selected_skill: "article-to-truth" },
      { id: "score-only", selected_skill: "truth-rewrite" },
    ],
  });

  assert.equal(result.passed, false);
  assert.equal(result.passedCases, 1);
  assert.equal(result.passedRuns, 1);
  assert.equal(result.totalRuns, 2);
  assert.deepEqual(result.failures, [
    {
      id: "score-only",
      run: 1,
      expectedSkill: "truth-score",
      selectedSkill: "truth-rewrite",
      message: "run 1: expected truth-score, got truth-rewrite",
    },
  ]);
});

test("evaluateRoutingResults measures repeated-run pass rates", () => {
  const routingSuite = {
    suite: "routing",
    runs_per_case: 3,
    minimum_pass_rate: 0.8,
    cases: [
      {
        id: "generate-novel",
        query: "帮我写一篇小说",
        expected_skill: "article-to-truth",
        excluded_skills: ["truth-score", "truth-rewrite"],
        reason: "原创任务",
      },
      {
        id: "score-only",
        query: "只评分",
        expected_skill: "truth-score",
        excluded_skills: ["article-to-truth", "truth-rewrite"],
        reason: "评分任务",
      },
    ],
  };

  const result = evaluateRoutingResults(routingSuite, {
    results: [
      {
        id: "generate-novel",
        selected_skills: ["article-to-truth", "article-to-truth", "truth-rewrite"],
      },
      {
        id: "score-only",
        selected_skills: ["truth-score", "truth-score", "truth-score"],
      },
    ],
  });

  assert.equal(result.passed, true);
  assert.equal(result.passedRuns, 5);
  assert.equal(result.totalRuns, 6);
  assert.equal(result.passRate, 5 / 6);
  assert.equal(result.failures.length, 1);
});
