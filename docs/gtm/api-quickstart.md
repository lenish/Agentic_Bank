# Agentic Bank — API Quickstart

Get your AI agent transacting in under 5 minutes.

## Prerequisites

- API key (obtain from [dashboard](https://dashboard.agentic.bank))
- Agent workload with SPIFFE/SVID identity

## Step 1: Create an Account of Agency (AOA)

```bash
curl -X POST https://api.agentic.bank/v1/accounts \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_spiffe_id": "spiffe://example.org/agent/trading-bot-1",
    "display_name": "Trading Bot Alpha",
    "initial_maturity": "RULE_ONLY"
  }'
```

Response:

```json
{
  "account_id": "aoa_01JEXAMPLE",
  "agent_spiffe_id": "spiffe://example.org/agent/trading-bot-1",
  "display_name": "Trading Bot Alpha",
  "maturity_stage": "RULE_ONLY",
  "created_at": "2025-01-15T08:30:00Z"
}
```

## Step 2: Issue a Capability Token

```bash
curl -X POST https://api.agentic.bank/v1/tokens \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "account_id": "aoa_01JEXAMPLE",
    "capabilities": ["transfer:sgd:max_1000", "balance:read"],
    "ttl_seconds": 3600
  }'
```

Response:

```json
{
  "token": "cap_tok_EXAMPLE",
  "capabilities": ["transfer:sgd:max_1000", "balance:read"],
  "expires_at": "2025-01-15T09:30:00Z"
}
```

## Step 3: Execute a Transfer

```bash
curl -X POST https://api.agentic.bank/v1/transfers \
  -H "Authorization: Bearer cap_tok_EXAMPLE" \
  -H "Content-Type: application/json" \
  -d '{
    "from_account": "aoa_01JEXAMPLE",
    "to_account": "aoa_02JRECIPIENT",
    "amount": "500.00",
    "currency": "SGD",
    "memo": "Payment for compute resources"
  }'
```

Response:

```json
{
  "transfer_id": "txn_03JEXAMPLE",
  "status": "COMPLETED",
  "risk_score": 0.12,
  "risk_rules_passed": 15,
  "risk_rules_failed": 0,
  "settlement_time_ms": 1850,
  "audit_record_id": "aud_04JEXAMPLE"
}
```

## Step 4: Check Account Balance

```bash
curl https://api.agentic.bank/v1/accounts/aoa_01JEXAMPLE/balance \
  -H "Authorization: Bearer cap_tok_EXAMPLE"
```

Response:

```json
{
  "account_id": "aoa_01JEXAMPLE",
  "balances": [
    { "currency": "SGD", "available": "9500.00", "pending": "0.00" }
  ]
}
```

## Step 5: Query Audit Trail

```bash
curl "https://api.agentic.bank/v1/audit?account_id=aoa_01JEXAMPLE&limit=10" \
  -H "Authorization: Bearer $API_KEY"
```

Response:

```json
{
  "records": [
    {
      "audit_id": "aud_04JEXAMPLE",
      "event": "TRANSFER_COMPLETED",
      "transfer_id": "txn_03JEXAMPLE",
      "risk_score": 0.12,
      "policy_decision": "ALLOW",
      "timestamp": "2025-01-15T08:31:02Z"
    }
  ]
}
```

## Error Handling

All errors follow a consistent format:

```json
{
  "error": {
    "code": "RISK_LIMIT_EXCEEDED",
    "message": "Transfer amount exceeds single transaction limit for RULE_ONLY maturity",
    "details": {
      "rule": "single_transaction_limit",
      "limit": "1000.00",
      "requested": "5000.00"
    }
  }
}
```

Common error codes:

| Code | Description |
|------|-------------|
| `INVALID_TOKEN` | Capability token expired or revoked |
| `INSUFFICIENT_CAPABILITY` | Token lacks required capability |
| `RISK_LIMIT_EXCEEDED` | Transaction blocked by risk rule |
| `POLICY_DENIED` | Policy engine denied the action |
| `INSUFFICIENT_BALANCE` | Account has insufficient funds |
| `AML_SCREENING_HOLD` | Transaction held for AML review |

## SDKs

### TypeScript

```typescript
import { AgenticBank } from '@agentic-bank/sdk';

const bank = new AgenticBank({ apiKey: process.env.API_KEY });

const account = await bank.accounts.create({
  agentSpiffeId: 'spiffe://example.org/agent/bot-1',
  displayName: 'My Trading Bot',
});

const token = await bank.tokens.issue({
  accountId: account.id,
  capabilities: ['transfer:sgd:max_1000'],
  ttlSeconds: 3600,
});

const transfer = await bank.transfers.execute({
  token: token.token,
  fromAccount: account.id,
  toAccount: 'aoa_02JRECIPIENT',
  amount: '500.00',
  currency: 'SGD',
});
```

### Python

```python
from agentic_bank import AgenticBank

bank = AgenticBank(api_key=os.environ["API_KEY"])

account = bank.accounts.create(
    agent_spiffe_id="spiffe://example.org/agent/bot-1",
    display_name="My Trading Bot",
)

token = bank.tokens.issue(
    account_id=account.id,
    capabilities=["transfer:sgd:max_1000"],
    ttl_seconds=3600,
)

transfer = bank.transfers.execute(
    token=token.token,
    from_account=account.id,
    to_account="aoa_02JRECIPIENT",
    amount="500.00",
    currency="SGD",
)
```

## Next Steps

- [Technical Datasheet](./datasheet.md) — full architecture and specifications
- [Executive Summary](./one-pager.md) — business overview
- Contact us to start your pilot program
