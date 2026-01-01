import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const faqs = [
  {
    question: "How does the free script generator work?",
    answer: "Just answer 5 quick questions about your video topic, audience, and preferred style. Our AI generates a complete, retention-optimized script in about 2 minutes—no links to paste, no content to scrape. It's 100% free, forever."
  },
  {
    question: "What's included in the full AI content team service?",
    answer: "Our full-stack team handles everything on the content side: AI-powered scripting, custom thumbnail design, and professional video editing. We manage the entire production pipeline so you can focus on filming and growing your channel."
  },
  {
    question: "How much does the full AI content team cost?",
    answer: "Pricing is custom based on your content volume and needs. Most creators see 60-70% cost savings compared to hiring freelancers or agencies. Book a free call and we'll put together a quote tailored to your situation."
  },
  {
    question: "What are the turnaround times?",
    answer: "Scripts are delivered same-day. Thumbnails typically take 24-48 hours. Edited videos depend on length and complexity, but most are delivered within 3-5 business days. We offer priority turnaround for time-sensitive content."
  },
  {
    question: "How do you maintain quality with AI?",
    answer: "Every asset goes through human oversight before delivery. Our AI agents handle the heavy lifting, but our team reviews and refines everything to ensure it meets professional standards and matches your brand voice."
  },
  {
    question: "Can you match my existing brand and style?",
    answer: "Absolutely. During onboarding, we analyze your existing content to understand your voice, visual style, and what works for your audience. We create brand presets that ensure consistency across all deliverables."
  },
  {
    question: "What if I'm not happy with a deliverable?",
    answer: "We offer unlimited revisions on all deliverables. If something doesn't hit the mark, just let us know and we'll refine it until you're satisfied. Your success is our success."
  },
  {
    question: "How do I get started?",
    answer: "Start by trying our free script generator to see the quality firsthand. If you like what you see, book a free strategy call and we'll discuss how our full team can help you scale your content production."
  },
];

const FAQ = () => {
  return (
    <section id="faq" className="py-20 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-secondary/10 to-background" />
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-3xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-12">
            <p className="text-primary font-medium mb-4">FAQ</p>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-6">
              Common{' '}
              <span className="font-display italic gradient-text">questions</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              Everything you need to know about our AI content team
            </p>
          </div>

          {/* FAQ Accordion */}
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="border border-border rounded-xl px-6 bg-card/30 backdrop-blur-sm data-[state=open]:border-primary/50 transition-colors"
              >
                <AccordionTrigger className="text-left text-foreground hover:text-primary py-5 text-base font-medium">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-5 leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};

export default FAQ;