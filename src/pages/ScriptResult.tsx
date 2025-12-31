import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Copy, Download, ArrowLeft, Check, Loader2, RefreshCw } from 'lucide-react';
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

  const { script, businessContext, voiceData } = location.state || {};
  const [currentScript, setCurrentScript] = useState(script || '');

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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />
      </div>

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
