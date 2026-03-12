import { AoaLogo } from "../AoaLogo";

export function Footer() {
  return (
    <footer className="bg-background pt-24 pb-12 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-primary/10 via-background to-background -z-10"></div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-3xl mx-auto text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready for the Agentic Economy?</h2>
          <p className="text-xl text-foreground-secondary mb-10">
            Join the waitlist to get early access to the Agent Operating Account API and documentation.
          </p>
          
          <form className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto">
            <input 
              type="email" 
              placeholder="Enter your email" 
              className="flex-1 bg-card border border-card-border rounded-lg px-6 py-4 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              required
            />
            <button 
              type="submit" 
              className="px-8 py-4 rounded-lg bg-primary text-white font-semibold hover:bg-blue-600 transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:shadow-[0_0_25px_rgba(59,130,246,0.5)]"
            >
              Join Waitlist
            </button>
          </form>
          
          <div className="mt-8 text-sm text-foreground-secondary">
            <span className="inline-block w-2 h-2 rounded-full bg-secondary mr-2 animate-pulse"></span>
            Private Beta launching Q3 2026
          </div>
        </div>
        
        <div className="border-t border-card-border pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <AoaLogo size={24} />
            <span className="font-bold text-lg tracking-tight">AOA</span>
          </div>
          
          <div className="text-sm text-foreground-secondary">
            &copy; {new Date().getFullYear()} Agentic Bank. All rights reserved.
          </div>
          
          <div className="flex gap-6 text-sm text-foreground-secondary">
            <a href="#" className="hover:text-primary transition-colors">Twitter</a>
            <a href="#" className="hover:text-primary transition-colors">GitHub</a>
            <a href="#" className="hover:text-primary transition-colors">Docs</a>
          </div>
        </div>
      </div>
    </footer>
  );
}