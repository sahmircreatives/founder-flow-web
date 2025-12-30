import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Copy, Download, ArrowLeft, Check, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import { useToast } from '@/hooks/use-toast';

type FormData = {
  niche: string;
  audience: string;
  topic: string;
  goal: string;
  tone: string[];
  length: string;
  cta: string;
  extraNotes: string;
};

const ScriptResult = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [script, setScript] = useState('');

  const formData = location.state?.formData as FormData | undefined;

  useEffect(() => {
    if (!formData) {
      navigate('/create');
      return;
    }
    
    // Simulate script generation
    const generateScript = () => {
      const toneLabels: Record<string, string> = {
        educational: 'Educational',
        direct: 'Direct',
        story: 'Story-based',
        energy: 'High-energy',
        calm: 'Calm expert',
        viral: 'Viral / Hook-heavy'
      };

      const goalLabels: Record<string, string> = {
        leads: 'generate leads',
        authority: 'build authority',
        education: 'educate your audience',
        sales: 'drive sales',
        growth: 'grow your audience'
      };

      const lengthTiming: Record<string, { intro: string; body: string; outro: string }> = {
        short: { intro: '0:00 - 0:15', body: '0:15 - 1:00', outro: '1:00 - 1:30' },
        medium: { intro: '0:00 - 0:30', body: '0:30 - 3:00', outro: '3:00 - 4:00' },
        long: { intro: '0:00 - 1:00', body: '1:00 - 8:00', outro: '8:00 - 10:00' }
      };

      const timing = lengthTiming[formData.length] || lengthTiming.medium;
      const tones = formData.tone.map(t => toneLabels[t] || t).join(', ');
      const goalText = goalLabels[formData.goal] || formData.goal;

      const ctaText = {
        call: "If you want help implementing this, I've opened up a few spots for a free strategy call. Link's in the description — book before they fill up.",
        magnet: "I put together a free guide that breaks this down even further. Download link is in the description below.",
        subscribe: "If you found this valuable, hit subscribe — I drop videos like this every week.",
        none: ""
      }[formData.cta] || "";

      const generatedScript = `
═══════════════════════════════════════════════════════════════
                    📹 YOUTUBE SCRIPT
═══════════════════════════════════════════════════════════════

📌 TOPIC: ${formData.topic}
🎯 NICHE: ${formData.niche}
👤 AUDIENCE: ${formData.audience}
🎭 TONE: ${tones}
⏱️ LENGTH: ${formData.length === 'short' ? '60-90 seconds' : formData.length === 'medium' ? '2-4 minutes' : '6-10 minutes'}
🎯 GOAL: ${goalText}

═══════════════════════════════════════════════════════════════


▶️ HOOK [${timing.intro}]
═══════════════════════════════════════════════════════════════

[OPEN ON: Direct eye contact with camera]

"If you're a ${formData.audience.toLowerCase()} struggling with ${formData.topic.toLowerCase()}, you're probably making one critical mistake that's holding you back."

[PAUSE - Let it land]

"And the worst part? Most people in ${formData.niche} don't even realize they're doing it."

[VISUAL CUE: Quick cut / zoom]

"In the next few minutes, I'm going to show you exactly what it is — and how to fix it starting today."


▶️ INTRO / CONTEXT [${timing.intro}]
═══════════════════════════════════════════════════════════════

"Here's the thing about ${formData.topic.toLowerCase()}..."

"Most ${formData.audience.toLowerCase()} approach this completely wrong. They think it's about [common misconception], but the truth is..."

[BEAT]

"It comes down to something much simpler. And once you see it, you can't unsee it."


▶️ MAIN CONTENT [${timing.body}]
═══════════════════════════════════════════════════════════════

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
POINT #1: The Core Problem
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

"Let's start with the biggest issue..."

[EXPLAIN the main challenge your audience faces]

"Most people in ${formData.niche} struggle because they don't understand this fundamental principle."

[PROVIDE specific example or data point]

"Here's what that looks like in practice..."

[VISUAL: B-roll or screen share demonstration]


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
POINT #2: The Framework
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

"Now that you understand the problem, here's the framework I use..."

[INTRODUCE your method/approach]

"Step one is to..."

[WALK through each step clearly]

"Step two is..."

"And finally, step three..."

[VISUAL: List on screen or demonstration]


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
POINT #3: Real Results
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

"Let me show you what this looks like when you apply it..."

[SHARE a case study, example, or your own results]

"When I first implemented this, I saw..."

[SPECIFIC outcome or metric]

"The key insight here is..."


▶️ RECAP & CTA [${timing.outro}]
═══════════════════════════════════════════════════════════════

"So let's recap what we covered..."

[QUICK summary of 3 main points]

"1. [First key takeaway]"
"2. [Second key takeaway]"  
"3. [Third key takeaway]"

[PAUSE - Direct eye contact]

${ctaText ? `"${ctaText}"` : '"Now go implement this and let me know how it goes in the comments."'}

[CLOSING]

"Thanks for watching — I'll see you in the next one."


═══════════════════════════════════════════════════════════════
                    📝 PRODUCTION NOTES
═══════════════════════════════════════════════════════════════

THUMBNAIL IDEAS:
• Close-up face with shocked/curious expression
• Text overlay: "${formData.topic.split(' ').slice(0, 4).join(' ')}..."
• High contrast colors, bold font

RETENTION TIPS:
• Pattern interrupt every 30-45 seconds
• Use jump cuts to maintain pace
• Add visual cues at key transitions
• Consider adding music/sound design

B-ROLL SUGGESTIONS:
• Screen recordings for demonstrations
• Stock footage for context
• Behind-the-scenes clips
• Data/chart overlays

═══════════════════════════════════════════════════════════════
`;

      setScript(generatedScript);
      setIsLoading(false);
    };

    // Simulate AI generation time
    const timer = setTimeout(generateScript, 2500);
    return () => clearTimeout(timer);
  }, [formData, navigate]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(script);
    setCopied(true);
    toast({
      title: "Copied to clipboard",
      description: "Your script has been copied.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([script], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `script-${formData?.topic?.slice(0, 30).replace(/[^a-z0-9]/gi, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({
      title: "Script downloaded",
      description: "Check your downloads folder.",
    });
  };

  if (!formData) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />
      </div>

      <main className="relative pt-28 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <Button
              variant="outline"
              onClick={() => navigate('/create')}
              className="border-border text-foreground hover:bg-secondary"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              New Script
            </Button>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => { setIsLoading(true); setTimeout(() => setIsLoading(false), 2000); }}
                disabled={isLoading}
                className="border-border text-foreground hover:bg-secondary"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Regenerate
              </Button>
              <Button
                variant="outline"
                onClick={handleCopy}
                disabled={isLoading}
                className="border-border text-foreground hover:bg-secondary"
              >
                {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
              <Button
                onClick={handleDownload}
                disabled={isLoading}
                className="gradient-bg text-white hover:opacity-90"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
          </div>

          {/* Script Output */}
          <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl overflow-hidden">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-16 h-16 rounded-full gradient-bg flex items-center justify-center mb-6 glow-orange">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Generating your script...</h3>
                <p className="text-muted-foreground">Crafting hooks, structure, and CTAs</p>
              </div>
            ) : (
              <pre className="p-8 text-sm text-foreground/90 font-mono whitespace-pre-wrap overflow-x-auto leading-relaxed">
                {script}
              </pre>
            )}
          </div>

          {/* Tips */}
          {!isLoading && (
            <div className="mt-8 p-6 bg-secondary/30 border border-border rounded-xl">
              <h4 className="font-semibold text-foreground mb-3">💡 Pro Tips</h4>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• Read through once and customize the examples to your specific experience</li>
                <li>• Practice the hook 2-3 times before recording — it sets the tone</li>
                <li>• Add your own stories and data points to make it authentic</li>
                <li>• Time yourself to ensure it fits your target length</li>
              </ul>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ScriptResult;
