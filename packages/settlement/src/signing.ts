import { generateKeyPairSync, sign, verify, type KeyObject } from "crypto";

export const SIGNING_EVENT = {
  GENERATED: "GENERATED",
  SIGNED: "SIGNED",
  VERIFIED: "VERIFIED",
  ROTATED: "ROTATED",
} as const;

export type SigningEvent = (typeof SIGNING_EVENT)[keyof typeof SIGNING_EVENT];

export const STEP_UP_SIGNING_THRESHOLD_SGD_CENTS = 10_000_00;

export interface SigningPayload {
  amount_sgd_cents: number;
  [key: string]: unknown;
}

export interface SigningLogEntry {
  keyId: string;
  event: SigningEvent;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface SigningResult {
  keyId: string;
  keyVersion: number;
  signature: string;
  algorithm: "ed25519";
}

interface KeyRecord {
  currentVersion: number;
  privateKeys: Map<number, KeyObject>;
  publicKeys: Map<number, KeyObject>;
}

export class SigningService {
  // TODO: Replace in-memory key store with AWS KMS/HashiCorp Vault-backed signing.
  private readonly keyStore = new Map<string, KeyRecord>();
  private readonly signingLog: SigningLogEntry[] = [];

  generateKeyPair(keyId: string): void {
    this.assertKeyId(keyId);

    if (this.keyStore.has(keyId)) {
      throw new Error("SIGNING_KEY_ALREADY_EXISTS");
    }

    const pair = this.createEd25519Pair();
    this.keyStore.set(keyId, {
      currentVersion: 1,
      privateKeys: new Map<number, KeyObject>([[1, pair.privateKey]]),
      publicKeys: new Map<number, KeyObject>([[1, pair.publicKey]]),
    });

    this.appendLog({
      keyId,
      event: SIGNING_EVENT.GENERATED,
      timestamp: new Date(),
      metadata: { key_version: 1 },
    });
  }

  sign(
    keyId: string,
    payload: SigningPayload,
    policyApproved: boolean,
    stepUpToken?: string,
  ): SigningResult {
    this.assertPayload(payload);

    if (!policyApproved) {
      throw new Error("POLICY_NOT_APPROVED");
    }

    if (payload.amount_sgd_cents > STEP_UP_SIGNING_THRESHOLD_SGD_CENTS && !stepUpToken) {
      throw new Error("STEP_UP_REQUIRED");
    }

    const keyRecord = this.requireKeyRecord(keyId);
    const privateKey = keyRecord.privateKeys.get(keyRecord.currentVersion);
    if (!privateKey) {
      throw new Error("SIGNING_PRIVATE_KEY_MISSING");
    }

    const payloadBuffer = Buffer.from(JSON.stringify(payload), "utf8");
    const signature = sign(null, payloadBuffer, privateKey).toString("base64");

    this.appendLog({
      keyId,
      event: SIGNING_EVENT.SIGNED,
      timestamp: new Date(),
      metadata: {
        key_version: keyRecord.currentVersion,
        amount_sgd_cents: payload.amount_sgd_cents,
        step_up_present: Boolean(stepUpToken),
      },
    });

    return {
      keyId,
      keyVersion: keyRecord.currentVersion,
      signature,
      algorithm: "ed25519",
    };
  }

  verify(keyId: string, payload: SigningPayload, signature: string): boolean {
    this.assertPayload(payload);
    if (!signature.trim()) {
      throw new Error("SIGNATURE_REQUIRED");
    }

    const keyRecord = this.requireKeyRecord(keyId);
    const payloadBuffer = Buffer.from(JSON.stringify(payload), "utf8");
    const signatureBuffer = Buffer.from(signature, "base64");

    for (const [version, publicKey] of keyRecord.publicKeys.entries()) {
      const isValid = verify(null, payloadBuffer, publicKey, signatureBuffer);
      if (!isValid) {
        continue;
      }

      this.appendLog({
        keyId,
        event: SIGNING_EVENT.VERIFIED,
        timestamp: new Date(),
        metadata: { key_version: version, verification_result: true },
      });

      return true;
    }

    this.appendLog({
      keyId,
      event: SIGNING_EVENT.VERIFIED,
      timestamp: new Date(),
      metadata: { verification_result: false },
    });
    return false;
  }

  rotateKey(keyId: string): void {
    const keyRecord = this.requireKeyRecord(keyId);
    const pair = this.createEd25519Pair();
    const nextVersion = keyRecord.currentVersion + 1;

    keyRecord.currentVersion = nextVersion;
    keyRecord.privateKeys.set(nextVersion, pair.privateKey);
    keyRecord.publicKeys.set(nextVersion, pair.publicKey);

    this.appendLog({
      keyId,
      event: SIGNING_EVENT.ROTATED,
      timestamp: new Date(),
      metadata: { previous_version: nextVersion - 1, next_version: nextVersion },
    });
  }

  getSigningLog(): SigningLogEntry[] {
    return this.signingLog.map((entry) => ({
      ...entry,
      timestamp: new Date(entry.timestamp.getTime()),
      metadata: entry.metadata ? { ...entry.metadata } : undefined,
    }));
  }

  private appendLog(entry: SigningLogEntry): void {
    this.signingLog.push(entry);
  }

  private requireKeyRecord(keyId: string): KeyRecord {
    this.assertKeyId(keyId);

    const keyRecord = this.keyStore.get(keyId);
    if (!keyRecord) {
      throw new Error("SIGNING_KEY_NOT_FOUND");
    }

    return keyRecord;
  }

  private assertKeyId(keyId: string): void {
    if (!keyId.trim()) {
      throw new Error("SIGNING_KEY_ID_REQUIRED");
    }
  }

  private assertPayload(payload: SigningPayload): void {
    if (!Number.isInteger(payload.amount_sgd_cents) || payload.amount_sgd_cents < 0) {
      throw new Error("SIGNING_AMOUNT_INVALID");
    }
  }

  private createEd25519Pair(): { privateKey: KeyObject; publicKey: KeyObject } {
    return generateKeyPairSync("ed25519");
  }
}
