interface PricingFeature {
  readonly name: string;
  readonly free: string;
  readonly pro: string;
}

const FEATURES: ReadonlyArray<PricingFeature> = [
  { name: "Monthly Transactions", free: "100", pro: "Unlimited" },
  { name: "Transaction Cost", free: "Free", pro: "SGD 0.01 / tx" },
  { name: "Risk Models", free: "Basic", pro: "Premium (SGD 0.05 / decision)" },
  { name: "API Access", free: "Standard", pro: "Full (SGD 0.01 / call)" },
  { name: "Decision Records", free: "30-day retention", pro: "7-year retention" },
  { name: "Settlement Rail", free: "SGD only", pro: "Multi-currency" },
  { name: "Support", free: "Community", pro: "Dedicated" },
  { name: "SLA", free: "Best effort", pro: "99.9% uptime" },
];

export function PricePage() {
  return (
    <section className="price-page">
      <h2 className="price-page-title">Pricing</h2>
      <p className="price-page-subtitle">
        Start free. Scale with token-based billing.
      </p>

      <div className="price-tiers">
        <article className="price-tier price-tier-free">
          <h3 className="price-tier-name">Free</h3>
          <p className="price-tier-price">SGD 0</p>
          <p className="price-tier-period">per month</p>
          <ul className="price-tier-highlights">
            <li>100 transactions / month</li>
            <li>Basic risk models</li>
            <li>Standard API access</li>
          </ul>
        </article>

        <article className="price-tier price-tier-pro">
          <h3 className="price-tier-name">Pro</h3>
          <p className="price-tier-price">Pay-as-you-go</p>
          <p className="price-tier-period">token-based billing</p>
          <ul className="price-tier-highlights">
            <li>Unlimited transactions</li>
            <li>Premium risk models</li>
            <li>Full API access</li>
          </ul>
        </article>
      </div>

      <table className="price-comparison">
        <thead>
          <tr>
            <th className="price-comparison-feature">Feature</th>
            <th className="price-comparison-free">Free</th>
            <th className="price-comparison-pro">Pro</th>
          </tr>
        </thead>
        <tbody>
          {FEATURES.map((feature) => (
            <tr key={feature.name}>
              <td className="price-comparison-feature">{feature.name}</td>
              <td className="price-comparison-free">{feature.free}</td>
              <td className="price-comparison-pro">{feature.pro}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
