#!/usr/bin/env node
/**
 * Echo-Memory-Fabricks — Zero-Dependency Stdio MCP Server (`echo-memory-mcp` v0.2.0)
 *
 * Exposes 14 deterministic tools across Bricks 1-12 over JSON-RPC 2.0 stdio
 * with strict stdout purity guard.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ACTOR_CLASSES,
  ChannelEchoKernel,
  DISTURBANCE_TIERS,
  EchoReconstructionEngine,
  MATCH_KIND,
  MemoryFabric,
  ProvenanceChain,
  PublicationBoundarySentinel,
  TARGET_RINGS,
  evaluatePushJudgment,
  generateCoaPacket,
  mintCapsule,
  parseSiblingLedgerMarkdown,
  runColdHarnessReplay,
  verifyCapsule,
  verifyThreeWayPolyglotParity
} from '../src/index.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const MCP_TOOLS = [
  {
    name: 'fabric_ingest_fluid',
    description:
      'Ingest a memory artifact into FLUID_KINETIC tier (with PENDING_FILL completeness gating and passive Seed-RAM resonance check).',
    inputSchema: {
      type: 'object',
      required: ['id', 'artifactContent'],
      properties: {
        id: { type: 'string' },
        title: { type: 'string' },
        artifactContent: { type: 'string' },
        contextFill: { type: 'string' },
        scopes: { type: 'array', items: { type: 'string' } },
        deferralReason: { type: 'string' },
        reDateAt: { type: 'string' }
      }
    }
  },
  {
    name: 'fabric_attach_context_fill',
    description: 'Attach missing co-referential contextFill to lift a PENDING_FILL record to COMPLETE.',
    inputSchema: {
      type: 'object',
      required: ['id', 'contextFill'],
      properties: {
        id: { type: 'string' },
        contextFill: { type: 'string' }
      }
    }
  },
  {
    name: 'fabric_promote_tier',
    description:
      'Promote a memory record across allowed adjacent tiers (FLUID_KINETIC -> TICK_RAM -> HOLD_RAM -> SOLID_STATE -> ROM -> CASCADE_HOLD or SEED_RAM).',
    inputSchema: {
      type: 'object',
      required: ['id', 'targetTier'],
      properties: {
        id: { type: 'string' },
        targetTier: { type: 'string' },
        adjudicationVerdict: { type: 'string' }
      }
    }
  },
  {
    name: 'fabric_associative_search',
    description: 'Search across memory tiers using Base-243 stored VSA hypervectors and directional scope filters.',
    inputSchema: {
      type: 'object',
      required: ['queryText'],
      properties: {
        queryText: { type: 'string' },
        scopes: { type: 'array', items: { type: 'string' } },
        topK: { type: 'number' }
      }
    }
  },
  {
    name: 'fabric_reconstruct_bracket',
    description:
      'Execute the 6-step Temporal-Bracket Memory Reconstruction Protocol and plant a Seed-RAM trap if unrecovered.',
    inputSchema: {
      type: 'object',
      required: ['sessionId', 'beforeWindow', 'afterWindow'],
      properties: {
        sessionId: { type: 'string' },
        title: { type: 'string' },
        beforeWindow: { type: 'string' },
        afterWindow: { type: 'string' },
        inputs: { type: 'array', items: { type: 'string' } },
        scopes: { type: 'array', items: { type: 'string' } },
        fragments: { type: 'array' },
        missingHoles: { type: 'array', items: { type: 'string' } },
        matchKind: { type: 'string' }
      }
    }
  },
  {
    name: 'fabric_channel_echo_eval',
    description:
      'Evaluate a numeric residual stream through the per-observer Dual-Window Adaptive Channel-Echo Kernel.',
    inputSchema: {
      type: 'object',
      required: ['observerId', 'samples'],
      properties: {
        observerId: { type: 'string' },
        samples: { type: 'array', items: { type: 'number' } }
      }
    }
  },
  {
    name: 'fabric_mint_capsule',
    description:
      'Mint and SHA-256 verify a 6-field Context Actuation & Rehydration Capsule with Publication Sentinel gating.',
    inputSchema: {
      type: 'object',
      required: [
        'name',
        'function',
        'temporalProgression',
        'startAnchor',
        'closeOutState',
        'deliberateFutureContextHook'
      ],
      properties: {
        name: { type: 'string' },
        function: { type: 'string' },
        temporalProgression: { type: 'object' },
        startAnchor: { type: 'object' },
        closeOutState: { type: 'object' },
        deliberateFutureContextHook: { type: 'object' }
      }
    }
  },
  {
    name: 'fabric_provenance_record',
    description:
      'Record an artifact in the Provenance & Attribution Chain (enforcing part-level decomposition on COMBINED origins).',
    inputSchema: {
      type: 'object',
      required: ['artifactId', 'origin'],
      properties: {
        artifactId: { type: 'string' },
        origin: { type: 'string' },
        contributions: { type: 'array' },
        recordedBy: { type: 'string' }
      }
    }
  },
  {
    name: 'fabric_audit_sentinel',
    description: 'Run the Downstream Publication-Boundary Sentinel across text or the repository.',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string' }
      }
    }
  },
  {
    name: 'fabric_cold_harness',
    description: 'Run the deterministic Cold-Harness verification replay across Bricks 1-8.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'fabric_translate_ledger',
    description:
      'Parse a sibling <!-- LEDGER --> Markdown chain header into canonical Cascade-Hold structure and detect format gaps.',
    inputSchema: {
      type: 'object',
      required: ['markdownText'],
      properties: {
        markdownText: { type: 'string' }
      }
    }
  },
  {
    name: 'fabric_generate_coa',
    description:
      'Generate a SHA-256 sealed Course-of-Action (COA) Procedural Decision Packet with disturbance tier and confirmation threshold.',
    inputSchema: {
      type: 'object',
      required: ['packetId', 'whatWeKnow', 'whatWeDoNotKnow', 'candidateCourses', 'recommendedLeanId'],
      properties: {
        packetId: { type: 'string' },
        whatWeKnow: { type: 'array', items: { type: 'string' } },
        whatWeDoNotKnow: { type: 'array', items: { type: 'string' } },
        candidateCourses: { type: 'array' },
        disturbanceTier: { type: 'string' },
        recommendedLeanId: { type: 'string' }
      }
    }
  },
  {
    name: 'fabric_polyglot_parity',
    description:
      'Run 3-language polyglot consensus verification across Node >=22 (V8), Python 3.12 (-S), and pure-std Rust 1.100 (DELEGATE-B).',
    inputSchema: {
      type: 'object',
      properties: {
        seed: { type: 'number' }
      }
    }
  },
  {
    name: 'fabric_push_judgment',
    description:
      'Evaluate the 6-Gauge Outbound Push Judgment Router and emit a signed Push Routing Slip.',
    inputSchema: {
      type: 'object',
      required: ['targetRing', 'branchName'],
      properties: {
        targetRing: { type: 'string' },
        branchName: { type: 'string' },
        upstreamWaveLag: { type: 'number' },
        operatorExplicitWord: { type: 'boolean' }
      }
    }
  }
];

export function createMcpDispatcher() {
  const fabric = new MemoryFabric({ vsaDim: 512 });
  const reconstructor = new EchoReconstructionEngine(fabric);
  const provenance = new ProvenanceChain();
  const sentinel = new PublicationBoundarySentinel();

  function callTool(name, args = {}) {
    switch (name) {
      case 'fabric_ingest_fluid':
        return fabric.ingestFluid(args);
      case 'fabric_attach_context_fill':
        return fabric.attachContextFill(args.id, args.contextFill);
      case 'fabric_promote_tier':
        return fabric.promote(args.id, args.targetTier, {
          adjudicationVerdict: args.adjudicationVerdict
        });
      case 'fabric_associative_search':
        return fabric.associativeSearch(args.queryText, {
          scopes: args.scopes || [],
          topK: args.topK || 5
        });
      case 'fabric_reconstruct_bracket': {
        reconstructor.openBracketSession({
          sessionId: args.sessionId,
          title: args.title,
          beforeWindow: args.beforeWindow,
          afterWindow: args.afterWindow,
          activityContext: { inputs: args.inputs || [] },
          scopes: args.scopes || ['scope:ideas-cues']
        });
        reconstructor.generateTriggers(args.sessionId);
        return reconstructor.completeReconstruction(args.sessionId, {
          fragments: args.fragments || [],
          missingHoles: args.missingHoles || [],
          matchKind: args.matchKind || MATCH_KIND.UNRECOVERED_OPEN_LOOP
        });
      }
      case 'fabric_channel_echo_eval': {
        const kernel = new ChannelEchoKernel();
        const steps = (args.samples || []).map((rawZ, idx) =>
          kernel.stepObserver(args.observerId, { rawZ, tick: idx + 1 })
        );
        return {
          observerId: args.observerId,
          sampleCount: steps.length,
          finalStep: steps[steps.length - 1] || null,
          engagedCount: steps.filter((s) => s.engaged).length
        };
      }
      case 'fabric_mint_capsule': {
        const cap = mintCapsule(args);
        const check = verifyCapsule(cap);
        return { capsule: cap, verification: check };
      }
      case 'fabric_provenance_record':
        return provenance.recordArtifact({
          artifactId: args.artifactId,
          origin: args.origin,
          contributions: args.contributions || [],
          recordedBy: args.recordedBy || ACTOR_CLASSES.ANTIGRAVITY_VM
        });
      case 'fabric_audit_sentinel':
        return typeof args.text === 'string'
          ? sentinel.scanText(args.text)
          : sentinel.scanDirectory(REPO_ROOT);
      case 'fabric_cold_harness':
        return runColdHarnessReplay({ repoRootDir: REPO_ROOT });
      case 'fabric_translate_ledger':
        return parseSiblingLedgerMarkdown(args.markdownText);
      case 'fabric_generate_coa':
        return generateCoaPacket({
          ...args,
          disturbanceTier: args.disturbanceTier || DISTURBANCE_TIERS.GAUGE_ASSESSMENT
        });
      case 'fabric_polyglot_parity':
        return verifyThreeWayPolyglotParity(args.seed ?? 20261125, REPO_ROOT);
      case 'fabric_push_judgment':
        return evaluatePushJudgment({
          targetRing: args.targetRing || TARGET_RINGS.LOCAL_BARE_SIM,
          branchName: args.branchName,
          upstreamWaveLag: args.upstreamWaveLag ?? 1,
          operatorExplicitWord: Boolean(args.operatorExplicitWord),
          trinity: {
            authorize: ACTOR_CLASSES.OPERATOR,
            delegateA: 'NODE22_BUILDER',
            delegateB: 'RUST_STD_DELEGATE_B'
          },
          inverseRetreatOp: { name: 'REVERT_OR_DELETE_REF' },
          repoRootDir: REPO_ROOT
        });
      default:
        throw new Error(`UNKNOWN_MCP_TOOL: "${name}"`);
    }
  }

  function handleJsonRpc(msg) {
    if (!msg || msg.jsonrpc !== '2.0') {
      return {
        jsonrpc: '2.0',
        id: msg?.id ?? null,
        error: { code: -32600, message: 'Invalid JSON-RPC 2.0 request' }
      };
    }
    if (msg.id === undefined) {
      return null;
    }

    try {
      if (msg.method === 'initialize') {
        return {
          jsonrpc: '2.0',
          id: msg.id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: { tools: {} },
            serverInfo: {
              name: 'echo-memory-mcp',
              version: '0.2.0'
            }
          }
        };
      }
      if (msg.method === 'ping') {
        return { jsonrpc: '2.0', id: msg.id, result: {} };
      }
      if (msg.method === 'tools/list') {
        return { jsonrpc: '2.0', id: msg.id, result: { tools: MCP_TOOLS } };
      }
      if (msg.method === 'tools/call') {
        const { name, arguments: toolArgs } = msg.params || {};
        const output = callTool(name, toolArgs || {});
        return {
          jsonrpc: '2.0',
          id: msg.id,
          result: {
            content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
            isError: false
          }
        };
      }
      return {
        jsonrpc: '2.0',
        id: msg.id,
        error: { code: -32601, message: `Method not found: ${msg.method}` }
      };
    } catch (err) {
      return {
        jsonrpc: '2.0',
        id: msg.id,
        result: {
          content: [{ type: 'text', text: JSON.stringify({ error: err.message }) }],
          isError: true
        }
      };
    }
  }

  return { handleJsonRpc, callTool };
}

function startStdioServer() {
  const rawStdoutWrite = process.stdout.write.bind(process.stdout);
  console.log = (...args) => {
    process.stderr.write(args.join(' ') + '\n');
  };

  const { handleJsonRpc } = createMcpDispatcher();
  let buffer = '';

  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => {
    buffer += chunk;
    let newlineIdx = buffer.indexOf('\n');
    while (newlineIdx !== -1) {
      const line = buffer.slice(0, newlineIdx).trim();
      buffer = buffer.slice(newlineIdx + 1);
      if (line.length > 0 && line.startsWith('{')) {
        try {
          const req = JSON.parse(line);
          const res = handleJsonRpc(req);
          if (res) {
            rawStdoutWrite(JSON.stringify(res) + '\n');
          }
        } catch (err) {
          rawStdoutWrite(
            JSON.stringify({
              jsonrpc: '2.0',
              id: null,
              error: { code: -32700, message: `Parse error: ${err.message}` }
            }) + '\n'
          );
        }
      }
      newlineIdx = buffer.indexOf('\n');
    }
  });
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  startStdioServer();
}
