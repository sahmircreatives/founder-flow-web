import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Sparkles, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Header from '@/components/Header';

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

const goals = [
  { value: 'leads', label: 'Generate leads' },
  { value: 'authority', label: 'Build authority' },
  { value: 'education', label: 'Educate audience' },
  { value: 'sales', label: 'Drive sales' },
  { value: 'growth', label: 'Audience growth' },
];

const tones = [
  { value: 'educational', label: 'Educational' },
  { value: 'direct', label: 'Direct' },
  { value: 'story', label: 'Story-based' },
  { value: 'energy', label: 'High-energy' },
  { value: 'calm', label: 'Calm expert' },
  { value: 'viral', label: 'Viral / Hook-heavy' },
];

const lengths = [
  { value: 'short', label: 'Short (60–90s)', desc: 'Perfect for Shorts / Reels' },
  { value: 'medium', label: 'Medium (2–4 min)', desc: 'Standard YouTube format' },
  { value: 'long', label: 'Long (6–10 min)', desc: 'Deep-dive content' },
];

const ctas = [
  { value: 'call', label: 'Book a call' },
  { value: 'magnet', label: 'Download lead magnet' },
  { value: 'subscribe', label: 'Subscribe' },
  { value: 'none', label: 'No CTA' },
];

const CreateScript = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    niche: '',
    audience: '',
    topic: '',
    goal: '',
    tone: [],
    length: '',
    cta: '',
    extraNotes: '',
  });

  const totalSteps = 7;

  const updateField = (field: keyof FormData, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleTone = (tone: string) => {
    setFormData(prev => ({
      ...prev,
      tone: prev.tone.includes(tone) 
        ? prev.tone.filter(t => t !== tone)
        : [...prev.tone, tone]
    }));
  };

  const canProceed = () => {
    switch (step) {
      case 1: return formData.niche.trim().length > 0;
      case 2: return formData.audience.trim().length > 0;
      case 3: return formData.topic.trim().length > 0;
      case 4: return formData.goal.length > 0;
      case 5: return formData.tone.length > 0;
      case 6: return formData.length.length > 0;
      case 7: return true; // CTA is optional
      default: return true;
    }
  };

  const handleGenerate = () => {
    setIsGenerating(true);
    // Navigate to results page with form data
    setTimeout(() => {
      navigate('/script', { state: { formData } });
    }, 500);
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="niche" className="text-lg font-medium text-foreground mb-2 block">
                What's your niche?
              </Label>
              <p className="text-muted-foreground text-sm mb-4">
                E.g., "personal finance", "SaaS marketing", "fitness coaching"
              </p>
            </div>
            <Input
              id="niche"
              placeholder="Enter your niche..."
              value={formData.niche}
              onChange={(e) => updateField('niche', e.target.value)}
              className="bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground h-14 text-lg"
              autoFocus
            />
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="audience" className="text-lg font-medium text-foreground mb-2 block">
                Who is this video for?
              </Label>
              <p className="text-muted-foreground text-sm mb-4">
                Describe your target viewer in a few words
              </p>
            </div>
            <Input
              id="audience"
              placeholder="E.g., Beginner entrepreneurs, busy moms, tech founders..."
              value={formData.audience}
              onChange={(e) => updateField('audience', e.target.value)}
              className="bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground h-14 text-lg"
              autoFocus
            />
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="topic" className="text-lg font-medium text-foreground mb-2 block">
                What's the topic or title idea?
              </Label>
              <p className="text-muted-foreground text-sm mb-4">
                The main subject of your video
              </p>
            </div>
            <Input
              id="topic"
              placeholder="E.g., 5 mistakes killing your YouTube growth..."
              value={formData.topic}
              onChange={(e) => updateField('topic', e.target.value)}
              className="bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground h-14 text-lg"
              autoFocus
            />
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-lg font-medium text-foreground mb-2 block">
                What's the goal of this video?
              </Label>
              <p className="text-muted-foreground text-sm mb-4">
                Select the primary objective
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {goals.map((goal) => (
                <button
                  key={goal.value}
                  onClick={() => updateField('goal', goal.value)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    formData.goal === goal.value
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border bg-secondary/30 text-foreground/80 hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{goal.label}</span>
                    {formData.goal === goal.value && (
                      <Check className="w-5 h-5 text-primary" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-lg font-medium text-foreground mb-2 block">
                What tone or style?
              </Label>
              <p className="text-muted-foreground text-sm mb-4">
                Select one or more styles
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {tones.map((tone) => (
                <button
                  key={tone.value}
                  onClick={() => toggleTone(tone.value)}
                  className={`px-5 py-3 rounded-full border text-sm font-medium transition-all ${
                    formData.tone.includes(tone.value)
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border bg-secondary/30 text-foreground/80 hover:border-primary/50'
                  }`}
                >
                  {tone.label}
                </button>
              ))}
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-lg font-medium text-foreground mb-2 block">
                How long should the video be?
              </Label>
              <p className="text-muted-foreground text-sm mb-4">
                We'll adjust the script structure accordingly
              </p>
            </div>
            <div className="grid gap-3">
              {lengths.map((length) => (
                <button
                  key={length.value}
                  onClick={() => updateField('length', length.value)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    formData.length === length.value
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border bg-secondary/30 text-foreground/80 hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium block">{length.label}</span>
                      <span className="text-sm text-muted-foreground">{length.desc}</span>
                    </div>
                    {formData.length === length.value && (
                      <Check className="w-5 h-5 text-primary" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        );

      case 7:
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-lg font-medium text-foreground mb-2 block">
                What's your call-to-action?
              </Label>
              <p className="text-muted-foreground text-sm mb-4">
                Optional — what should viewers do next?
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {ctas.map((cta) => (
                <button
                  key={cta.value}
                  onClick={() => updateField('cta', cta.value)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    formData.cta === cta.value
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border bg-secondary/30 text-foreground/80 hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{cta.label}</span>
                    {formData.cta === cta.value && (
                      <Check className="w-5 h-5 text-primary" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />
      </div>

      <main className="relative pt-32 pb-20 px-6">
        <div className="max-w-xl mx-auto">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
              <span>Step {step} of {totalSteps}</span>
              <span>{Math.round((step / totalSteps) * 100)}% complete</span>
            </div>
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full gradient-bg transition-all duration-300"
                style={{ width: `${(step / totalSteps) * 100}%` }}
              />
            </div>
          </div>

          {/* Step Content */}
          <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-8 mb-8">
            {renderStep()}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => step === 1 ? navigate('/') : setStep(s => s - 1)}
              className="border-border text-foreground hover:bg-secondary"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {step === 1 ? 'Home' : 'Back'}
            </Button>

            {step < totalSteps ? (
              <Button
                onClick={() => setStep(s => s + 1)}
                disabled={!canProceed()}
                className="gradient-bg text-white hover:opacity-90 disabled:opacity-50"
              >
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="gradient-bg text-white hover:opacity-90 glow-orange px-8"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Script
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default CreateScript;
