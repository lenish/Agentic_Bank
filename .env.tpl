# Agentic Bank — Environment Template
# All values MUST use 1Password op:// references. NO plaintext secrets.
# Usage: op run --env-file=.env.tpl -- <command>

DATABASE_URL=op://Server-Secrets/agentic-bank/database-url
REDIS_URL=op://Server-Secrets/agentic-bank/redis-url
KAFKA_BROKERS=op://Server-Secrets/agentic-bank/kafka-brokers
JWT_SECRET=op://Server-Secrets/agentic-bank/jwt-secret
