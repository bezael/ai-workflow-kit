#!/usr/bin/env node

/**
 * Automated release script.
 * Usage: node scripts/release.js [patch|minor|major]
 *
 * What it does:
 *  1. Reads commits since the last git tag
 *  2. Groups them by type (feat, fix, refactor, chore…)
 *  3. Prepends a new entry to CHANGELOG.md
 *  4. Runs `npm version` (updates package.json + creates tag)
 *  5. Pushes commit + tag
 */

import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// ── helpers ──────────────────────────────────────────────────────────────────

function run(cmd) {
  return execSync(cmd, { cwd: ROOT, encoding: "utf8" }).trim();
}

function lastTag() {
  try {
    return run("git describe --tags --abbrev=0");
  } catch {
    return null;
  }
}

function commitsSince(tag) {
  const range = tag ? `${tag}..HEAD` : "HEAD";
  const log = run(
    `git log ${range} --pretty=format:"%s|%h" --no-merges`
  );
  if (!log) return [];
  return log.split("\n").map((line) => {
    const [msg, hash] = line.split("|");
    return { msg: msg.trim(), hash: hash?.trim() };
  });
}

function parseCommit(msg) {
  // feat(scope): description  or  fix: description
  const match = msg.match(/^(\w+)(?:\(([^)]+)\))?!?:\s*(.+)/);
  if (!match) return null;
  const [, type, scope, desc] = match;
  return {
    type,
    scope: scope || null,
    desc: desc.charAt(0).toUpperCase() + desc.slice(1),
  };
}

function groupCommits(commits) {
  const sections = {
    Added: [],
    Changed: [],
    Fixed: [],
    Removed: [],
    Other: [],
  };

  const typeMap = {
    feat: "Added",
    fix: "Fixed",
    refactor: "Changed",
    perf: "Changed",
    style: "Changed",
    docs: "Changed",
    test: "Other",
    chore: "Other",
    ci: "Other",
    build: "Other",
  };

  for (const { msg } of commits) {
    const parsed = parseCommit(msg);
    if (!parsed) {
      sections.Other.push(`- ${msg}`);
      continue;
    }
    const section = typeMap[parsed.type] || "Other";
    const line = parsed.scope
      ? `- **${parsed.scope}**: ${parsed.desc}`
      : `- ${parsed.desc}`;
    sections[section].push(line);
  }

  return sections;
}

function buildEntry(version, date, sections) {
  const lines = [`## [${version}] - ${date}`, ""];

  for (const [title, items] of Object.entries(sections)) {
    if (items.length === 0) continue;
    if (title === "Other") continue; // skip chores/ci in changelog
    lines.push(`### ${title}`);
    lines.push(...items);
    lines.push("");
  }

  return lines.join("\n");
}

function updateChangelog(entry, newVersion, prevTag) {
  const path = resolve(ROOT, "CHANGELOG.md");
  let content = readFileSync(path, "utf8");

  // Insert after [Unreleased] block header
  const marker = "## [Unreleased]";
  const insertAfter = content.indexOf(marker);
  if (insertAfter === -1) {
    throw new Error("CHANGELOG.md must contain a '## [Unreleased]' section");
  }

  // Find the end of the [Unreleased] block (next ## or end of file)
  const afterMarker = insertAfter + marker.length;
  const nextSection = content.indexOf("\n## [", afterMarker);
  const insertPos = nextSection !== -1 ? nextSection : content.length;

  // Clear [Unreleased] content and insert the new versioned entry
  const before = content.slice(0, afterMarker);
  const after = content.slice(insertPos);

  const repo = "https://github.com/bezael/ai-workflow-kit";
  const compareLinks = [
    `\n[Unreleased]: ${repo}/compare/v${newVersion}...HEAD`,
    `[${newVersion}]: ${repo}/compare/${prevTag ? prevTag : ""}...v${newVersion}`,
  ];

  // Remove old link definitions and re-add updated ones
  const linkSection = after.replace(/\n\[.*\]:.*(\n|$)/g, "");

  const newContent =
    before +
    "\n\n---\n\n" +
    entry +
    "\n" +
    linkSection.trimStart() +
    compareLinks.join("\n") +
    "\n";

  writeFileSync(path, newContent, "utf8");
}

// ── main ─────────────────────────────────────────────────────────────────────

const bump = process.argv[2] || "patch";

if (!["patch", "minor", "major"].includes(bump)) {
  console.error("Usage: node scripts/release.js [patch|minor|major]");
  process.exit(1);
}

// Check working tree is clean
const status = run("git status --porcelain");
if (status) {
  console.error(
    "Working tree is not clean. Commit or stash changes before releasing."
  );
  process.exit(1);
}

const tag = lastTag();
const commits = commitsSince(tag);

if (commits.length === 0) {
  console.log("No commits since last release. Nothing to release.");
  process.exit(0);
}

console.log(`\nCommits since ${tag || "beginning"}:`);
commits.forEach(({ msg }) => console.log(` · ${msg}`));

const sections = groupCommits(commits);

// Compute next version without bumping yet
const currentVersion = JSON.parse(
  readFileSync(resolve(ROOT, "package.json"), "utf8")
).version;

const [major, minor, patch] = currentVersion.split(".").map(Number);
const next =
  bump === "major"
    ? `${major + 1}.0.0`
    : bump === "minor"
    ? `${major}.${minor + 1}.0`
    : `${major}.${minor}.${patch + 1}`;

const today = new Date().toISOString().slice(0, 10);
const entry = buildEntry(next, today, sections);

console.log(`\nChangelog entry for v${next}:\n`);
console.log(entry);

updateChangelog(entry, next, tag);
console.log("✓ CHANGELOG.md updated");

// Stage changelog, then run npm version (creates commit + tag)
run("git add CHANGELOG.md");
run(`npm version ${bump} -m "chore(release): v%s"`);
console.log("✓ package.json bumped and tag created");

// Push
run("git push && git push --tags");
console.log(`\n✓ Released v${next}`);
