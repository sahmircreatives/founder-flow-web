import { Star, Quote } from 'lucide-react';

const testimonials = [
  {
    name: 'Marcus Lee',
    role: 'YouTuber',
    company: '850K subscribers',
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=faces',
    content: 'I used to spend 4+ hours on scripts alone. Now I get a solid draft in 2 minutes, and their team handles my thumbnails and editing too. Game changer.',
    rating: 5,
  },
  {
    name: 'Sarah Chen',
    role: 'Content Strategist',
    company: 'Agency Owner',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=faces',
    content: 'We switched all our client work to their AI team. 3x output, happier clients, and our margins actually improved. The ROI is insane.',
    rating: 5,
  },
  {
    name: 'Jake Morrison',
    role: 'Founder',
    company: 'Tech Review Channel',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces',
    content: 'Started with the free script generator—it was so good I booked the call. Now they handle everything and I went from 2 videos/month to 8.',
    rating: 5,
  },
  {
    name: 'Emily Rodriguez',
    role: 'Video Producer',
    company: 'Freelance',
    image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=faces',
    content: 'The thumbnails alone are worth it. My CTR jumped 40% in the first month. Add the scripting and editing? I can finally take on more clients.',
    rating: 5,
  },
  {
    name: 'David Park',
    role: 'Course Creator',
    company: 'EduTech Founder',
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=faces',
    content: 'I create 3-4 videos a week for my course. Their full-stack team cut my production time by 80% and the quality is consistently professional.',
    rating: 5,
  },
  {
    name: 'Lisa Thompson',
    role: 'Marketing Director',
    company: 'SaaS Startup',
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces',
    content: 'We needed YouTube content fast without hiring in-house. This gave us everything—scripts, thumbnails, editing—at a fraction of agency prices.',
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
            Trusted by{' '}
            <span className="font-display italic gradient-text">creators</span>
            {' '}who scale
          </h2>
          <p className="text-lg text-muted-foreground">
            See how YouTubers and content teams are producing more for less
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
      </div>
    </section>
  );
};

export default Testimonials;