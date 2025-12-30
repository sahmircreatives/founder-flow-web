import { FileText, Zap, Target, TrendingUp, Clock, Sparkles } from 'lucide-react';

const features = [
  {
    icon: FileText,
    number: '01',
    title: 'Answer 5 Quick Questions',
    subtitle: 'No research required',
    description: 'Tell us your niche, audience, topic, and preferred style. We handle the rest—no links to paste, no content to scrape.',
  },
  {
    icon: Zap,
    number: '02',
    title: 'AI Generates Your Script',
    subtitle: 'Expert-level writing',
    description: 'Our AI crafts a complete script with proven hook formulas, retention patterns, and natural transitions that keep viewers watching.',
  },
  {
    icon: Target,
    number: '03',
    title: 'Ready to Record',
    subtitle: 'Formatted & actionable',
    description: 'Get a fully formatted script with timestamps, visual cues, and CTA placement—ready to film or send to your editor.',
  },
];

const additionalFeatures = [
  {
    icon: TrendingUp,
    title: 'Retention-Optimized',
    description: 'Every script uses proven patterns that keep viewers engaged from hook to CTA.',
  },
  {
    icon: Clock,
    title: 'Any Video Length',
    description: 'Short-form (60s), mid-length (2-4m), or long-form (6-10m)—we adapt the structure.',
  },
  {
    icon: Sparkles,
    title: 'Multiple Tones',
    description: 'Educational, story-based, high-energy, or calm expert—match your brand voice.',
  },
];

const Features = () => {
  return (
    <section id="features" className="relative py-24 md:py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-secondary/20 to-background" />
      
      <div className="container mx-auto px-6 relative z-10">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-20">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-6">
            Scripts built{' '}
            <span className="font-display italic gradient-text">exclusively</span>
            <br />
            for YouTube retention
          </h2>
          <p className="text-lg text-muted-foreground">
            Stop staring at blank docs. Answer a few questions, get a complete script 
            with hooks, structure, and CTAs built in.
          </p>
        </div>

        {/* Main Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group relative p-8 rounded-2xl border border-border bg-card/50 backdrop-blur-sm hover:border-primary/50 transition-all duration-300"
            >
              {/* Number */}
              <span className="text-6xl font-bold text-muted/30 font-display absolute top-6 right-6">
                {feature.number}
              </span>

              {/* Icon */}
              <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <feature.icon className="w-6 h-6 text-white" />
              </div>

              {/* Content */}
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-primary font-medium mb-4">
                {feature.subtitle}
              </p>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>

              {/* Hover Glow */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
            </div>
          ))}
        </div>

        {/* Additional Features Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {additionalFeatures.map((feature, index) => (
            <div
              key={index}
              className="flex items-start gap-4 p-6 rounded-xl border border-border bg-card/30 hover:bg-card/50 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                <feature.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-1">{feature.title}</h4>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
