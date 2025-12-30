import { Star, Quote } from 'lucide-react';

const testimonials = [
  {
    name: 'Sarah Chen',
    role: 'CEO',
    company: 'GrowthLab Agency',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=faces',
    content: 'ContentSlave.ai completely transformed how we acquire clients. We went from cold outreach to having qualified leads come to us. The ROI has been incredible.',
    rating: 5,
  },
  {
    name: 'Marcus Johnson',
    role: 'Founder',
    company: 'SaaS Ventures',
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=faces',
    content: 'The AI-powered search is incredibly accurate. I describe my ideal customer in plain English, and it finds exactly the companies I need. Game changer.',
    rating: 5,
  },
  {
    name: 'Emily Rodriguez',
    role: 'VP of Sales',
    company: 'TechScale Inc',
    image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=faces',
    content: 'We reduced our lead research time by 80%. What used to take our team hours now takes minutes. The quality of leads has also improved significantly.',
    rating: 5,
  },
  {
    name: 'David Park',
    role: 'Growth Lead',
    company: 'Fintech Solutions',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces',
    content: 'The verified contact data alone is worth the investment. Our email deliverability went up 40% and response rates doubled.',
    rating: 5,
  },
  {
    name: 'Lisa Thompson',
    role: 'Director',
    company: 'Marketing Pro',
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces',
    content: 'Finally, a lead generation tool that actually understands what I\'m looking for. The natural language search feels like magic.',
    rating: 5,
  },
  {
    name: 'Alex Kim',
    role: 'Co-Founder',
    company: 'StartupX',
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=faces',
    content: 'As a startup, every dollar counts. ContentSlave.ai gave us enterprise-level lead data at a fraction of the cost. Highly recommend.',
    rating: 5,
  },
];

const Testimonials = () => {
  return (
    <section id="testimonials" className="relative py-24 md:py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background to-secondary/10" />
      
      <div className="container mx-auto px-6 relative z-10">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <p className="text-primary font-medium mb-4">Testimonials</p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-6">
            Loved by{' '}
            <span className="font-display italic gradient-text">10,000+</span>
            {' '}founders
          </h2>
          <p className="text-lg text-muted-foreground">
            See what industry leaders are saying about ContentSlave.ai
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="group relative p-6 rounded-2xl border border-border bg-card/30 backdrop-blur-sm hover:border-primary/30 transition-all duration-300"
            >
              {/* Quote Icon */}
              <Quote className="w-8 h-8 text-primary/20 absolute top-6 right-6" />

              {/* Rating */}
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                ))}
              </div>

              {/* Content */}
              <p className="text-foreground/90 leading-relaxed mb-6">
                "{testimonial.content}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-3">
                <img
                  src={testimonial.image}
                  alt={testimonial.name}
                  className="w-12 h-12 rounded-full object-cover border-2 border-border"
                />
                <div>
                  <p className="font-semibold text-foreground">{testimonial.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {testimonial.role}, {testimonial.company}
                  </p>
                </div>
              </div>

              {/* Hover Effect */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
            </div>
          ))}
        </div>

        {/* Trust Badges */}
        <div className="mt-16 flex flex-wrap items-center justify-center gap-8 opacity-60">
          {['Trustpilot', 'G2', 'Capterra', 'ProductHunt'].map((badge, i) => (
            <div key={i} className="text-muted-foreground font-medium text-lg">
              {badge}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
