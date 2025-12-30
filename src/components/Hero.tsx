import { ArrowRight, Play, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Hero = () => {
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
            <span className="text-sm text-muted-foreground">AI-Powered Lead Generation</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6 animate-fade-up opacity-0 animation-delay-100">
            Find Your Ideal Clients in Seconds with{' '}
            <span className="font-display italic gradient-text text-shadow-glow">
              AI Company Search
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-up opacity-0 animation-delay-200">
            Enter the type of companies you're looking for, and let AI build a hyper-targeted list for you. Think ChatGPT, but for building lead lists.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12 animate-fade-up opacity-0 animation-delay-300">
            <Button 
              size="lg" 
              className="gradient-bg hover:opacity-90 transition-all duration-200 text-white font-semibold px-8 py-6 text-base glow-orange group"
            >
              Get 100 Free Leads
              <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="border-border hover:bg-secondary/50 text-foreground font-medium px-8 py-6 text-base group"
            >
              <Play className="mr-2 w-4 h-4" />
              Watch Demo
            </Button>
          </div>

          {/* Social Proof */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-muted-foreground animate-fade-up opacity-0 animation-delay-400">
            <div className="flex items-center gap-2">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <span>Rated Excellent – 4.8/5</span>
            </div>
            <div className="hidden sm:block w-px h-4 bg-border" />
            <span>Trusted by 10,000+ founders</span>
          </div>
        </div>

        {/* Floating UI Preview */}
        <div className="mt-16 max-w-5xl mx-auto animate-fade-up opacity-0 animation-delay-500">
          <div className="relative rounded-2xl border border-border bg-card/50 backdrop-blur-sm p-6 shadow-2xl">
            {/* Search Input Preview */}
            <div className="bg-background rounded-xl border border-border p-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-muted-foreground">SEO agencies in New York with 50+ employees...</span>
              </div>
            </div>

            {/* Example Tags */}
            <div className="flex flex-wrap gap-3 mb-6">
              {[
                '💡 Cold email lead generation agencies',
                '🎯 Fintech companies helping banks',
                '🚀 Law firms specializing in injury cases',
                '🏢 Consulting firms advising C-suite',
              ].map((tag, i) => (
                <div
                  key={i}
                  className="px-4 py-2 rounded-full border border-border bg-secondary/30 text-sm text-foreground hover:border-primary/50 transition-colors cursor-pointer"
                >
                  {tag}
                </div>
              ))}
            </div>

            {/* CTA in Preview */}
            <div className="flex justify-end">
              <Button className="gradient-bg text-white font-medium">
                Get 100 Free Leads
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
