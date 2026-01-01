import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Copy, Download, ArrowLeft, Check, Loader2, ArrowRight, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const ScriptResult = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [variation, setVariation] = useState<'A' | 'B' | 'C'>('A');
  const [showModal, setShowModal] = useState(false);
  const [showCloseButton, setShowCloseButton] = useState(false);

  const { script, businessContext, voiceData } = location.state || {};
  const [currentScript, setCurrentScript] = useState(script || '');

  // Show modal on initial load when script exists
  useEffect(() => {
    if (script) {
      setShowModal(true);
      const timer = setTimeout(() => {
        setShowCloseButton(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [script]);

  if (!script && !currentScript) {
    navigate('/create');
    return null;
  }

  const handleRegenerate = async (newVariation: 'A' | 'B' | 'C') => {
    setIsLoading(true);
    setVariation(newVariation);
    try {
      const { data, error } = await supabase.functions.invoke('generate-script', {
        body: { business: businessContext, voice: voiceData, variation: newVariation },
      });
      if (error) throw error;
      setCurrentScript(data.script);
    } catch (error: any) {
      toast({ title: 'Regeneration failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(currentScript);
    setCopied(true);
    toast({ title: 'Copied to clipboard' });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([currentScript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `youtube-script-${variation}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const scrollToBooking = () => {
    setShowModal(false);
    navigate('/');
    setTimeout(() => {
      document.getElementById('book-call')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />
      </div>

      {/* Upsell Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => showCloseButton && setShowModal(false)}
          />
          
          {/* Modal */}
          <div className="relative w-full max-w-lg animate-scale-in">
            {/* Close Button - appears after 3 seconds */}
            {showCloseButton && (
              <button
                onClick={() => setShowModal(false)}
                className="absolute -top-2 -right-2 z-10 w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors animate-fade-in"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            <div className="relative p-8 rounded-2xl border border-primary bg-card shadow-2xl shadow-primary/20">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <div className="gradient-bg text-white text-sm font-medium px-4 py-1 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Your Script is Ready!
                </div>
              </div>

              <div className="text-center pt-4">
                <h3 className="text-2xl font-bold text-foreground mb-3">
                  Want thumbnails, editing & more?
                </h3>
                <p className="text-muted-foreground mb-6">
                  Our full-stack AI agent team handles your entire content production—thumbnails, editing, 
                  scripting, the whole thing. Produce 3x more content for 1/3 the cost.
                </p>
                <Button 
                  size="lg"
                  className="gradient-bg text-white hover:opacity-90 glow-orange group"
                  onClick={scrollToBooking}
                >
                  Book a Free Strategy Call
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="relative pt-28 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <Button variant="outline" onClick={() => navigate('/create')} className="border-border text-foreground hover:bg-secondary">
              <ArrowLeft className="w-4 h-4 mr-2" />
              New Script
            </Button>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground mr-2">Variation:</span>
              {(['A', 'B', 'C'] as const).map((v) => (
                <Button
                  key={v}
                  variant={variation === v ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleRegenerate(v)}
                  disabled={isLoading}
                  className={variation === v ? 'gradient-bg text-white' : 'border-border'}
                >
                  {v}
                </Button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={handleCopy} disabled={isLoading} className="border-border text-foreground hover:bg-secondary">
                {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
              <Button onClick={handleDownload} disabled={isLoading} className="gradient-bg text-white hover:opacity-90">
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
          </div>

          <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl overflow-hidden">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-16 h-16 rounded-full gradient-bg flex items-center justify-center mb-6 glow-orange">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Generating variation {variation}...</h3>
                <p className="text-muted-foreground">Crafting your script</p>
              </div>
            ) : (
              <pre className="p-8 text-sm text-foreground/90 whitespace-pre-wrap overflow-x-auto leading-relaxed">
                {currentScript}
              </pre>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ScriptResult;