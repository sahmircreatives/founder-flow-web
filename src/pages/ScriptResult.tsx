import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Copy, Download, ArrowLeft, Check, Loader2, ArrowRight, Sparkles, X, BookOpen, CheckCircle2, ExternalLink, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ResearchSource {
  title: string;
  url: string;
  date?: string;
  snippet: string;
}

interface SupportedClaim {
  claim: string;
  source_url: string;
  relevance_score: number;
}

interface AlignmentChecklist {
  audience_match: string;
  offer_relevance: string;
  pain_point_addressed: string;
  cta_alignment: string;
  filtered_claims_count: number;
  original_claims_count: number;
}

interface ValidationResult {
  passed: boolean;
  issues: string[];
}

const ScriptResult = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [variation, setVariation] = useState<'A' | 'B' | 'C'>('A');
  const [showModal, setShowModal] = useState(false);
  const [showCloseButton, setShowCloseButton] = useState(false);
  const [activeTab, setActiveTab] = useState<'script' | 'research' | 'alignment'>('script');

  const { script, businessContext, voiceData, researchPack, alignmentChecklist, validation } = location.state || {};
  const [currentScript, setCurrentScript] = useState(script || '');
  const [currentResearch, setCurrentResearch] = useState<{ sources: ResearchSource[]; claims: SupportedClaim[] }>(researchPack || { sources: [], claims: [] });
  const [currentChecklist, setCurrentChecklist] = useState<AlignmentChecklist | null>(alignmentChecklist || null);
  const [currentValidation, setCurrentValidation] = useState<ValidationResult | null>(validation || null);

  useEffect(() => {
    if (script && !isLoading) {
      const showTimer = setTimeout(() => {
        setShowModal(true);
        setTimeout(() => {
          setShowCloseButton(true);
        }, 3000);
      }, 3000);
      return () => clearTimeout(showTimer);
    }
  }, [script, isLoading]);

  if (!script && !currentScript) {
    navigate('/create');
    return null;
  }

  const handleRegenerate = async (newVariation: 'A' | 'B' | 'C') => {
    setIsLoading(true);
    setVariation(newVariation);
    try {
      const { data, error } = await supabase.functions.invoke('generate-script-v3', {
        body: { 
          topic: businessContext?.video_title,
          context_profile: businessContext, 
          tweets: voiceData?.tweet_examples || '',
          constraints: {
            tone_goals: voiceData?.tone_goals || [],
            do_phrases: voiceData?.do_phrases || [],
            dont_phrases: voiceData?.dont_phrases || [],
          },
        },
      });
      if (error) throw error;
      setCurrentScript(data.script);
      setCurrentResearch(data.research_pack || { sources: [], claims: [] });
      setCurrentChecklist(data.alignment_checklist || null);
      setCurrentValidation(data.validation || null);
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
          <div 
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => showCloseButton && setShowModal(false)}
          />
          
          <div className="relative w-full max-w-lg animate-scale-in">
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
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
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

          {/* Tabs */}
          <div className="flex gap-2 mb-4">
            <Button
              variant={activeTab === 'script' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('script')}
              className={activeTab === 'script' ? 'gradient-bg text-white' : 'border-border'}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Script
            </Button>
            <Button
              variant={activeTab === 'research' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('research')}
              className={activeTab === 'research' ? 'gradient-bg text-white' : 'border-border'}
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Research ({currentResearch.claims.length} citations)
            </Button>
            <Button
              variant={activeTab === 'alignment' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('alignment')}
              className={activeTab === 'alignment' ? 'gradient-bg text-white' : 'border-border'}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Alignment
            </Button>
          </div>

          {/* Validation Status */}
          {currentValidation && (
            <div className={`mb-4 p-3 rounded-lg border ${currentValidation.passed ? 'border-green-500/30 bg-green-500/10' : 'border-yellow-500/30 bg-yellow-500/10'}`}>
              <div className="flex items-center gap-2">
                {currentValidation.passed ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-yellow-500" />
                )}
                <span className={`text-sm font-medium ${currentValidation.passed ? 'text-green-500' : 'text-yellow-500'}`}>
                  {currentValidation.passed ? 'Script validated successfully' : `${currentValidation.issues.length} validation note(s)`}
                </span>
              </div>
              {!currentValidation.passed && currentValidation.issues.length > 0 && (
                <ul className="mt-2 text-xs text-muted-foreground space-y-1">
                  {currentValidation.issues.map((issue, i) => (
                    <li key={i}>• {issue}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl overflow-hidden">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-16 h-16 rounded-full gradient-bg flex items-center justify-center mb-6 glow-orange">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Generating variation {variation}...</h3>
                <p className="text-muted-foreground">Researching, aligning, and crafting your script</p>
              </div>
            ) : (
              <>
                {/* Script Tab */}
                {activeTab === 'script' && (
                  <pre className="p-8 text-sm text-foreground/90 whitespace-pre-wrap overflow-x-auto leading-relaxed">
                    {currentScript}
                  </pre>
                )}

                {/* Research Tab */}
                {activeTab === 'research' && (
                  <div className="p-8 space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-primary" />
                        Research-Backed Claims
                      </h3>
                      {currentResearch.claims.length > 0 ? (
                        <div className="space-y-4">
                          {currentResearch.claims.map((claim, i) => (
                            <div key={i} className="p-4 rounded-lg bg-secondary/50 border border-border">
                              <p className="text-sm text-foreground mb-2">{claim.claim}</p>
                              <a 
                                href={claim.source_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs text-primary hover:underline flex items-center gap-1"
                              >
                                <ExternalLink className="w-3 h-3" />
                                {claim.source_url}
                              </a>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-sm">No research claims available for this script.</p>
                      )}
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-4">Sources</h3>
                      {currentResearch.sources.length > 0 ? (
                        <div className="space-y-2">
                          {currentResearch.sources.map((source, i) => (
                            <a 
                              key={i}
                              href={source.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="block p-3 rounded-lg bg-secondary/30 border border-border hover:border-primary/50 transition-colors"
                            >
                              <p className="text-sm text-foreground font-medium">{source.title}</p>
                              <p className="text-xs text-primary truncate">{source.url}</p>
                            </a>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-sm">No sources available.</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Alignment Tab */}
                {activeTab === 'alignment' && currentChecklist && (
                  <div className="p-8 space-y-6">
                    <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                      Alignment Checklist
                    </h3>

                    <div className="grid gap-4">
                      <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                        <h4 className="text-sm font-medium text-foreground mb-1">Audience Match</h4>
                        <p className="text-sm text-muted-foreground">{currentChecklist.audience_match}</p>
                      </div>

                      <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                        <h4 className="text-sm font-medium text-foreground mb-1">Offer Relevance</h4>
                        <p className="text-sm text-muted-foreground">{currentChecklist.offer_relevance}</p>
                      </div>

                      <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                        <h4 className="text-sm font-medium text-foreground mb-1">Pain Points Addressed</h4>
                        <p className="text-sm text-muted-foreground">{currentChecklist.pain_point_addressed}</p>
                      </div>

                      <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                        <h4 className="text-sm font-medium text-foreground mb-1">CTA Alignment</h4>
                        <p className="text-sm text-muted-foreground">{currentChecklist.cta_alignment}</p>
                      </div>

                      <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
                        <h4 className="text-sm font-medium text-foreground mb-1">Claims Filtered</h4>
                        <p className="text-sm text-muted-foreground">
                          {currentChecklist.filtered_claims_count} of {currentChecklist.original_claims_count} research claims kept after alignment filtering
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ScriptResult;