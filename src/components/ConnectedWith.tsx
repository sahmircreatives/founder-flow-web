const people = [
  { name: 'Marcus Lee', role: 'YouTuber · 850K subs', initials: 'ML' },
  { name: 'Sarah Chen', role: 'Agency Owner', initials: 'SC' },
  { name: 'Jake Morrison', role: 'Tech Channel · 1.2M', initials: 'JM' },
  { name: 'Emily Rodriguez', role: 'Video Producer', initials: 'ER' },
  { name: 'David Park', role: 'Course Creator · 420K', initials: 'DP' },
  { name: 'Lisa Thompson', role: 'SaaS Marketing Lead', initials: 'LT' },
  { name: 'Andre Walker', role: 'Finance YT · 680K', initials: 'AW' },
  { name: 'Priya Shah', role: 'Lifestyle · 2.1M', initials: 'PS' },
  { name: 'Noah Bennett', role: 'Gaming · 950K', initials: 'NB' },
  { name: 'Maya Johnson', role: 'Education · 530K', initials: 'MJ' },
];

const Row = ({ reverse = false }: { reverse?: boolean }) => (
  <div className="relative overflow-hidden mask-fade">
    <div
      className={`flex gap-4 w-max ${reverse ? 'animate-marquee-reverse' : 'animate-marquee'}`}
    >
      {[...people, ...people].map((p, i) => (
        <div
          key={i}
          className="flex items-center gap-3 px-5 py-3 rounded-full border border-border bg-card/40 backdrop-blur-sm shrink-0 hover:border-primary/40 transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-sm font-semibold text-foreground">
            {p.initials}
          </div>
          <div className="pr-2">
            <p className="text-sm font-semibold text-foreground leading-tight">{p.name}</p>
            <p className="text-xs text-muted-foreground leading-tight">{p.role}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const ConnectedWith = () => {
  return (
    <section id="connected" className="relative py-24 md:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background to-secondary/10" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-3xl mx-auto text-center mb-14">
          <p className="text-primary font-medium mb-4">Proof</p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-6">
            People we've{' '}
            <span className="font-display italic gradient-text">connected with</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            A glimpse at creators, founders and teams in our network
          </p>
        </div>

        <div className="space-y-4">
          <Row />
          <Row reverse />
        </div>
      </div>
    </section>
  );
};

export default ConnectedWith;