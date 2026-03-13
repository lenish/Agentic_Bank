export function Partnership() {
  return (
    <section className="py-24 bg-card relative border-y border-card-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">Backed by Industry Leaders</h2>
          <p className="text-foreground-secondary text-lg max-w-2xl mx-auto mb-4">
            A strategic collaboration bringing together institutional banking, Web3 expertise, and cutting-edge engineering.
          </p>
          <p className="text-sm text-muted-foreground max-w-3xl mx-auto">
            Separate legal entity (Zodia archetype). SCV = regulatory/distribution. Hashed = crypto infra/execution. Stage-gate governance with clear DRI ownership.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div className="bg-background border border-card-border rounded-2xl p-8 hover:border-primary/30 transition-colors">
            <div className="h-16 flex items-center mb-6">
              <span className="text-2xl font-bold tracking-wider text-white">SC Ventures</span>
            </div>
            <h3 className="text-xl font-bold mb-4 text-primary">Institutional Finance</h3>
            <ul className="space-y-3 text-foreground-secondary text-sm">
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                MAS regulatory pathway + sandbox sponsorship
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                Pan-Asia banking licenses (SG, HK, UAE)
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                Enterprise distribution (SC corporate clients)
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                Venture governance (Zodia/Nexus/Libeara playbook)
              </li>
            </ul>
          </div>

          <div className="bg-background border border-card-border rounded-2xl p-8 hover:border-primary/30 transition-colors">
            <div className="h-16 flex items-center mb-6">
              <span className="text-2xl font-bold tracking-wider text-white">Hashed</span>
            </div>
            <h3 className="text-xl font-bold mb-4 text-primary">Blockchain & AI</h3>
            <ul className="space-y-3 text-foreground-secondary text-sm">
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                Deep expertise in blockchain infra and tokenomics
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                Top-tier Web3 network and stablecoin integration
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                Execution speed and AI/Crypto convergence
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                Go-to-market for crypto-native agents
              </li>
            </ul>
          </div>

          <div className="bg-background border border-card-border rounded-2xl p-8 hover:border-primary/30 transition-colors">
            <div className="h-16 flex items-center mb-6">
              <span className="text-2xl font-bold tracking-wider text-white">AOA Team</span>
            </div>
            <h3 className="text-xl font-bold mb-4 text-primary">Product & Engineering</h3>
            <ul className="space-y-3 text-foreground-secondary text-sm">
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                Full-stack product engineering (8-layer infra)
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                AI-native UX + developer API
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                Operational execution (build, ship, iterate)
              </li>
            </ul>
          </div>
        </div>

      </div>
    </section>
  );
}