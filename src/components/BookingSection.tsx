const BookingSection = () => {
  return (
    <section id="book-call" className="py-20 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-background to-background" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to scale your content?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Book a free strategy call and discover how AI agents can 3x your content output.
          </p>
          <a
            href="https://cal.com/sahmircreatives/secret"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-white rounded-md gradient-bg hover:opacity-90 transition-all duration-200 glow-orange"
          >
            Book Your Free Call
          </a>
        </div>
      </div>
    </section>
  );
};

export default BookingSection;
