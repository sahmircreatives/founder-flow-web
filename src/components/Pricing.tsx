import { useState } from 'react';
import { Check, Zap, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const plans = [
  {
    name: 'Starter',
    description: 'Perfect for solo founders getting started',
    monthlyPrice: 49,
    yearlyPrice: 39,
    features: [
      '500 leads per month',
      'AI Company Search',
      'Basic filters',
      'CSV export',
      'Email support',
    ],
    cta: 'Start Free Trial',
    popular: false,
  },
  {
    name: 'Growth',
    description: 'For growing teams and agencies',
    monthlyPrice: 149,
    yearlyPrice: 119,
    features: [
      '2,500 leads per month',
      'Advanced AI Search',
      'Decision maker finder',
      'CRM integrations',
      'Verified emails',
      'Priority support',
    ],
    cta: 'Start Free Trial',
    popular: true,
  },
  {
    name: 'Scale',
    description: 'For high-volume lead generation',
    monthlyPrice: 399,
    yearlyPrice: 319,
    features: [
      '10,000 leads per month',
      'Everything in Growth',
      'API access',
      'Custom enrichment',
      'Dedicated account manager',
      'Custom integrations',
    ],
    cta: 'Start Free Trial',
    popular: false,
  },
];

const Pricing = () => {
  const [isYearly, setIsYearly] = useState(true);

  return (
    <section id="pricing" className="relative py-24 md:py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-secondary/10 via-background to-background" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />

      <div className="container mx-auto px-6 relative z-10">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-12">
          <p className="text-primary font-medium mb-4">Pricing</p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-6">
            Simple,{' '}
            <span className="font-display italic gradient-text">transparent</span>
            {' '}pricing
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Start free, scale as you grow. No hidden fees.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-4 p-1.5 rounded-full border border-border bg-card/50">
            <button
              onClick={() => setIsYearly(false)}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                !isYearly ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsYearly(true)}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                isYearly ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Yearly
              <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto mb-16">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative p-8 rounded-2xl border transition-all duration-300 ${
                plan.popular
                  ? 'border-primary bg-card/80 scale-105 shadow-xl shadow-primary/10'
                  : 'border-border bg-card/30 hover:border-primary/30'
              }`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <div className="gradient-bg text-white text-sm font-medium px-4 py-1 rounded-full flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    Most Popular
                  </div>
                </div>
              )}

              {/* Plan Header */}
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-foreground mb-2">{plan.name}</h3>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              </div>

              {/* Price */}
              <div className="mb-8">
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold text-foreground">
                    ${isYearly ? plan.yearlyPrice : plan.monthlyPrice}
                  </span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                {isYearly && (
                  <p className="text-sm text-primary mt-1">
                    Billed annually (${plan.yearlyPrice * 12}/year)
                  </p>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-foreground/90">
                    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-primary" />
                    </div>
                    {feature}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Button
                className={`w-full ${
                  plan.popular
                    ? 'gradient-bg text-white hover:opacity-90 glow-orange'
                    : 'bg-secondary hover:bg-secondary/80 text-foreground'
                }`}
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>

        {/* Enterprise Section */}
        <div className="max-w-4xl mx-auto">
          <div className="relative p-8 md:p-12 rounded-2xl border border-border bg-card/30 backdrop-blur-sm overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5" />
            
            <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h3 className="text-2xl font-bold text-foreground mb-2">
                  Need a custom solution?
                </h3>
                <p className="text-muted-foreground">
                  Get a done-with-you installed offer tailored to your business needs.
                </p>
              </div>
              <Button 
                variant="outline" 
                size="lg" 
                className="border-primary text-primary hover:bg-primary hover:text-primary-foreground shrink-0 group"
              >
                Contact Sales
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
