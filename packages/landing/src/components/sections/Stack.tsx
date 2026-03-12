const layers = [
  {
    id: "01",
    name: "KYA Identity",
    description: "SPIFFE ID + mTLS - machine-native identity. Agent is not human. Different auth model.",
    icon: "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
  },
  {
    id: "02",
    name: "Capability Delegation",
    description: "Bounded tokens: action, amount, TTL, counterparty. Owner controls what agent can do. Revocable.",
    icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
  },
  {
    id: "03",
    name: "Policy Engine",
    description: "OPA/Cedar deny-by-default. No spend without explicit policy. Shadow eval before deploy.",
    icon: "M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"
  },
  {
    id: "04",
    name: "Risk Scoring",
    description: "15 pre-trade rules, <100ms p95. Velocity, structuring, anomaly - real-time, kill-switchable.",
    icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
  },
  {
    id: "05",
    name: "Blockchain Infra",
    description: "Multi-chain adapter, KMS-based signing. Bridging agentic workloads to on-chain environments securely.",
    icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
  },
  {
    id: "06",
    name: "Stablecoin Settlement",
    description: "USDC/USDT + SGD dual rail. Programmable settlement with cross-border and domestic routing.",
    icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
  },
  {
    id: "07",
    name: "Dispute / Recon",
    description: "Auto-accept <$50, SLA tracking. Operational resilience with automated reconciliation paths.",
    icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
  },
  {
    id: "08",
    name: "Compliance",
    description: "Osprey AML + IVMS101 Travel Rule adapter. Designed for MAS sandbox-readiness from day one.",
    icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
  }
];

export function Stack() {
  return (
    <section className="py-24 bg-card relative border-y border-card-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">The 8-Layer Architecture</h2>
          <p className="text-foreground-secondary text-lg max-w-2xl mx-auto">
            A comprehensive stack designed from the ground up for autonomous financial operations.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col gap-4">
            {layers.map((layer, index) => (
              <div 
                key={layer.id}
                className="group relative bg-background border border-card-border rounded-xl p-6 hover:border-primary/50 transition-all duration-300 hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] hover:-translate-y-1"
              >
                <div className="flex items-center gap-6">
                  <div className="hidden sm:flex flex-col items-center justify-center w-16 h-16 rounded-lg bg-card border border-card-border group-hover:bg-primary/10 group-hover:border-primary/30 transition-colors">
                    <span className="text-xl font-bold text-foreground-secondary group-hover:text-primary transition-colors">{layer.id}</span>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <svg className="w-6 h-6 text-primary sm:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={layer.icon} />
                      </svg>
                      <h3 className="text-xl font-bold">{layer.name}</h3>
                    </div>
                    <p className="text-foreground-secondary">{layer.description}</p>
                  </div>
                  
                  <div className="hidden md:flex items-center justify-center w-12 h-12 rounded-full bg-card border border-card-border group-hover:bg-primary/10 group-hover:border-primary/30 transition-colors">
                    <svg className="w-6 h-6 text-foreground-secondary group-hover:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={layer.icon} />
                    </svg>
                  </div>
                </div>
                
                {index !== layers.length - 1 && (
                  <div className="absolute -bottom-4 left-14 sm:left-14 w-0.5 h-4 bg-card-border group-hover:bg-primary/30 transition-colors"></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}