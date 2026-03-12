/**
 * Standalone dev server for the AOA API Gateway.
 *
 * Wires up all in-memory service implementations and starts Bun.serve()
 * on the configured port. This is NOT the production entrypoint — it uses
 * in-memory stores suitable for local development and demo.
 *
 * Usage:
 *   bun run packages/api-gateway/src/server.ts
 */

import { createGateway } from "./gateway";
import { PaymentPipeline } from "./pipeline";
import type { PaymentPipelineServices } from "./pipeline";
import { createBillingRoutes } from "./pricing";
import { PricingEngine } from "./pricing";

// ── Service imports ──────────────────────────────────────────────────────────
import { AgentIdentity, CapabilityTokenService } from "@aoa/kya";
import { PolicyEngine } from "@aoa/policy";
import { RiskEngine } from "@aoa/risk";
import {
  SettlementStateMachine,
  SgdRailAdapter,
  IdempotencyStore,
} from "@aoa/settlement";
import { InMemoryLedgerStore, LedgerService, AccountType } from "@aoa/ledger";
import { DecisionRecordService } from "@aoa/compliance";

// ── Configuration ────────────────────────────────────────────────────────────

const PORT = Number(process.env.PORT ?? 8000);
const SIGNING_SECRET = process.env.JWT_SECRET ?? "dev-signing-secret-do-not-use-in-prod";

// ── Instantiate services ─────────────────────────────────────────────────────

const identity = new AgentIdentity(SIGNING_SECRET);
const capabilityService = new CapabilityTokenService();
const policyEngine = new PolicyEngine();
const riskEngine = new RiskEngine();
const settlementStateMachine = new SettlementStateMachine();
const sgdRail = new SgdRailAdapter({ successRate: 1.0 }); // 100% success for dev
const idempotencyStore = new IdempotencyStore();
const ledgerStore = new InMemoryLedgerStore();
const ledgerService = new LedgerService(ledgerStore);
const decisionRecordService = new DecisionRecordService();
const pricingEngine = new PricingEngine();

// ── Seed demo data ───────────────────────────────────────────────────────────

const DEMO_AGENT_ID = "agent-demo-001";
const DEMO_OWNER_ID = "owner-demo-001";
const DEMO_COUNTERPARTY = "vendor-acme-001";

// 1. Issue SVID for the demo agent
const { svid: demoSvid } = identity.issue(DEMO_AGENT_ID, DEMO_OWNER_ID);

// 2. Issue a capability token
const demoCapability = capabilityService.issue({
  agent_id: DEMO_AGENT_ID,
  principal_id: DEMO_OWNER_ID,
  action_set: ["TRANSFER"],
  amount_limit_sgd_cents: 100_000_00, // 100,000 SGD
  counterparty_scope: [DEMO_COUNTERPARTY, "*"],
  ttl_seconds: 86400, // 24 hours
  max_frequency_per_hour: 100,
  revocable: true,
});

// 3. Register a default policy (allow up to 50,000 SGD)
policyEngine.registerPolicyVersion({
  policy_id: "default-policy",
  version: "1.0.0",
  effective_from: new Date(),
  rules: [
    {
      id: "allow-under-50k",
      name: "Allow payments under 50,000 SGD",
      priority: 1,
      effect: "ALLOW",
      amount_limit: { max_amount_sgd_cents: 50_000_00 },
    },
  ],
});
policyEngine.setCurrentVersion("default-policy", "1.0.0");

// 4. Create ledger accounts for demo agent and counterparty
ledgerStore.createAccount({
  id: DEMO_AGENT_ID,
  type: AccountType.AGENT_ACCOUNT,
  createdAt: new Date(),
});
ledgerStore.createAccount({
  id: DEMO_COUNTERPARTY,
  type: AccountType.USER_ACCOUNT,
  createdAt: new Date(),
});

// ── Wire up PaymentPipeline ──────────────────────────────────────────────────

const pipelineServices: PaymentPipelineServices = {
  kya: identity,
  capability: capabilityService,
  policy: policyEngine,
  risk: riskEngine,
  settlement: {
    stateMachine: settlementStateMachine,
    rail: sgdRail,
    idempotencyStore,
  },
  ledger: ledgerService,
  compliance: decisionRecordService,
};

const paymentPipeline = new PaymentPipeline(pipelineServices);

// ── Create Gateway ───────────────────────────────────────────────────────────

const app = createGateway({
  capabilityLookup: capabilityService,
  paymentPipeline,
});

// ── Mount billing routes ─────────────────────────────────────────────────────

const billingApp = createBillingRoutes(pricingEngine);
app.route("/api/v1/billing", billingApp);

// ── Start server ─────────────────────────────────────────────────────────────

const server = Bun.serve({
  port: PORT,
  fetch: app.fetch,
});

console.log(`
╔══════════════════════════════════════════════════════════════╗
║          AOA API Gateway — Development Server               ║
╠══════════════════════════════════════════════════════════════╣
║  URL:        http://localhost:${server.port}/health${" ".repeat(Math.max(0, 22 - String(server.port).length))}║
║  OpenAPI:    http://localhost:${server.port}/api/v1${" ".repeat(Math.max(0, 24 - String(server.port).length))}║
╠══════════════════════════════════════════════════════════════╣
║  Demo Credentials (copy-paste ready):                       ║
║                                                             ║
║  Bearer Token (SVID):                                       ║
║  ${demoSvid.slice(0, 56)}... ║
║                                                             ║
║  Capability ID:                                             ║
║  ${demoCapability.id}${" ".repeat(Math.max(0, 42 - demoCapability.id.length))}║
║                                                             ║
║  Agent ID:     ${DEMO_AGENT_ID}${" ".repeat(Math.max(0, 40 - DEMO_AGENT_ID.length))}║
║  Counterparty: ${DEMO_COUNTERPARTY}${" ".repeat(Math.max(0, 40 - DEMO_COUNTERPARTY.length))}║
╠══════════════════════════════════════════════════════════════╣
║  Try it:                                                    ║
║  curl http://localhost:${server.port}/health${" ".repeat(Math.max(0, 32 - String(server.port).length))}║
║                                                             ║
║  curl -X POST http://localhost:${server.port}/api/v1/payments \\${" ".repeat(Math.max(0, 20 - String(server.port).length))}║
║    -H "Authorization: Bearer <SVID>" \\                      ║
║    -H "X-Capability-Id: <CAP_ID>" \\                         ║
║    -H "Content-Type: application/json" \\                    ║
║    -d '{"amount":30000,"to":"${DEMO_COUNTERPARTY}",${" ".repeat(Math.max(0, 13 - DEMO_COUNTERPARTY.length))}║
║         "agent_id":"${DEMO_AGENT_ID}"}'${" ".repeat(Math.max(0, 23 - DEMO_AGENT_ID.length))}║
╚══════════════════════════════════════════════════════════════╝
`);

// Write credentials to stdout as easy copy-paste block
console.log("# Quick test commands:");
console.log(`export AOA_TOKEN="${demoSvid}"`);
console.log(`export AOA_CAP_ID="${demoCapability.id}"`);
console.log(`export AOA_URL="http://localhost:${server.port}"`);
console.log("");
console.log("# Health check:");
console.log(`curl -s $AOA_URL/health | jq .`);
console.log("");
console.log("# Create payment (300 SGD):");
console.log(`curl -s -X POST $AOA_URL/api/v1/payments \\`);
console.log(`  -H "Authorization: Bearer $AOA_TOKEN" \\`);
console.log(`  -H "X-Capability-Id: $AOA_CAP_ID" \\`);
console.log(`  -H "Content-Type: application/json" \\`);
console.log(`  -d '{"amount":30000,"to":"${DEMO_COUNTERPARTY}","agent_id":"${DEMO_AGENT_ID}","action":"TRANSFER"}' | jq .`);
