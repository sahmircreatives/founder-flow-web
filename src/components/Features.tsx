import { FileText, Zap, Target, Image, Film, PenTool, Users, Clock, DollarSign, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const scriptFeatures = [
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

const teamServices = [
  {
    icon: PenTool,
    title: 'AI Scripting',
    description: 'Retention-optimized scripts crafted for your voice and audience.',
  },
  {
    icon: Image,
    title: 'Thumbnail Design',
    description: 'Click-worthy thumbnails that boost your CTR and views.',
  },
  {
    icon: Film,
    title: 'Video Editing',
    description: 'Professional editing with cuts, graphics, and pacing that keeps viewers hooked.',
  },
];

const benefits = [
  {
    icon: Clock,
    title: '3x Faster Production',
    description: 'Go from idea to published video in a fraction of the time.',
  },
  {
    icon: DollarSign,
    title: '1/3 the Cost',
    description: 'Save on full-time hires while getting agency-quality output.',
  },
  {
    icon: Users,
    title: 'Full-Stack Team',
    description: 'AI agents + human oversight for every step of content creation.',
  },
];

// Orbital Worker component
const OrbitalWorker = ({ 
  icon: Icon,
  orbitRadius,
  duration,
  delay,
  reverse = false,
  size = 'md'
}: { 
  icon: React.ElementType;
  orbitRadius: number;
  duration: number;
  delay: number;
  reverse?: boolean;
  size?: 'sm' | 'md' | 'lg';
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-14 h-14'
  };
  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-7 h-7'
  };

  return (
    <div 
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
      style={{
        ['--orbit-radius' as string]: `${orbitRadius}px`,
        animation: `${reverse ? 'orbit-reverse' : 'orbit'} ${duration}s linear infinite`,
        animationDelay: `${delay}s`,
      }}
    >
      <div className={`relative ${sizeClasses[size]} rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/40 flex items-center justify-center backdrop-blur-sm shadow-lg`}
        style={{
          animation: `orbit-pulse 3s ease-in-out infinite`,
          animationDelay: `${delay}s`,
        }}
      >
        <Icon className={`${iconSizes[size]} text-primary`} />
        {/* Glow effect */}
        <div className="absolute inset-0 rounded-xl bg-primary/20 blur-md -z-10" />
      </div>
    </div>
  );
};

// Orbit ring visualization
const OrbitRing = ({ radius, opacity = 0.2 }: { radius: number; opacity?: number }) => (
  <div 
    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary pointer-events-none"
    style={{
      width: radius * 2,
      height: radius * 2,
      opacity,
    }}
  />
);

// Floating particles
const FloatingParticle = ({ delay, x, y }: { delay: number; x: string; y: string }) => (
  <div 
    className="absolute w-1.5 h-1.5 rounded-full bg-primary/50"
    style={{
      left: x,
      top: y,
      animation: `particle-float 4s ease-in-out infinite`,
      animationDelay: `${delay}s`,
    }}
  />
);

// Central hub component
const CentralHub = () => (
  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
    <div className="w-3 h-3 rounded-full bg-background" />
    <div 
      className="absolute inset-0 rounded-full border-2 border-primary/50"
      style={{ animation: 'pulse-ring 2s ease-out infinite' }}
    />
    <div 
      className="absolute inset-0 rounded-full border border-primary/30"
      style={{ animation: 'pulse-ring 2s ease-out infinite 0.5s' }}
    />
  </div>
);

const Features = () => {
  const navigate = useNavigate();

  return (
    <section id="features" className="relative py-24 md:py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-secondary/20 to-background" />
      
      <div className="container mx-auto px-6 relative z-10">
        {/* Free Script Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-20">
          <p className="text-primary font-medium mb-4">Step 1: Get Your Free Script</p>
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

        {/* Script Generation Steps */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {scriptFeatures.map((feature, index) => (
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

        {/* CTA for Free Script */}
        <div className="text-center mb-32">
          <Button 
            size="lg" 
            className="gradient-bg text-white hover:opacity-90 glow-orange"
            onClick={() => navigate('/create')}
          >
            Get Your Free Script Now
          </Button>
        </div>

        {/* Divider */}
        <div className="relative mb-20">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-background px-6 text-muted-foreground">Want more?</span>
          </div>
        </div>

        {/* Full Team Section Header with Orbital Workers */}
        <div className="relative max-w-3xl mx-auto text-center mb-16 py-8">
          {/* Orbital Animation Container */}
          <div className="absolute inset-0 hidden md:flex items-center justify-center pointer-events-none" style={{ height: '280px', top: '50%', transform: 'translateY(-50%)' }}>
            {/* Orbit rings */}
            <OrbitRing radius={90} opacity={0.15} />
            <OrbitRing radius={140} opacity={0.1} />
            <OrbitRing radius={190} opacity={0.08} />
            
            {/* Central hub */}
            <CentralHub />
            
            {/* Orbiting workers - inner ring */}
            <OrbitalWorker icon={PenTool} orbitRadius={90} duration={12} delay={0} size="md" />
            <OrbitalWorker icon={Bot} orbitRadius={90} duration={12} delay={3} size="md" />
            <OrbitalWorker icon={Image} orbitRadius={90} duration={12} delay={6} size="md" />
            <OrbitalWorker icon={Zap} orbitRadius={90} duration={12} delay={9} size="md" />
            
            {/* Orbiting workers - middle ring (reverse) */}
            <OrbitalWorker icon={Film} orbitRadius={140} duration={18} delay={0} reverse size="lg" />
            <OrbitalWorker icon={Target} orbitRadius={140} duration={18} delay={6} reverse size="lg" />
            <OrbitalWorker icon={FileText} orbitRadius={140} duration={18} delay={12} reverse size="lg" />
            
            {/* Orbiting workers - outer ring */}
            <OrbitalWorker icon={Users} orbitRadius={190} duration={25} delay={0} size="sm" />
            <OrbitalWorker icon={Clock} orbitRadius={190} duration={25} delay={8.33} size="sm" />
            <OrbitalWorker icon={DollarSign} orbitRadius={190} duration={25} delay={16.66} size="sm" />
            
            {/* Floating particles */}
            <FloatingParticle delay={0} x="10%" y="30%" />
            <FloatingParticle delay={0.4} x="90%" y="25%" />
            <FloatingParticle delay={0.8} x="5%" y="70%" />
            <FloatingParticle delay={1.2} x="95%" y="65%" />
            <FloatingParticle delay={1.6} x="50%" y="5%" />
            <FloatingParticle delay={2} x="50%" y="95%" />
          </div>

          <p className="text-primary font-medium mb-4">Step 2: Scale Your Content</p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-6">
            Your full-stack{' '}
            <span className="font-display italic gradient-text">AI content team</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Love the script? Book a call to unlock our complete AI agent team. 
            We handle thumbnails, editing, and scripting—so you can produce 3x more content for 1/3 the cost.
          </p>
        </div>

        {/* Team Services Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {teamServices.map((service, index) => (
            <div
              key={index}
              className="group relative p-8 rounded-2xl border border-border bg-card/50 backdrop-blur-sm hover:border-primary/50 transition-all duration-300 text-center"
            >
              <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <service.icon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">{service.title}</h3>
              <p className="text-muted-foreground">{service.description}</p>
            </div>
          ))}
        </div>

        {/* Benefits Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {benefits.map((benefit, index) => (
            <div
              key={index}
              className="flex items-start gap-4 p-6 rounded-xl border border-border bg-card/30 hover:bg-card/50 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                <benefit.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-1">{benefit.title}</h4>
                <p className="text-sm text-muted-foreground">{benefit.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA for Team */}
        <div className="text-center">
          <Button 
            size="lg" 
            variant="outline"
            className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
            onClick={() => {
              document.getElementById('book-call')?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            Book a Free Call
          </Button>
        </div>
      </div>
    </section>
  );
};

export default Features;