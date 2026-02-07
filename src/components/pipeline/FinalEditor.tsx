import { useState, useRef, useEffect } from 'react';
import { Send, Copy, Download, Check, FileText, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface FinalEditorProps {
  initialScript: string;
  businessContext: any;
  onScriptUpdate: (script: string) => void;
}

interface EditorMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isLoading?: boolean;
}

const FinalEditor = ({ initialScript, businessContext, onScriptUpdate }: FinalEditorProps) => {
  const { toast } = useToast();
  const [script, setScript] = useState(initialScript);
  const [messages, setMessages] = useState<EditorMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isEditingScript, setIsEditingScript] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const scriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || isStreaming) return;

    const userMessage: EditorMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsStreaming(true);

    // Add loading message
    const loadingId = `assistant-${Date.now()}`;
    setMessages(prev => [...prev, { id: loadingId, role: 'assistant', content: '', isLoading: true }]);

    try {
      const response = await supabase.functions.invoke('script-editor-chat', {
        body: {
          script,
          instruction: userMessage.content,
          context_profile: businessContext,
          chat_history: messages.map(m => ({ role: m.role, content: m.content })),
        },
      });

      if (response.error) throw response.error;

      const data = response.data;
      const updatedScript = data.updated_script || script;
      const explanation = data.explanation || 'Changes applied.';

      setScript(updatedScript);
      onScriptUpdate(updatedScript);

      setMessages(prev =>
        prev.map(m =>
          m.id === loadingId
            ? { ...m, content: explanation, isLoading: false }
            : m
        )
      );
    } catch (error: any) {
      console.error('Editor chat error:', error);
      setMessages(prev =>
        prev.map(m =>
          m.id === loadingId
            ? { ...m, content: `Error: ${error.message || 'Failed to process request'}`, isLoading: false }
            : m
        )
      );
      toast({
        title: 'Editor error',
        description: error.message || 'Failed to process your request',
        variant: 'destructive',
      });
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(script);
    setCopied(true);
    toast({ title: 'Script copied to clipboard' });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([script], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `script-final.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-[calc(100vh-220px)] gap-0 border border-border rounded-xl overflow-hidden bg-card/50">
      {/* Left panel - Script editor */}
      <div className="flex-1 flex flex-col border-r border-border min-w-0">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-secondary/20">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Final Script</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsEditingScript(!isEditingScript)}
              className="h-7 text-xs text-muted-foreground"
            >
              {isEditingScript ? 'Preview' : 'Edit'}
            </Button>
            <Button size="sm" variant="ghost" onClick={handleCopy} className="h-7 text-xs text-muted-foreground">
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            </Button>
            <Button size="sm" variant="ghost" onClick={handleDownload} className="h-7 text-xs text-muted-foreground">
              <Download className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Script content */}
        <div ref={scriptRef} className="flex-1 overflow-y-auto p-6">
          {isEditingScript ? (
            <textarea
              value={script}
              onChange={(e) => {
                setScript(e.target.value);
                onScriptUpdate(e.target.value);
              }}
              className="w-full h-full min-h-[400px] bg-transparent text-sm text-foreground/90 leading-relaxed resize-none focus:outline-none font-mono"
            />
          ) : (
            <pre className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
              {script}
            </pre>
          )}
        </div>
      </div>

      {/* Right panel - Chat */}
      <div className="w-[380px] flex flex-col bg-background/50">
        {/* Chat header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <div className="w-6 h-6 rounded-full gradient-bg flex items-center justify-center">
            <Sparkles className="w-3 h-3 text-primary-foreground" />
          </div>
          <div>
            <span className="text-sm font-medium text-foreground">Script Editor</span>
            <span className="text-xs text-muted-foreground ml-2">Opus 4.6</span>
          </div>
        </div>

        {/* Chat messages */}
        <div ref={chatRef} className="flex-1 overflow-y-auto">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <div className="w-12 h-12 rounded-full gradient-bg flex items-center justify-center mb-4 opacity-50">
                <Sparkles className="w-6 h-6 text-primary-foreground" />
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                Ask me to edit your script
              </p>
              <div className="space-y-1.5 w-full">
                {[
                  'Make the hook more punchy',
                  'Shorten the CTA section',
                  'Add more social proof',
                  'Make it sound more casual',
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setInput(suggestion)}
                    className="w-full text-left text-xs text-muted-foreground hover:text-foreground bg-secondary/30 hover:bg-secondary/50 rounded-lg px-3 py-2 transition-colors border border-border/50"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`px-4 py-3 ${msg.role === 'user' ? 'bg-secondary/10' : ''}`}>
              {msg.isLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-xs">Editing script...</span>
                </div>
              ) : (
                <div>
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                    {msg.role === 'user' ? 'You' : 'Editor'}
                  </span>
                  <p className="text-sm text-foreground/90 mt-1 whitespace-pre-wrap">{msg.content}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Chat input */}
        <div className="border-t border-border p-3">
          <div className="relative">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tell me how to edit the script..."
              className="min-h-[44px] max-h-[100px] pr-12 text-sm bg-secondary/30 border-border resize-none"
              rows={1}
              disabled={isStreaming}
            />
            <Button
              size="sm"
              onClick={handleSendMessage}
              disabled={!input.trim() || isStreaming}
              className="absolute right-2 bottom-2 gradient-bg text-primary-foreground h-7 w-7 p-0"
            >
              <Send className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinalEditor;
