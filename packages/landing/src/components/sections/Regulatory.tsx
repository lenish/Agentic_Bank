export function Regulatory() {
  return (
    <section className="py-24 bg-card relative border-y border-card-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">MAS-Ready from Day One</h2>
          <p className="text-foreground-secondary text-lg max-w-2xl mx-auto">
            Built to meet the stringent requirements of the Monetary Authority of Singapore, ensuring institutional-grade compliance for autonomous agents.
          </p>
        </div>

        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="bg-background border border-card-border rounded-2xl p-8 flex flex-col gap-4 hover:border-primary/30 transition-colors">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">AML/CFT Compliant</h3>
              <p className="text-foreground-secondary">
                Real-time transaction monitoring and automated reporting designed specifically for non-human entities.
              </p>
            </div>
          </div>

          <div className="bg-background border border-card-border rounded-2xl p-8 flex flex-col gap-4 hover:border-primary/30 transition-colors">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">Enterprise Security</h3>
              <p className="text-foreground-secondary">
                Bank-grade encryption, secure enclaves for key management, and continuous vulnerability scanning.
              </p>
            </div>
          </div>

          <div className="bg-background border border-card-border rounded-2xl p-8 flex flex-col gap-4 hover:border-primary/30 transition-colors">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">KYA Identity Framework</h3>
              <p className="text-foreground-secondary">
                Machine-native identity using SPIFFE/SVID with workload attestation.
              </p>
            </div>
          </div>

          <div className="bg-background border border-card-border rounded-2xl p-8 flex flex-col gap-4 hover:border-primary/30 transition-colors">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">Travel Rule (IVMS101)</h3>
              <p className="text-foreground-secondary">
                FATF-compliant Travel Rule implementation for cross-border transfers.
              </p>
            </div>
          </div>

          <div className="bg-background border border-card-border rounded-2xl p-8 flex flex-col gap-4 hover:border-primary/30 transition-colors">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">Immutable Audit Trail</h3>
              <p className="text-foreground-secondary">
                Append-only decision records with cryptographic hash chaining. 7+ year retention.
              </p>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}