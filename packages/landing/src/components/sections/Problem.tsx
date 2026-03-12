export function Problem() {
  return (
    <section className="py-24 bg-background relative">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">The Agent Finance Gap</h2>
          <p className="text-foreground-secondary text-lg max-w-2xl mx-auto">
            AI agents are becoming autonomous, but the financial infrastructure they rely on is stuck in the past.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-card border border-card-border rounded-2xl p-8 hover:border-red-500/30 transition-colors">
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
              <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-3">Today: Human-Centric</h3>
            <ul className="space-y-3 text-foreground-secondary">
              <li className="flex items-start">
                <span className="text-red-500 mr-2">✕</span>
                Agents use shared corporate cards or human-proxied payments
              </li>
              <li className="flex items-start">
                <span className="text-red-500 mr-2">✕</span>
                No identity standard for machine actors
              </li>
              <li className="flex items-start">
                <span className="text-red-500 mr-2">✕</span>
                Manual expense reconciliation
              </li>
            </ul>
          </div>

          <div className="bg-card border border-card-border rounded-2xl p-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent"></div>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-6 relative z-10">
              <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-3 relative z-10">The Missing Layer</h3>
            <p className="text-foreground-secondary relative z-10">
              Banks don't have products for non-human economic actors. First mover captures the infrastructure layer.
            </p>
          </div>

          <div className="bg-card border border-secondary/30 rounded-2xl p-8 hover:border-secondary/60 transition-colors shadow-[0_0_15px_rgba(16,185,129,0.1)]">
            <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center mb-6">
              <svg className="w-6 h-6 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-3">Tomorrow (2027+): Agentic</h3>
            <ul className="space-y-3 text-foreground-secondary">
              <li className="flex items-start">
                <span className="text-secondary mr-2">✓</span>
                Every enterprise runs 10-100+ agents with independent budgets
              </li>
              <li className="flex items-start">
                <span className="text-secondary mr-2">✓</span>
                KYA (Know Your Agent) regulation with full audit trail
              </li>
              <li className="flex items-start">
                <span className="text-secondary mr-2">✓</span>
                Real-time policy enforcement, automated settlement
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}