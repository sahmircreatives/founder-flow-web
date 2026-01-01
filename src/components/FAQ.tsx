import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const faqs = [
  {
    question: "What is ContentSlave?",
    answer: "ContentSlave turns your offer + customer psychology into packaged, scripted, and packaged to drive qualified inbound leads, so you're not guessing topics, rambling on camera, or relying on \"viral luck.\""
  },
  {
    question: "Who is ContentSlave for and who is it NOT for?",
    answer: "It's for coaches, consultants, course creators, agencies who want YouTube to nurture, attract leads, and build authority (charge higher prices). Not for people chasing virality, beginners with no clear offer, or anyone who won't publish consistently."
  },
  {
    question: "What's the difference between the free script generator and the full done-for-you system?",
    answer: "Free generator: spits out scripts when you feed it info. Full system: we install the whole shabang using AI. All you have to do is install the system and create."
  },
  {
    question: "How does this help me get clients?",
    answer: "If you have an ad, it helps nurture clients with long form content, but the power of this system is that it also GENERATES inbounds, not on the first day, but evergreen. Months, years, decades."
  },
  {
    question: "What do I need to provide for it to generate scripts that actually sound like me?",
    answer: "Two things: Business context (fill out the questionnaire) and Voice examples (tweets, writing samples, transcripts). To preface: the script generator is just a free tool, meaning it's not the best of what we have. That's gatekept to our members in ContentSlave."
  },
  {
    question: "What exactly do I get with the full system (deliverables + support)?",
    answer: "Script that frames the cost of inaction, creates authority, while driving viewers into leads. Packaging framed so you don't look like a 1-1 copycat, but the illusion of exclusivity. Content that's not just bearable to watch, but keeps prospects engaged. Strategy so you actually have the route to target your audience. Weekly coaching calls to help with the strategy and how you speak on camera."
  },
  {
    question: "How long does it take to see results, and what does \"results\" mean here?",
    answer: "No results are guaranteed, because to be honest, I DON'T know you. You might be the most insufferable guy on the planet, or you might make your investment back 100 fold."
  },
  {
    question: "Do I need to be on camera / be a good speaker for this to work?",
    answer: "Most people struggle with this. You can use a teleprompter. The key is clarity + value. That's why we also offer coaching calls to help improve your delivery."
  },
  {
    question: "How much does it cost, what's included, and what's the next step to start?",
    answer: "The free tool is free. The full system price depends on scope. Use the generator, which is 1/10 of the value of what's inside ContentSlave, then book a call if you want the full engine installed and turned into a predictable lead channel."
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