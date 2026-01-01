const BookingSection = () => {
  return (
    <section id="book-call" className="py-20 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-background to-background" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-5xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 mb-6">
            <span className="px-3 py-1 rounded-full bg-primary text-primary-foreground text-sm font-medium">
              Free Strategy Call
            </span>
          </div>

          {/* Heading */}
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Ready to <span className="italic font-normal gradient-text">scale your content?</span>
          </h2>
          
          {/* Subheading */}
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-12">
            Book a free call to see how our full-stack AI agent team can help you produce 
            3x more content—thumbnails, editing, scripting, the whole thing—for 1/3 the cost.
          </p>

          {/* Cal.com Embed */}
          <div className="rounded-2xl overflow-hidden border border-border bg-card/50 backdrop-blur-sm">
            <iframe
              src="https://cal.com/sahmircreatives/secret?embed=true&theme=dark"
              className="w-full h-[700px] border-0"
              title="Book a call with Sahmir Creatives"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default BookingSection;