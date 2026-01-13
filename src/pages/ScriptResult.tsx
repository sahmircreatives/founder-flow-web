import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Copy, Download, ArrowLeft, Check, Loader2, ArrowRight, Sparkles, X, BookOpen, CheckCircle2, ExternalLink, AlertTriangle, Mic, BarChart3, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';
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

interface ToneSummary {
  one_sentence_voice: string;
  tone_rules: string[];
  do_phrases: string[];
  dont_phrases: string[];
  cadence_notes: string[];
  example_lines: string[];
}

interface ContextUseLog {
  tweet_proof_items_used: number;
  tweet_proof_items: string[];
  sections: { name: string; non_tweet_value_points: number }[];
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
  const [activeTab, setActiveTab] = useState<'script' | 'research' | 'alignment' | 'tone' | 'usage'>('script');

  const { script, businessContext, voiceData, researchPack, alignmentChecklist, validation, toneSummary, contextUseLog } = location.state || {};
  const [currentScript, setCurrentScript] = useState(script || '');
  const [currentResearch, setCurrentResearch] = useState<{ sources: ResearchSource[]; claims: SupportedClaim[] }>(researchPack || { sources: [], claims: [] });
  const [currentChecklist, setCurrentChecklist] = useState<AlignmentChecklist | null>(alignmentChecklist || null);
  const [currentValidation, setCurrentValidation] = useState<ValidationResult | null>(validation || null);
  const [currentToneSummary, setCurrentToneSummary] = useState<ToneSummary | null>(toneSummary || null);
  const [currentContextUseLog, setCurrentContextUseLog] = useState<ContextUseLog | null>(contextUseLog || null);

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
      setCurrentToneSummary(data.tone_summary || null);
      setCurrentContextUseLog(data.context_use_log || null);
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

  const handleOpenGoogleDoc = async () => {
    await navigator.clipboard.writeText(currentScript);
    window.open('https://docs.google.com/document/create', '_blank');
    toast({ 
      title: 'Script copied!', 
      description: 'Paste (Cmd+V / Ctrl+V) into the new Google Doc' 
    });
  };

  const handleDownloadDocx = async () => {
    const title = businessContext?.video_title || 'YouTube Script';
    const paragraphs = currentScript.split('\n\n').map((para: string) => {
      // Check if it's a section header (all caps or starts with ##)
      const isHeader = para === para.toUpperCase() && para.length < 50;
      if (isHeader) {
        return new Paragraph({
          text: para,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 400, after: 200 },
        });
      }
      return new Paragraph({
        children: [new TextRun({ text: para })],
        spacing: { after: 200 },
      });
    });

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: title,
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 400 },
          }),
          ...paragraphs,
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${variation}.docx`);
    toast({ title: 'Downloaded as .docx', description: 'Upload to Google Drive to convert to Google Docs' });
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
              <Button variant="outline" onClick={handleDownload} disabled={isLoading} className="border-border text-foreground hover:bg-secondary">
                <Download className="w-4 h-4 mr-2" />
                .txt
              </Button>
              <Button onClick={handleOpenGoogleDoc} disabled={isLoading} className="gradient-bg text-white hover:opacity-90">
                <FileText className="w-4 h-4 mr-2" />
                Google Doc
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap gap-2 mb-4">
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
              Research ({currentResearch.claims.length})
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
            <Button
              variant={activeTab === 'tone' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('tone')}
              className={activeTab === 'tone' ? 'gradient-bg text-white' : 'border-border'}
            >
              <Mic className="w-4 h-4 mr-2" />
              Tone
            </Button>
            <Button
              variant={activeTab === 'usage' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('usage')}
              className={activeTab === 'usage' ? 'gradient-bg text-white' : 'border-border'}
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Usage
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

                {/* Tone Tab */}
                {activeTab === 'tone' && currentToneSummary && (
                  <div className="p-8 space-y-6">
                    <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                      <Mic className="w-5 h-5 text-primary" />
                      Extracted Voice & Tone
                    </h3>

                    <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
                      <h4 className="text-sm font-medium text-foreground mb-1">Voice Summary</h4>
                      <p className="text-sm text-muted-foreground">{currentToneSummary.one_sentence_voice}</p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      {currentToneSummary.tone_rules.length > 0 && (
                        <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                          <h4 className="text-sm font-medium text-foreground mb-2">Tone Rules</h4>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            {currentToneSummary.tone_rules.map((rule, i) => (
                              <li key={i}>• {rule}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {currentToneSummary.do_phrases.length > 0 && (
                        <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                          <h4 className="text-sm font-medium text-foreground mb-2">Do Use</h4>
                          <div className="flex flex-wrap gap-2">
                            {currentToneSummary.do_phrases.map((phrase, i) => (
                              <span key={i} className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded">
                                {phrase}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {currentToneSummary.dont_phrases.length > 0 && (
                        <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                          <h4 className="text-sm font-medium text-foreground mb-2">Don't Use</h4>
                          <div className="flex flex-wrap gap-2">
                            {currentToneSummary.dont_phrases.map((phrase, i) => (
                              <span key={i} className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded">
                                {phrase}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {currentToneSummary.cadence_notes.length > 0 && (
                        <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                          <h4 className="text-sm font-medium text-foreground mb-2">Cadence Notes</h4>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            {currentToneSummary.cadence_notes.map((note, i) => (
                              <li key={i}>• {note}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {currentToneSummary.example_lines.length > 0 && (
                      <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                        <h4 className="text-sm font-medium text-foreground mb-2">Example Lines (Style Reference)</h4>
                        <div className="space-y-2">
                          {currentToneSummary.example_lines.map((line, i) => (
                            <p key={i} className="text-sm text-muted-foreground italic">"{line}"</p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Usage Tab */}
                {activeTab === 'usage' && currentContextUseLog && (
                  <div className="p-8 space-y-6">
                    <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-primary" />
                      Context Usage Log
                    </h3>

                    <div className={`p-4 rounded-lg border ${currentContextUseLog.tweet_proof_items_used <= 2 ? 'border-green-500/30 bg-green-500/10' : 'border-red-500/30 bg-red-500/10'}`}>
                      <h4 className="text-sm font-medium text-foreground mb-1">Tweet-Based Proof Items</h4>
                      <p className={`text-2xl font-bold ${currentContextUseLog.tweet_proof_items_used <= 2 ? 'text-green-500' : 'text-red-500'}`}>
                        {currentContextUseLog.tweet_proof_items_used} / 2 max
                      </p>
                      {currentContextUseLog.tweet_proof_items.length > 0 && (
                        <ul className="mt-2 text-xs text-muted-foreground space-y-1">
                          {currentContextUseLog.tweet_proof_items.map((item, i) => (
                            <li key={i}>• {item}</li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-foreground mb-3">Non-Tweet Value Points by Section</h4>
                      <div className="grid gap-3">
                        {currentContextUseLog.sections.map((section, i) => (
                          <div key={i} className={`p-3 rounded-lg border ${section.non_tweet_value_points >= 2 ? 'border-green-500/30 bg-green-500/10' : 'border-yellow-500/30 bg-yellow-500/10'}`}>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-foreground">{section.name}</span>
                              <span className={`text-sm font-bold ${section.non_tweet_value_points >= 2 ? 'text-green-500' : 'text-yellow-500'}`}>
                                {section.non_tweet_value_points} value points
                              </span>
                            </div>
                            <div className="mt-1 h-2 bg-secondary rounded-full overflow-hidden">
                              <div 
                                className={`h-full ${section.non_tweet_value_points >= 2 ? 'bg-green-500' : 'bg-yellow-500'}`}
                                style={{ width: `${Math.min(section.non_tweet_value_points * 50, 100)}%` }}
                              />
                            </div>
                          </div>
                        ))}
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