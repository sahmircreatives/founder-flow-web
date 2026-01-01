import { Check, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const freeFeatures = [
  'Unlimited free scripts',
  'All video lengths supported',
  'Multiple tones & styles',
  'Hook variations',
  'Retention timestamps',
  'Copy & download instantly',
];

const teamFeatures = [
  'Everything in Free Script Generator',
  'Custom thumbnail design',
  'Professional video editing',
  'Full content strategy',
  'Dedicated AI agent team',
  'Human oversight on every asset',
  'Unlimited revisions',
  'Priority turnaround',
];

const Pricing = () => {
  const navigate = useNavigate();

  return (
    <section id="pricing" className="relative py-24 md:py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-secondary/10 via-background to-background" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />

      <div className="container mx-auto px-6 relative z-10">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <p className="text-primary font-medium mb-4">How It Works</p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-6">
            Start free,{' '}
            <span className="font-display italic gradient-text">scale when ready</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Get your first script free. Love it? Book a call to unlock our full AI content team.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Free Script Card */}
          <div className="relative p-8 rounded-2xl border border-border bg-card/30 hover:border-primary/30 transition-all duration-300">
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-foreground mb-2">Free Script Generator</h3>
              <p className="text-muted-foreground">Perfect for trying us out</p>
            </div>

            <div className="mb-8">
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold text-foreground">$0</span>
                <span className="text-muted-foreground">forever</span>
              </div>
            </div>

            <ul className="space-y-4 mb-8">
              {freeFeatures.map((feature, i) => (
                <li key={i} className="flex items-center gap-3 text-foreground/90">
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-primary" />
                  </div>
                  {feature}
                </li>
              ))}
            </ul>

            <Button
              className="w-full bg-secondary hover:bg-secondary/80 text-foreground"
              onClick={() => navigate('/create')}
            >
              Get Your Free Script
            </Button>
          </div>

          {/* Full Team Card */}
          <div className="relative p-8 rounded-2xl border border-primary bg-card/80 scale-105 shadow-xl shadow-primary/10">
            {/* Popular Badge */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <div className="gradient-bg text-white text-sm font-medium px-4 py-1 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Best Value
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-2xl font-bold text-foreground mb-2">Full AI Content Team</h3>
              <p className="text-muted-foreground">Scripts + Thumbnails + Editing</p>
            </div>

            <div className="mb-8">
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold text-foreground">Custom</span>
              </div>
              <p className="text-sm text-primary mt-2">Based on your content volume</p>
            </div>

            <ul className="space-y-4 mb-8">
              {teamFeatures.map((feature, i) => (
                <li key={i} className="flex items-center gap-3 text-foreground/90">
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-primary" />
                  </div>
                  {feature}
                </li>
              ))}
            </ul>

            <Button
              className="w-full gradient-bg text-white hover:opacity-90 glow-orange group"
              onClick={() => {
                document.getElementById('book-call')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Book a Free Call
              <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>

        {/* Value Prop */}
        <div className="max-w-3xl mx-auto mt-16 text-center">
          <div className="inline-flex items-center gap-4 p-6 rounded-2xl border border-border bg-card/30">
            <div className="text-left">
              <p className="text-xl font-semibold text-foreground mb-1">
                3x the content. 1/3 the cost.
              </p>
              <p className="text-muted-foreground">
                Stop hiring freelancers and agencies. Let AI agents handle production while you focus on creating.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Pricing;