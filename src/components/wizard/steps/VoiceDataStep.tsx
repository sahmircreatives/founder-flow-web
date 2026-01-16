import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import { VoiceData } from '@/types/scriptGenerator';
import { toast } from 'sonner';

interface VoiceDataStepProps {
  data: VoiceData;
  onUpdate: (field: keyof VoiceData, value: string | string[]) => void;
  creatorName?: string;
}

const toneOptions = [
  'Professional', 'Authoritative', 'Relaxed', 'Conversational',
  'Direct', 'Empathetic', 'Energetic', 'Educational', 'Inspirational'
];

const VoiceDataStep = ({ data, onUpdate, creatorName }: VoiceDataStepProps) => {
  const [copied, setCopied] = useState(false);

  const toggleTone = (tone: string) => {
    const currentTones = data.tone_goals;
    if (currentTones.includes(tone)) {
      onUpdate('tone_goals', currentTones.filter(t => t !== tone));
    } else {
      onUpdate('tone_goals', [...currentTones, tone]);
    }
  };

  const handleArrayInput = (field: 'dont_phrases', value: string) => {
    const items = value.split('\n').filter(Boolean);
    onUpdate(field, items);
  };

  const handleCopyUsername = async () => {
    if (!creatorName) {
      toast.error('No creator name found from Business Context');
      return;
    }
    
    const username = creatorName.trim().replace('@', '');
    await navigator.clipboard.writeText(username);
    setCopied(true);
    toast.success(`Copied: ${username}`);
    
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-foreground mb-2">Voice & Tone</h3>
        <p className="text-muted-foreground text-sm">Help the AI match your unique voice and style.</p>
      </div>

      <div className="space-y-5">
        {/* Copy Username for Scraping */}
        {creatorName && (
          <div className="p-4 bg-secondary/30 rounded-lg border border-border">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-foreground">Creator Username</p>
                <p className="text-xs text-muted-foreground">Copy to use in your tweet scraping tool</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-foreground font-mono">{creatorName}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyUsername}
                  className="shrink-0"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Tweet Examples */}
        <div>
          <Label htmlFor="tweets" className="text-sm font-medium text-foreground mb-2 block">
            Tweet/Content Examples (paste up to 50 examples)
          </Label>
          <p className="text-xs text-muted-foreground mb-2">
            Paste your best tweets or short content examples. The AI will learn your voice from these.
          </p>
          <Textarea
            id="tweets"
            placeholder="Paste your tweets or content examples here...&#10;&#10;Example:&#10;Most creators post and pray. Top 1% creators post and compound. The difference? A content system.&#10;&#10;Your content isn't working because you're optimizing for views. Optimize for trust instead."
            value={data.tweet_examples}
            onChange={(e) => onUpdate('tweet_examples', e.target.value)}
            className="bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground min-h-[150px] font-mono text-sm"
          />
        </div>

        {/* Tone Goals */}
        <div>
          <Label className="text-sm font-medium text-foreground mb-3 block">
            Tone Goals (select all that apply)
          </Label>
          <div className="flex flex-wrap gap-2">
            {toneOptions.map((tone) => (
              <button
                key={tone}
                onClick={() => toggleTone(tone)}
                className={`px-4 py-2 rounded-full border text-sm font-medium transition-all ${
                  data.tone_goals.includes(tone)
                    ? 'border-primary bg-primary/10 text-foreground'
                    : 'border-border bg-secondary/30 text-foreground/80 hover:border-primary/50'
                }`}
              >
                {tone}
              </button>
            ))}
          </div>
        </div>


        {/* Don't Phrases */}
        <div>
          <Label htmlFor="dontPhrases" className="text-sm font-medium text-foreground mb-2 block">
            "Don't" Phrases — Words/phrases to avoid
          </Label>
          <p className="text-xs text-muted-foreground mb-2">One per line</p>
          <Textarea
            id="dontPhrases"
            placeholder="Basically...&#10;Just...&#10;In this video...&#10;Hey guys..."
            value={data.dont_phrases.join('\n')}
            onChange={(e) => handleArrayInput('dont_phrases', e.target.value)}
            className="bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground min-h-[100px] font-mono text-sm"
          />
        </div>
      </div>
    </div>
  );
};

export default VoiceDataStep;
