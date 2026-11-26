/**
 * Wave 3 — Verified-Trace Skill Compiler & Static Anti-Injection Validator
 *
 * Parses repository `skills/<name>/SKILL.md` definitions into typed JSON IR
 * (`echo-fabricks.skill.ir/v1`), enforces static prompt-injection & boundary-hygiene
 * rules, and verifies declared check anchors.
 */

import fs from 'node:fs';
import path from 'node:path';
import { PublicationBoundarySentinel, canonicalJson, sha256Hex } from '../actuation/index.mjs';

const INJECTION_PATTERNS = [
  {
    id: 'INVISIBLE_BIDI_OR_TAG_UNICODE',
    regex: /[\u202A-\u202E\u2066-\u2069\uFEFF]/u
  },
  {
    id: 'PROMPT_OVERRIDE_DIRECTIVE',
    regex: /\b(?:ignore\s+(?:all\s+)?previous\s+instructions|disregard\s+system\s+prompt|you\s+are\s+now\s+unrestricted)\b/i
  },
  {
    id: 'REMOTE_PIPE_EXECUTION',
    regex: /\b(?:curl|wget)\b[^\n|]*\|\s*(?:bash|sh|zsh|node|python3?)\b/i
  }
];

export function parseSkillFrontmatter(markdownContent) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(markdownContent);
  if (!match) {
    throw new Error('SKILL_MISSING_YAML_FRONTMATTER');
  }
  const [, yamlBlock, body] = match;
  const meta = {};
  for (const line of yamlBlock.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;
    const key = trimmed.slice(0, colonIdx).trim();
    const val = trimmed
      .slice(colonIdx + 1)
      .trim()
      .replace(/^["']|["']$/g, '');
    meta[key] = val;
  }
  if (!meta.name || !meta.description) {
    throw new Error('SKILL_FRONTMATTER_REQUIRES_NAME_AND_DESCRIPTION');
  }
  return { meta, body };
}

export class VerifiedTraceSkillCompiler {
  constructor(options = {}) {
    this._sentinel = options.sentinel || new PublicationBoundarySentinel();
  }

  compileMarkdown(markdownContent, sourcePath = '<memory>/SKILL.md') {
    const { meta, body } = parseSkillFrontmatter(markdownContent);
    const securityFindings = [];

    for (const rule of INJECTION_PATTERNS) {
      if (rule.regex.test(markdownContent)) {
        securityFindings.push({ ruleId: rule.id, source: sourcePath });
      }
    }

    const sentinelScan = this._sentinel.scanText(markdownContent, sourcePath);
    for (const v of sentinelScan.violations) {
      securityFindings.push({ ruleId: v.ruleId, source: sourcePath, line: v.line });
    }

    if (securityFindings.length > 0) {
      const ids = securityFindings.map((f) => f.ruleId).join(', ');
      throw new Error(`SKILL_SECURITY_REJECTION (${meta.name}): ${ids}`);
    }

    const headings = [];
    const verifyAnchors = [];
    for (const line of body.split(/\r?\n/)) {
      const hMatch = /^(#{1,3})\s+(.+)$/.exec(line.trim());
      if (hMatch) {
        headings.push({ level: hMatch[1].length, title: hMatch[2].trim() });
      }
      const vMatch = /`emf\s+([a-z0-9-]+)`/.exec(line);
      if (vMatch && !verifyAnchors.includes(vMatch[1])) {
        verifyAnchors.push(vMatch[1]);
      }
    }

    if (verifyAnchors.length === 0) {
      throw new Error(
        `SKILL_MISSING_VERIFY_ANCHOR (${meta.name}): Include at least one executable \`emf <subcommand>\` verification anchor.`
      );
    }

    const irBody = {
      schemaVersion: 'echo-fabricks.skill.ir/v1',
      name: meta.name,
      description: meta.description,
      sourcePath,
      headings,
      verifyAnchors,
      securityStatus: 'STATIC_CLEAN'
    };
    return Object.freeze({
      ...irBody,
      irSha256: sha256Hex(canonicalJson(irBody))
    });
  }

  compileSkillsDirectory(skillsRootDir, repoRootDir = skillsRootDir) {
    if (!fs.existsSync(skillsRootDir)) {
      return { compiledCount: 0, skills: [], graphSha256: sha256Hex('[]') };
    }
    const entries = fs
      .readdirSync(skillsRootDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .sort((a, b) => a.name.localeCompare(b.name));

    const compiled = [];
    for (const dir of entries) {
      const skillFile = path.join(skillsRootDir, dir.name, 'SKILL.md');
      if (!fs.existsSync(skillFile)) continue;
      const rel = path.relative(repoRootDir, skillFile).split(path.sep).join('/');
      const raw = fs.readFileSync(skillFile, 'utf8');
      compiled.push(this.compileMarkdown(raw, rel));
    }

    return {
      schemaVersion: 'echo-fabricks.skill-graph/v1',
      compiledCount: compiled.length,
      skills: compiled,
      graphSha256: sha256Hex(canonicalJson(compiled))
    };
  }
}
