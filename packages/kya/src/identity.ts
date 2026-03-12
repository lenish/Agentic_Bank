import { createHmac, timingSafeEqual } from "node:crypto";
import { KYAStateMachine, KYA_STATES } from "./lifecycle";
import { InMemoryAgentStore } from "./store";

const DEFAULT_TTL_SECONDS = 60 * 60;
const SPIFFE_TRUST_DOMAIN = "aoa.local";

export interface AgentSVIDClaims {
  sub: string;
  spiffe_id: string;
  owner_id: string;
  iat: number;
  exp: number;
}

export interface IssuedSVID {
  svid: string;
  spiffeId: string;
  expiresAt: Date;
}

function base64UrlEncode(input: string): string {
  return Buffer.from(input).toString("base64url");
}

function base64UrlDecode(input: string): string {
  return Buffer.from(input, "base64url").toString("utf8");
}

function createSignature(content: string, secret: string): string {
  return createHmac("sha256", secret).update(content).digest("base64url");
}

export class AgentIdentity {
  private readonly store: InMemoryAgentStore;
  private readonly lifecycle: KYAStateMachine;

  constructor(private readonly signingSecret: string, store?: InMemoryAgentStore) {
    this.store = store ?? new InMemoryAgentStore();
    this.lifecycle = new KYAStateMachine(this.store);
  }

  issue(agentId: string, ownerId: string, ttlSeconds = DEFAULT_TTL_SECONDS): IssuedSVID {
    if (this.store.isRevoked(agentId)) {
      throw new Error("agent has been revoked and cannot receive new credentials");
    }

    const spiffeId = this.getSpiffeId(agentId);
    const nowSeconds = Math.floor(Date.now() / 1000);
    const claims: AgentSVIDClaims = {
      sub: agentId,
      spiffe_id: spiffeId,
      owner_id: ownerId,
      iat: nowSeconds,
      exp: nowSeconds + ttlSeconds,
    };

    const svid = this.signClaims(claims);
    this.store.setAttribution(agentId, ownerId);
    this.store.setLifecycleState(agentId, KYA_STATES.PENDING);

    return {
      svid,
      spiffeId,
      expiresAt: new Date(claims.exp * 1000),
    };
  }

  verify(svid: string): AgentSVIDClaims {
    const claims = this.decodeAndVerifySignature(svid);

    if (claims.spiffe_id !== this.getSpiffeId(claims.sub)) {
      throw new Error("invalid SPIFFE ID claim");
    }

    const attribution = this.store.getAttribution(claims.sub);
    if (!attribution || attribution.ownerId !== claims.owner_id) {
      throw new Error("agent attribution does not match token claims");
    }

    if (this.store.isRevoked(claims.sub)) {
      throw new Error("agent is revoked");
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    if (claims.exp <= nowSeconds) {
      throw new Error("SVID has expired");
    }

    return claims;
  }

  revoke(agentId: string): void {
    this.store.revokeAgent(agentId);
    this.store.setLifecycleState(agentId, KYA_STATES.REVOKED);
  }

  getOwnerAttribution(agentId: string): { ownerId: string; attributedAt: Date } | undefined {
    return this.store.getAttribution(agentId);
  }

  getSpiffeId(agentId: string): string {
    return `spiffe://${SPIFFE_TRUST_DOMAIN}/agent/${agentId}`;
  }

  private signClaims(claims: AgentSVIDClaims): string {
    const header = {
      alg: "HS256",
      typ: "JWT",
    };

    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(claims));
    const content = `${encodedHeader}.${encodedPayload}`;
    const signature = createSignature(content, this.signingSecret);

    return `${content}.${signature}`;
  }

  private decodeAndVerifySignature(svid: string): AgentSVIDClaims {
    const parts = svid.split(".");
    if (parts.length !== 3) {
      throw new Error("invalid SVID format");
    }

    const [header, payload, signature] = parts;
    const content = `${header}.${payload}`;
    const expectedSignature = createSignature(content, this.signingSecret);

    const actual = Buffer.from(signature);
    const expected = Buffer.from(expectedSignature);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      throw new Error("SVID signature verification failed");
    }

    const decodedPayload = base64UrlDecode(payload);
    return JSON.parse(decodedPayload) as AgentSVIDClaims;
  }
}
