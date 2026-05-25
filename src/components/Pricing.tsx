import { Check, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
const monthlyFeatures = ['Unlimited scripts', 'All video lengths supported', 'Multiple tones & styles', 'Hook variations', 'Retention timestamps', 'Copy & download instantly', 'Cancel anytime'];
const annualFeatures = ['Everything in Monthly', 'Save 2 months (vs monthly)', 'Priority script generation', 'Early access to new features', 'Priority support'];
const Pricing = () => {
  const navigate = useNavigate();
  return <section id="pricing" className="relative py-24 md:py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-secondary/10 via-background to-background" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />

      <div className="container mx-auto px-6 relative z-10">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <p className="text-primary font-medium mb-4">Pricing</p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-6">
            Simple pricing,{' '}
            <span className="font-display italic gradient-text">scale when ready</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            One simple plan. Pay monthly or save with annual billing.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Monthly Card */}
          <div className="relative p-8 rounded-2xl border border-border bg-card/30 hover:border-primary/30 transition-all duration-300">
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-foreground mb-2">Monthly</h3>
              <p className="text-muted-foreground">Flexible month-to-month billing</p>
            </div>

            <div className="mb-8">
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold text-foreground">$49</span>
                <span className="text-muted-foreground">/month</span>
              </div>
            </div>

            <ul className="space-y-4 mb-8">
              {monthlyFeatures.map((feature, i) => <li key={i} className="flex items-center gap-3 text-foreground/90">
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-primary" />
                  </div>
                  {feature}
                </li>)}
            </ul>

            <Button className="w-full bg-secondary hover:bg-secondary/80 text-foreground" onClick={() => navigate('/create')}>
              Get Started Monthly
            </Button>
          </div>

          {/* Annual Card */}
          <div className="relative p-8 rounded-2xl border border-primary bg-card/80 scale-105 shadow-xl shadow-primary/10">
            {/* Popular Badge */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <div className="gradient-bg text-white text-sm font-medium px-4 py-1 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Best Value
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-2xl font-bold text-foreground mb-2">Annual</h3>
              <p className="text-muted-foreground">Save 2 months with yearly billing</p>
            </div>

            <div className="mb-8">
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold text-foreground">$490</span>
                <span className="text-muted-foreground">/year</span>
              </div>
              <p className="text-sm text-primary mt-2">Just $40.83/month, billed annually</p>
            </div>

            <ul className="space-y-4 mb-8">
              {annualFeatures.map((feature, i) => <li key={i} className="flex items-center gap-3 text-foreground/90">
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-primary" />
                  </div>
                  {feature}
                </li>)}
            </ul>

            <Button className="w-full gradient-bg text-white hover:opacity-90 glow-orange group" onClick={() => navigate('/create')}>
              Get Started Annual
              <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>
      </div>
    </section>;
};
export default Pricing;