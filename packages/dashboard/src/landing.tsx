export interface LandingPageProps {
  pilotApplyUrl?: string;
}

export function LandingPage({ pilotApplyUrl = '/api/pilot-apply' }: LandingPageProps) {
  return (
    <div className="landing-page">
      <section className="hero">
        <h1 className="hero-title">Your agents need a bank account</h1>
        <p className="hero-subtitle">Bank-grade financial infrastructure for autonomous AI agents</p>
        <a href={pilotApplyUrl} className="cta-button">Start your pilot</a>
      </section>
      <section className="trust-signals">
        <span>MAS Regulatory Sandbox</span>
        <span>SC Ventures Backed</span>
        <span>Bank-Grade Security</span>
      </section>
      <section className="features">
        <h2>7-Layer Agentic Banking Stack</h2>
        <ul>
          <li>KYA Identity (SPIFFE/SVID)</li>
          <li>Capability Token Delegation</li>
          <li>Deny-by-Default Policy Engine</li>
          <li>Pre-Trade Risk Rules (15 rules)</li>
          <li>SGD Settlement Rail</li>
          <li>AML/Travel Rule Compliance</li>
          <li>Immutable Decision Records</li>
        </ul>
      </section>
      <section className="pricing">
        <h2>Pricing</h2>
        <div className="pricing-table">
          <div className="tier free">
            <h3>Free</h3>
            <p>100 transactions/month</p>
            <p>Basic AOA account</p>
          </div>
          <div className="tier pro">
            <h3>Pro</h3>
            <p>Unlimited transactions</p>
            <p>Premium risk models</p>
          </div>
        </div>
      </section>
      <section className="cta">
        <a href={pilotApplyUrl} className="cta-button">Start your pilot</a>
      </section>
    </div>
  );
}
