import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateScoreStability,
  extractTruthScores,
  normalizeRoutingSelection,
  parseModelRegressionArguments,
  summarizeBehaviorResults,
} from "./model-regression.mjs";

test("parseModelRegressionArguments uses bounded local defaults", () => {
  const smoke = parseModelRegressionArguments([]);
  assert.equal(smoke.mode, "smoke");
  assert.equal(smoke.runs, 2);
  assert.equal(smoke.routingRuns, 3);
  assert.equal(smoke.concurrency, 2);

  const full = parseModelRegressionArguments([
    "--full",
    "--model",
    "gpt-test",
    "--reasoning-effort",
    "high",
    "--runs",
    "4",
    "--cases",
    "1,15",
    "--compare",
  ]);
  assert.equal(full.mode, "full");
  assert.equal(full.model, "gpt-test");
  assert.equal(full.reasoningEffort, "high");
  assert.equal(full.runs, 4);
  assert.deepEqual(full.caseIds, ["1", "15"]);
  assert.equal(full.compare, true);

  assert.throws(
    () => parseModelRegressionArguments(["--skip-routing", "--skip-behavior"]),
    /cannot be used together/,
  );
});

test("normalizeRoutingSelection compares old split skills as one capability", () => {
  assert.equal(normalizeRoutingSelection("article-to-truth", "candidate"), "article-to-truth");
  assert.equal(normalizeRoutingSelection("truth-score", "released"), "article-to-truth");
  assert.equal(normalizeRoutingSelection("truth-rewrite", "released"), "article-to-truth");
  assert.equal(normalizeRoutingSelection("none", "candidate"), "none");
  assert.throws(
    () => normalizeRoutingSelection("truth-score", "candidate"),
    /unexpected routing selection/,
  );
});

test("score extraction and stability track each score label independently", () => {
  assert.deepEqual(
    extractTruthScores("原文真实感评分：62/100\n终稿真实感评分：88 / 100"),
    { 原文真实感评分: 62, 终稿真实感评分: 88 },
  );

  const stability = calculateScoreStability([
    { caseId: "3", scores: { 原文真实感评分: 62, 终稿真实感评分: 88 } },
    { caseId: "3", scores: { 原文真实感评分: 68, 终稿真实感评分: 90 } },
  ]);
  assert.deepEqual(stability, [
    {
      caseId: "3",
      label: "原文真实感评分",
      scores: [62, 68],
      spread: 6,
      passed: true,
    },
    {
      caseId: "3",
      label: "终稿真实感评分",
      scores: [88, 90],
      spread: 2,
      passed: true,
    },
  ]);
});

test("summarizeBehaviorResults separates critical assertions and score variance", () => {
  const records = [
    {
      caseId: "15",
      scores: { 真实感评分: 70 },
      evaluation: {
        passed: true,
        outcomes: [
          { passed: true, critical: true },
          { passed: true, critical: false },
        ],
      },
    },
    {
      caseId: "15",
      scores: { 真实感评分: 80 },
      evaluation: {
        passed: false,
        outcomes: [
          { passed: false, critical: true },
          { passed: true, critical: false },
        ],
      },
    },
  ];

  const summary = summarizeBehaviorResults(records, 8);
  assert.equal(summary.casePassRate, 0.5);
  assert.equal(summary.criticalAssertionPassRate, 0.5);
  assert.equal(summary.otherAssertionPassRate, 1);
  assert.equal(summary.stableScores, false);
  assert.equal(summary.stability[0].spread, 10);
});
