export function Pipeline() {
  return (
    <section className="py-24 bg-background relative overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">The Transaction Pipeline</h2>
          <p className="text-foreground-secondary text-lg max-w-2xl mx-auto">
            Every agent request flows through a rigorous, real-time verification process before settlement.
          </p>
        </div>

        <div className="max-w-5xl mx-auto relative">
          <div className="absolute top-1/2 left-0 w-full h-1 bg-card-border -translate-y-1/2 hidden md:block z-0"></div>
          
          <div className="absolute top-1/2 left-0 w-full h-1 bg-gradient-to-r from-primary via-secondary to-primary -translate-y-1/2 hidden md:block z-0 animate-flow"></div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 relative z-10">
            {[
              { step: 1, name: "Intent", desc: "Agent requests payment" },
              { step: 2, name: "KYA Check", desc: "Identity & hash verified" },
              { step: 3, name: "Policy", desc: "Limits & rules applied" },
              { step: 4, name: "Risk", desc: "Anomaly detection" },
              { step: 5, name: "Settlement", desc: "Funds transferred" }
            ].map((stage) => (
              <div key={stage.step} className="flex flex-col items-center text-center group">
                <div className="w-16 h-16 rounded-full bg-card border-2 border-card-border flex items-center justify-center mb-4 group-hover:border-primary group-hover:shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-all relative z-10">
                  <span className="text-xl font-bold text-foreground-secondary group-hover:text-primary transition-colors">{stage.step}</span>
                  
                  <div className="absolute inset-0 rounded-full border-2 border-primary opacity-0 group-hover:animate-ping"></div>
                </div>
                <h3 className="font-bold text-lg mb-1">{stage.name}</h3>
                <p className="text-sm text-foreground-secondary">{stage.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}