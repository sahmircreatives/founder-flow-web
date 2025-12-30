import { Search, Users, Zap, Target, LineChart, Shield } from 'lucide-react';

const features = [
  {
    icon: Search,
    number: '01',
    title: 'AI Company Search',
    subtitle: 'Plain English Search',
    description: 'Just tell the AI which companies you want to target with your outreach – "Funded fintech companies with 100+ employees" or "CPG eCommerce brands hosted on Shopify" and get a list instantly.',
  },
  {
    icon: Users,
    number: '02',
    title: 'Decision Maker Finder',
    subtitle: 'Find the Right People',
    description: 'Automatically identify and extract contact information for key decision-makers at your target companies. Get direct emails and LinkedIn profiles.',
  },
  {
    icon: Zap,
    number: '03',
    title: 'Instant Export',
    subtitle: 'Ready-to-Use Data',
    description: 'Export your leads directly to your favorite CRM or outreach tool. CSV, API, or direct integrations with HubSpot, Salesforce, and more.',
  },
];

const additionalFeatures = [
  {
    icon: Target,
    title: 'Hyper-Targeted Lists',
    description: 'Build lists based on industry, company size, technology stack, funding stage, and more.',
  },
  {
    icon: LineChart,
    title: 'Real-Time Enrichment',
    description: 'Get up-to-date company data enriched with the latest information from multiple sources.',
  },
  {
    icon: Shield,
    title: 'Verified Contacts',
    description: 'Every email is verified in real-time to ensure high deliverability and reduce bounces.',
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
            AI built{' '}
            <span className="font-display italic gradient-text">exclusively</span>
            <br />
            for list building
          </h2>
          <p className="text-lg text-muted-foreground">
            AI Company Search Finds Your Ideal Prospects – all from a Plain English Search. Think ChatGPT, but for building lead lists.
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
