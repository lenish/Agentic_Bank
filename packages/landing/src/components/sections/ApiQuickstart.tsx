'use client';

import React, { useState } from 'react';

export function ApiQuickstart() {
  const [activeTab, setActiveTab] = useState(0);

  const steps = [
    {
      title: "Create AOA",
      code: `curl -X POST https://api.agentic.bank/v1/accounts \\
  -H "Authorization: Bearer $API_KEY" \\
  -d '{
    "agent_spiffe_id": "spiffe://example.org/agent/trading-bot-1",
    "display_name": "Trading Bot Alpha",
    "initial_maturity": "RULE_ONLY"
  }'`
    },
    {
      title: "Issue Token",
      code: `curl -X POST https://api.agentic.bank/v1/tokens \\
  -d '{
    "account_id": "aoa_01JEXAMPLE",
    "capabilities": ["transfer:sgd:max_1000", "balance:read"],
    "ttl_seconds": 3600
  }'`
    },
    {
      title: "Execute Transfer",
      code: `curl -X POST https://api.agentic.bank/v1/transfers \\
  -H "Authorization: Bearer cap_tok_EXAMPLE" \\
  -d '{
    "from_account": "aoa_01JEXAMPLE",
    "to_account": "aoa_02JRECIPIENT",
    "amount": "500.00",
    "currency": "SGD"
  }'`
    }
  ];

  return (
    <section className="py-24 bg-background relative border-y border-card-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">Ship in Minutes, Not Months</h2>
          <p className="text-foreground-secondary text-lg max-w-2xl mx-auto">
            Get your AI agent transacting in under 5 minutes.
          </p>
        </div>

        <div className="max-w-4xl mx-auto bg-card border border-card-border rounded-2xl overflow-hidden shadow-2xl">
          <div className="flex border-b border-card-border bg-slate-900/50">
            {steps.map((step, index) => (
              <button
                key={index}
                onClick={() => setActiveTab(index)}
                className={`flex-1 py-4 px-6 text-sm font-medium transition-colors ${
                  activeTab === index 
                    ? 'bg-slate-800 text-primary border-b-2 border-primary' 
                    : 'text-foreground-secondary hover:text-foreground hover:bg-slate-800/50'
                }`}
              >
                <span className="mr-2 opacity-50">{index + 1}.</span>
                {step.title}
              </button>
            ))}
          </div>
          
          <div className="p-6 bg-slate-800">
            <pre className="font-mono text-sm text-slate-300 overflow-x-auto">
              <code>{steps[activeTab].code}</code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}
