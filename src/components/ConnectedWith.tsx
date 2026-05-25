import { useEffect, useRef, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Person {
  id: string;
  name: string;
  follower_count: string;
  verified: boolean;
  photo_url: string | null;
}

const initials = (name: string) =>
  name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

const ConnectedWith = () => {
  const rowRef = useRef<HTMLDivElement>(null);
  const [translateX, setTranslateX] = useState(0);
  const animRef = useRef<number>(0);
  const [people, setPeople] = useState<Person[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    supabase
      .from('connected_with')
      .select('id, name, follower_count, verified, photo_url')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setPeople(data ?? []);
        setLoaded(true);
      });
  }, []);

  useEffect(() => {
    if (!loaded || people.length === 0) return;

    let pos = 0;
    const speed = 0.8;

    const animate = () => {
      if (!rowRef.current) return;
      pos += speed;
      const width = rowRef.current.scrollWidth / 2;
      if (pos >= width) pos = 0;
      setTranslateX(-pos);
      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [loaded, people.length]);

  if (!loaded || people.length === 0) return null;

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

        <div className="relative max-w-4xl mx-auto overflow-hidden mask-fade">
          <div
            ref={rowRef}
            className="flex gap-4 w-max"
            style={{ transform: `translateX(${translateX}px)` }}
          >
            {[...people, ...people].map((p, i) => (
              <div
                key={`${p.id}-${i}`}
                className="flex items-center gap-3 px-5 py-4 rounded-2xl border border-border bg-card/40 backdrop-blur-sm shrink-0 hover:border-primary/40 transition-colors"
                style={{ minWidth: '280px' }}
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-sm font-semibold text-foreground shrink-0 overflow-hidden">
                  {p.photo_url ? (
                    <img
                      src={p.photo_url}
                      alt={p.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    initials(p.name)
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="text-sm font-semibold text-foreground leading-tight truncate">
                      {p.name}
                    </p>
                    {p.verified && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-tight truncate">
                    {p.follower_count}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ConnectedWith;
