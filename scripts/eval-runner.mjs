#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const skillNames = new Set(["article-to-truth", "truth-score", "truth-rewrite"]);
const assertionTypes = new Set([
  "contains",
  "not_contains",
  "contains_any",
  "not_contains_any",
  "regex",
  "not_regex",
  "ordered_contains",
  "preserves_terms",
  "score_range",
  "min_length",
  "max_length",
]);

function requireObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
}

function requireString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be a non-empty string`);
  }
}

function requireStringArray(value, label) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${label} must be a non-empty string array`);
  }
  value.forEach((item, index) => requireString(item, `${label}[${index}]`));
}

function requireNonNegativeInteger(value, label) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer`);
  }
}

function validateAssertion(assertion, label) {
  requireObject(assertion, label);
  requireString(assertion.type, `${label}.type`);
  requireString(assertion.description, `${label}.description`);

  if (!assertionTypes.has(assertion.type)) {
    throw new Error(`${label} has unknown assertion type: ${assertion.type}`);
  }

  switch (assertion.type) {
    case "contains":
    case "not_contains":
      requireString(assertion.value, `${label}.value`);
      break;
    case "contains_any":
    case "not_contains_any":
    case "ordered_contains":
      requireStringArray(assertion.values, `${label}.values`);
      break;
    case "preserves_terms":
      requireStringArray(assertion.terms, `${label}.terms`);
      break;
    case "regex":
    case "not_regex": {
      requireString(assertion.pattern, `${label}.pattern`);
      const flags = assertion.flags ?? "u";
      requireString(flags, `${label}.flags`);
      try {
        new RegExp(assertion.pattern, flags);
      } catch (error) {
        throw new Error(`${label} has invalid regex: ${error.message}`);
      }
      if (assertion.min_matches !== undefined) {
        requireNonNegativeInteger(assertion.min_matches, `${label}.min_matches`);
      }
      if (assertion.max_matches !== undefined) {
        requireNonNegativeInteger(assertion.max_matches, `${label}.max_matches`);
      }
      if (
        assertion.min_matches !== undefined &&
        assertion.max_matches !== undefined &&
        assertion.min_matches > assertion.max_matches
      ) {
        throw new Error(`${label}.min_matches cannot exceed max_matches`);
      }
      break;
    }
    case "min_length":
    case "max_length":
      requireNonNegativeInteger(assertion.value, `${label}.value`);
      break;
    case "score_range":
      requireNonNegativeInteger(assertion.min, `${label}.min`);
      requireNonNegativeInteger(assertion.max, `${label}.max`);
      if (assertion.min > assertion.max || assertion.max > 100) {
        throw new Error(`${label} score range must satisfy 0 <= min <= max <= 100`);
      }
      if (assertion.label !== undefined) requireString(assertion.label, `${label}.label`);
      break;
  }
}

function validateEvalCase(evalCase, label) {
  requireObject(evalCase, label);
  if ((typeof evalCase.id !== "number" && typeof evalCase.id !== "string") || String(evalCase.id).trim() === "") {
    throw new Error(`${label}.id must be a non-empty string or number`);
  }
  if (!skillNames.has(evalCase.target_skill)) {
    throw new Error(`${label} has unknown target_skill: ${evalCase.target_skill}`);
  }
  requireString(evalCase.prompt, `${label}.prompt`);
  requireString(evalCase.expected_output, `${label}.expected_output`);
  if (!Array.isArray(evalCase.files)) {
    throw new Error(`${label}.files must be an array`);
  }
  if (!Array.isArray(evalCase.assertions) || evalCase.assertions.length === 0) {
    throw new Error(`${label}.assertions must be a non-empty array`);
  }
  evalCase.assertions.forEach((assertion, index) =>
    validateAssertion(assertion, `${label}.assertions[${index}]`),
  );
}

export function validateEvalSuite(suite) {
  requireObject(suite, "eval suite");
  requireString(suite.skill_name, "eval suite.skill_name");
  if (!Array.isArray(suite.evals) || suite.evals.length === 0) {
    throw new Error("eval suite must contain non-empty evals");
  }

  const ids = new Set();
  suite.evals.forEach((evalCase, index) => {
    validateEvalCase(evalCase, `evals[${index}]`);
    const id = String(evalCase.id);
    if (ids.has(id)) throw new Error(`duplicate eval id: ${id}`);
    ids.add(id);
  });

  return suite;
}

export function validateRoutingSuite(suite) {
  requireObject(suite, "routing suite");
  requireString(suite.suite, "routing suite.suite");
  if (suite.runs_per_case !== undefined) {
    requireNonNegativeInteger(suite.runs_per_case, "routing suite.runs_per_case");
    if (suite.runs_per_case === 0) throw new Error("routing suite.runs_per_case must be positive");
  }
  if (
    suite.minimum_pass_rate !== undefined &&
    (typeof suite.minimum_pass_rate !== "number" ||
      suite.minimum_pass_rate <= 0 ||
      suite.minimum_pass_rate > 1)
  ) {
    throw new Error("routing suite.minimum_pass_rate must be greater than 0 and at most 1");
  }
  if (!Array.isArray(suite.cases) || suite.cases.length === 0) {
    throw new Error("routing suite must contain non-empty cases");
  }

  const ids = new Set();
  suite.cases.forEach((routeCase, index) => {
    const label = `cases[${index}]`;
    requireObject(routeCase, label);
    requireString(routeCase.id, `${label}.id`);
    requireString(routeCase.query, `${label}.query`);
    requireString(routeCase.reason, `${label}.reason`);
    if (!skillNames.has(routeCase.expected_skill)) {
      throw new Error(`${label} has unknown expected_skill: ${routeCase.expected_skill}`);
    }
    requireStringArray(routeCase.excluded_skills, `${label}.excluded_skills`);
    if (routeCase.excluded_skills.includes(routeCase.expected_skill)) {
      throw new Error(`${label}.excluded_skills contains expected_skill`);
    }
    routeCase.excluded_skills.forEach((name) => {
      if (!skillNames.has(name)) throw new Error(`${label} has unknown excluded skill: ${name}`);
    });
    if (ids.has(routeCase.id)) throw new Error(`duplicate routing id: ${routeCase.id}`);
    ids.add(routeCase.id);
  });

  return suite;
}

function countRegexMatches(output, assertion) {
  const baseFlags = assertion.flags ?? "u";
  const flags = baseFlags.includes("g") ? baseFlags : `${baseFlags}g`;
  return [...output.matchAll(new RegExp(assertion.pattern, flags))].length;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function evaluateAssertion(assertion, output) {
  switch (assertion.type) {
    case "contains":
      return {
        passed: output.includes(assertion.value),
        message: `expected output to contain ${JSON.stringify(assertion.value)}`,
      };
    case "not_contains":
      return {
        passed: !output.includes(assertion.value),
        message: `expected output not to contain ${JSON.stringify(assertion.value)}`,
      };
    case "contains_any": {
      const passed = assertion.values.some((value) => output.includes(value));
      return { passed, message: `expected one of: ${assertion.values.join(", ")}` };
    }
    case "not_contains_any": {
      const found = assertion.values.filter((value) => output.includes(value));
      return { passed: found.length === 0, message: `unexpected values: ${found.join(", ")}` };
    }
    case "regex":
    case "not_regex": {
      const matches = countRegexMatches(output, assertion);
      const minimum = assertion.min_matches ?? (assertion.type === "regex" ? 1 : 0);
      const maximum = assertion.max_matches ?? (assertion.type === "not_regex" ? 0 : Number.POSITIVE_INFINITY);
      return {
        passed: matches >= minimum && matches <= maximum,
        message: `regex matched ${matches} time(s), expected ${minimum}-${maximum === Number.POSITIVE_INFINITY ? "inf" : maximum}`,
      };
    }
    case "ordered_contains": {
      let cursor = -1;
      let missing = null;
      for (const value of assertion.values) {
        cursor = output.indexOf(value, cursor + 1);
        if (cursor === -1) {
          missing = value;
          break;
        }
      }
      return {
        passed: missing === null,
        message: missing ? `missing or out of order: ${missing}` : "values appear in order",
      };
    }
    case "preserves_terms": {
      const missing = assertion.terms.filter((term) => !output.includes(term));
      return { passed: missing.length === 0, message: `missing terms: ${missing.join(", ")}` };
    }
    case "score_range": {
      const label = assertion.label ?? "真实感评分：";
      const match = output.match(new RegExp(`${escapeRegex(label)}\\s*(\\d{1,3})\\s*\\/\\s*100`, "u"));
      if (!match) return { passed: false, message: `score not found after ${label}` };
      const score = Number(match[1]);
      return {
        passed: score >= assertion.min && score <= assertion.max,
        message: `score ${score} is outside ${assertion.min}-${assertion.max}`,
      };
    }
    case "min_length": {
      const length = [...output].length;
      return { passed: length >= assertion.value, message: `length ${length} is below ${assertion.value}` };
    }
    case "max_length": {
      const length = [...output].length;
      return { passed: length <= assertion.value, message: `length ${length} exceeds ${assertion.value}` };
    }
  }
}

export function evaluateOutput(evalCase, output) {
  const outcomes = evalCase.assertions.map((assertion) => {
    const result = evaluateAssertion(assertion, output);
    return { ...result, type: assertion.type, description: assertion.description };
  });
  const failures = outcomes.filter((outcome) => !outcome.passed);

  return {
    id: evalCase.id,
    targetSkill: evalCase.target_skill,
    passed: failures.length === 0,
    passedAssertions: outcomes.length - failures.length,
    totalAssertions: outcomes.length,
    failures,
  };
}

function validateRoutingResults(resultsDocument, routeIds, runsPerCase) {
  requireObject(resultsDocument, "routing results");
  if (!Array.isArray(resultsDocument.results)) {
    throw new Error("routing results.results must be an array");
  }

  const ids = new Set();
  resultsDocument.results.forEach((result, index) => {
    const label = `results[${index}]`;
    requireObject(result, label);
    requireString(result.id, `${label}.id`);
    const hasSingleSelection = typeof result.selected_skill === "string";
    const hasMultipleSelections = Array.isArray(result.selected_skills);
    if (hasSingleSelection === hasMultipleSelections) {
      throw new Error(`${label} must contain selected_skill or selected_skills, but not both`);
    }
    const selections = hasMultipleSelections ? result.selected_skills : [result.selected_skill];
    if (selections.length !== runsPerCase) {
      throw new Error(`${label} must contain exactly ${runsPerCase} selection(s)`);
    }
    selections.forEach((selection, selectionIndex) => {
      requireString(selection, `${label}.selected_skills[${selectionIndex}]`);
      if (!skillNames.has(selection) && selection !== "none") {
        throw new Error(`${label} has unknown selected skill: ${selection}`);
      }
    });
    if (hasSingleSelection && runsPerCase !== 1) {
      throw new Error(`${label}.selected_skill is only valid when runs_per_case is 1`);
    }
    if (!routeIds.has(result.id)) throw new Error(`${label} has unknown routing id: ${result.id}`);
    if (ids.has(result.id)) throw new Error(`duplicate routing result id: ${result.id}`);
    ids.add(result.id);
  });
}

export function evaluateRoutingResults(routingSuite, resultsDocument) {
  validateRoutingSuite(routingSuite);
  const runsPerCase = routingSuite.runs_per_case ?? 1;
  const minimumPassRate = routingSuite.minimum_pass_rate ?? 1;
  const routeIds = new Set(routingSuite.cases.map((routeCase) => routeCase.id));
  validateRoutingResults(resultsDocument, routeIds, runsPerCase);
  const selectedById = new Map(
    resultsDocument.results.map((result) => [
      result.id,
      result.selected_skills ?? [result.selected_skill],
    ]),
  );
  const failures = [];
  let passedRuns = 0;
  let passedCases = 0;

  for (const routeCase of routingSuite.cases) {
    const selections = selectedById.get(routeCase.id) ?? Array(runsPerCase).fill("<missing>");
    let casePassed = true;
    selections.forEach((selectedSkill, index) => {
      if (selectedSkill === routeCase.expected_skill) {
        passedRuns += 1;
      } else {
        casePassed = false;
        failures.push({
          id: routeCase.id,
          run: index + 1,
          expectedSkill: routeCase.expected_skill,
          selectedSkill,
          message: `run ${index + 1}: expected ${routeCase.expected_skill}, got ${selectedSkill}`,
        });
      }
    });
    if (casePassed) {
      passedCases += 1;
    }
  }

  const totalRuns = routingSuite.cases.length * runsPerCase;
  const passRate = totalRuns === 0 ? 0 : passedRuns / totalRuns;

  return {
    passed: passRate >= minimumPassRate,
    passedCases,
    totalCases: routingSuite.cases.length,
    passedRuns,
    totalRuns,
    passRate,
    minimumPassRate,
    failures,
  };
}

async function readJson(path) {
  let content;
  try {
    content = await readFile(path, "utf8");
  } catch (error) {
    throw new Error(`cannot read ${path}: ${error.message}`);
  }
  try {
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`invalid JSON in ${path}: ${error.message}`);
  }
}

function parseArguments(args) {
  const options = {
    check: false,
    evalsPath: resolve(repositoryRoot, "evals/evals.json"),
    routingPath: resolve(repositoryRoot, "evals/trigger-routing.json"),
    outputsPath: null,
    routingResultsPath: null,
    caseId: null,
    help: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--check") options.check = true;
    else if (argument === "--help" || argument === "-h") options.help = true;
    else if (["--evals", "--routing", "--outputs", "--routing-results", "--case"].includes(argument)) {
      const value = args[index + 1];
      if (!value) throw new Error(`${argument} requires a value`);
      index += 1;
      if (argument === "--evals") options.evalsPath = resolve(value);
      else if (argument === "--routing") options.routingPath = resolve(value);
      else if (argument === "--outputs") options.outputsPath = resolve(value);
      else if (argument === "--routing-results") options.routingResultsPath = resolve(value);
      else options.caseId = value;
    } else {
      throw new Error(`unknown argument: ${argument}`);
    }
  }

  return options;
}

function printHelp(log) {
  log(`Usage:
  node scripts/eval-runner.mjs --check
  node scripts/eval-runner.mjs --outputs evals/output [--case ID]
  node scripts/eval-runner.mjs --routing-results path/to/results.json [--case ID]

Options:
  --evals PATH            Behavior eval definition (default: evals/evals.json)
  --routing PATH          Routing definition (default: evals/trigger-routing.json)
  --outputs DIR           Directory containing <eval-id>.txt files
  --routing-results PATH  JSON file containing selected skills by routing case id
  --case ID               Evaluate one behavior or routing case
  --check                 Validate eval and routing definitions
  --help                  Show this help`);
}

export async function runCli(args, io = console) {
  const options = parseArguments(args);
  if (options.help) {
    printHelp(io.log);
    return 0;
  }
  if (!options.check && !options.outputsPath && !options.routingResultsPath) {
    throw new Error("choose --check, --outputs, or --routing-results");
  }

  const evalSuite = validateEvalSuite(await readJson(options.evalsPath));
  const routingSuite = validateRoutingSuite(await readJson(options.routingPath));

  if (options.check) {
    io.log(`PASS definitions: ${evalSuite.evals.length} behavior cases, ${routingSuite.cases.length} routing cases`);
  }

  let failed = false;

  if (options.outputsPath) {
    const selectedCases = options.caseId
      ? evalSuite.evals.filter((evalCase) => String(evalCase.id) === options.caseId)
      : evalSuite.evals;
    if (selectedCases.length === 0) throw new Error(`behavior case not found: ${options.caseId}`);

    for (const evalCase of selectedCases) {
      const outputPath = join(options.outputsPath, `${evalCase.id}.txt`);
      let output;
      try {
        output = await readFile(outputPath, "utf8");
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
        io.error(`FAIL ${evalCase.id} ${evalCase.target_skill}: missing ${outputPath}`);
        failed = true;
        continue;
      }

      const result = evaluateOutput(evalCase, output);
      io.log(
        `${result.passed ? "PASS" : "FAIL"} ${result.id} ${result.targetSkill}: ${result.passedAssertions}/${result.totalAssertions}`,
      );
      for (const failure of result.failures) {
        io.error(`  - ${failure.description}: ${failure.message}`);
      }
      failed ||= !result.passed;
    }
  }

  if (options.routingResultsPath) {
    const resultsDocument = await readJson(options.routingResultsPath);
    const selectedRoutingSuite = options.caseId
      ? { ...routingSuite, cases: routingSuite.cases.filter((routeCase) => routeCase.id === options.caseId) }
      : routingSuite;
    if (selectedRoutingSuite.cases.length === 0) {
      throw new Error(`routing case not found: ${options.caseId}`);
    }
    if (options.caseId) {
      resultsDocument.results = resultsDocument.results.filter((result) => result.id === options.caseId);
    }
    const result = evaluateRoutingResults(selectedRoutingSuite, resultsDocument);
    io.log(
      `ROUTING ${result.passed ? "PASS" : "FAIL"}: ${result.passedRuns}/${result.totalRuns} runs (${(result.passRate * 100).toFixed(1)}%, minimum ${(result.minimumPassRate * 100).toFixed(1)}%)`,
    );
    for (const failure of result.failures) {
      io.error(`  - ${failure.id}: ${failure.message}`);
    }
    failed ||= !result.passed;
  }

  return failed ? 1 : 0;
}

const invokedAsScript = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;

if (invokedAsScript) {
  try {
    process.exitCode = await runCli(process.argv.slice(2));
  } catch (error) {
    console.error(`ERROR ${error.message}`);
    process.exitCode = 2;
  }
}
