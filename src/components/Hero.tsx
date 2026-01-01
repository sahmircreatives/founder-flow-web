import { ArrowRight, Sparkles, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const Hero = () => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-background" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      
      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-secondary/50 backdrop-blur-sm mb-8 animate-fade-up opacity-0">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">Free YouTube Script Generator</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6 animate-fade-up opacity-0 animation-delay-100">
            Produce 3x more content{' '}
            <span className="gradient-text">for 1/3 the cost</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-up opacity-0 animation-delay-200">
            Get a free YouTube script in 2 minutes. Then discover how our full-stack AI agent team 
            handles your thumbnails, editing, and scripting—so you can focus on creating.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8 animate-fade-up opacity-0 animation-delay-300">
            <Button 
              size="lg" 
              className="gradient-bg hover:opacity-90 transition-all duration-200 text-white font-semibold px-8 py-6 text-base glow-orange group"
              onClick={() => navigate('/create')}
            >
              <Play className="mr-2 w-4 h-4" />
              Get Your Free Script
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="border-border text-foreground hover:bg-secondary px-8 py-6 text-base group"
              onClick={() => {
                document.getElementById('book-call')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Book a Call
              <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>

          {/* Microcopy */}
          <p className="text-sm text-muted-foreground animate-fade-up opacity-0 animation-delay-400">
            100% free. No credit card. Script ready in 2 minutes.
          </p>

          {/* Social Proof */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-muted-foreground animate-fade-up opacity-0 animation-delay-500 mt-12">
            <div className="flex items-center gap-2">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <span>Trusted by 500+ creators</span>
            </div>
            <div className="hidden sm:block w-px h-4 bg-border" />
            <span>10,000+ scripts generated</span>
          </div>
        </div>

        {/* Preview Card */}
        <div className="mt-16 max-w-5xl mx-auto animate-fade-up opacity-0 animation-delay-600">
          <div className="relative rounded-2xl border border-border bg-card/50 backdrop-blur-sm p-6 shadow-2xl">
            {/* Script Preview */}
            <div className="bg-background rounded-xl border border-border p-4 mb-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-sm text-muted-foreground font-mono">generating script...</span>
              </div>
              <div className="space-y-2 text-sm text-foreground/80">
                <p className="font-semibold text-primary">[HOOK - 0:00]</p>
                <p>"Most creators are making this one mistake that's killing their retention..."</p>
              </div>
            </div>

            {/* Example Tags */}
            <div className="flex flex-wrap gap-3 mb-6">
              {[
                '🎯 Hook-optimized intros',
                '📈 Retention-focused structure',
                '🎬 Ready-to-record format',
                '⚡ 2-minute generation',
              ].map((tag, i) => (
                <div
                  key={i}
                  className="px-4 py-2 rounded-full border border-border bg-secondary/30 text-sm text-foreground"
                >
                  {tag}
                </div>
              ))}
            </div>

            {/* CTA in Preview */}
            <div className="flex justify-end">
              <Button className="gradient-bg text-white font-medium" onClick={() => navigate('/create')}>
                Get Your Free Script
              </Button>
            </div>

            {/* Glow Effect */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-primary/10 rounded-2xl blur-xl -z-10" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;