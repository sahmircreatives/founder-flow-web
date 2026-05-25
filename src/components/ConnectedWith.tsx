import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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

const ConnectedWith = () => {
  const [index, setIndex] = useState(0);
  const visibleCount = 3;
  const maxIndex = Math.max(0, people.length - visibleCount);

  const prev = () => setIndex((i) => Math.max(0, i - 1));
  const next = () => setIndex((i) => Math.min(maxIndex, i + 1));

  const visible = people.slice(index, index + visibleCount);

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

        <div className="relative max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {visible.map((p, i) => (
              <div
                key={`${index}-${i}`}
                className="flex items-center gap-3 px-5 py-4 rounded-2xl border border-border bg-card/40 backdrop-blur-sm hover:border-primary/40 transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-sm font-semibold text-foreground shrink-0">
                  {p.initials}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground leading-tight truncate">
                    {p.name}
                  </p>
                  <p className="text-xs text-muted-foreground leading-tight truncate">
                    {p.role}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center gap-3 mt-8">
            <button
              onClick={prev}
              disabled={index === 0}
              className="w-10 h-10 rounded-full border border-border bg-card/60 flex items-center justify-center text-foreground hover:bg-card disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex gap-1.5">
              {Array.from({ length: maxIndex + 1 }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIndex(i)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i === index ? 'bg-primary' : 'bg-border hover:bg-primary/40'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={next}
              disabled={index === maxIndex}
              className="w-10 h-10 rounded-full border border-border bg-card/60 flex items-center justify-center text-foreground hover:bg-card disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ConnectedWith;
