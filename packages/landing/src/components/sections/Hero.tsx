import { AoaLogo } from "../AoaLogo";

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20 pb-32">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background -z-10"></div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center flex flex-col items-center">
        <div className="mb-8">
          <AoaLogo size={64} />
        </div>
        
        <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-8 animate-float">
          <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse-glow"></span>
          Agent Operating Account
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-foreground-secondary">
          The Operating System <br className="hidden md:block" />
          for Agent Finance
        </h1>
        
        <p className="mt-4 text-xl md:text-2xl text-foreground-secondary max-w-3xl mx-auto mb-10">
          Bank-grade financial infrastructure purpose-built for autonomous AI agents. Not a neobank. Not a wallet. The trust layer between enterprise AI and the financial system.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
          <button className="px-8 py-4 rounded-lg bg-primary text-white font-semibold text-lg hover:bg-blue-600 transition-all shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:shadow-[0_0_30px_rgba(59,130,246,0.6)] w-full sm:w-auto">
            Get Early Access
          </button>
          <button className="px-8 py-4 rounded-lg bg-card border border-card-border text-white font-semibold text-lg hover:bg-slate-800 transition-all w-full sm:w-auto">
            Read the Docs
          </button>
        </div>

        <div className="text-sm text-muted-foreground font-medium tracking-wider uppercase mb-12">
          March 2026 | Pre-Seed | SC Ventures x Hashed
        </div>

        <blockquote className="max-w-2xl mx-auto text-lg md:text-xl italic text-foreground-secondary/80 border-l-4 border-primary/50 pl-6 py-2 text-left">
          "We don't build a bank for agents. We build the operating system that lets agents use banks."
        </blockquote>
      </div>
      
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent z-0"></div>
    </section>
  );
}