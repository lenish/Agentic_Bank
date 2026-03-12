export function DualRail() {
  return (
    <section className="py-24 bg-background relative overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">Dual-Rail Architecture</h2>
          <p className="text-foreground-secondary text-lg max-w-2xl mx-auto">
            Seamlessly bridging traditional fiat and programmable stablecoins through a unified compliance and policy pipeline.
          </p>
        </div>

        <div className="max-w-5xl mx-auto relative">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
            <div className="bg-card border border-card-border rounded-2xl p-8 text-center relative z-10 hover:border-primary/50 transition-colors">
              <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-4">SGD Domestic</h3>
              <p className="text-foreground-secondary mb-6">
                Direct integration with FAST/PayNow for instant fiat settlement and traditional banking operations.
              </p>
              <ul className="text-sm text-left space-y-2 text-foreground-secondary">
                <li className="flex items-center"><span className="text-primary mr-2">✓</span> Real-time fiat liquidity</li>
                <li className="flex items-center"><span className="text-primary mr-2">✓</span> Local vendor payments</li>
                <li className="flex items-center"><span className="text-primary mr-2">✓</span> Regulatory reporting</li>
              </ul>
            </div>

            <div className="relative h-full min-h-[300px] flex flex-col items-center justify-center z-0">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-full h-0.5 bg-gradient-to-r from-primary via-secondary to-secondary opacity-30"></div>
              </div>
              
              <div className="bg-background border-2 border-primary/50 rounded-xl p-6 text-center relative z-10 shadow-[0_0_30px_rgba(59,130,246,0.2)]">
                <h4 className="font-bold text-lg mb-2 text-primary">Shared Pipeline</h4>
                <div className="space-y-2 text-sm text-foreground-secondary">
                  <div className="bg-card px-4 py-2 rounded border border-card-border">KYA Identity</div>
                  <div className="bg-card px-4 py-2 rounded border border-card-border">Policy Engine</div>
                  <div className="bg-card px-4 py-2 rounded border border-card-border">Risk Scoring</div>
                </div>
              </div>
              
              <div className="absolute top-1/2 left-0 w-full flex justify-between -mt-3 px-4">
                <div className="w-3 h-3 rounded-full bg-primary animate-ping"></div>
                <div className="w-3 h-3 rounded-full bg-secondary animate-ping" style={{ animationDelay: '0.5s' }}></div>
              </div>
            </div>

            <div className="bg-card border border-card-border rounded-2xl p-8 text-center relative z-10 hover:border-secondary/50 transition-colors">
              <div className="w-16 h-16 mx-auto bg-secondary/10 rounded-full flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-4">Stablecoin</h3>
              <p className="text-foreground-secondary mb-6">
                Programmable settlement using regulated stablecoins for cross-border and micro-transactions.
              </p>
              <ul className="text-sm text-left space-y-2 text-foreground-secondary">
                <li className="flex items-center"><span className="text-secondary mr-2">✓</span> Global reach</li>
                <li className="flex items-center"><span className="text-secondary mr-2">✓</span> Smart contract native</li>
                <li className="flex items-center"><span className="text-secondary mr-2">✓</span> 24/7 instant settlement</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}