import { useState } from 'react';
import { Bot, User, ChevronDown, ChevronUp, Edit3, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export interface ChatMessageData {
  id: string;
  role: 'system' | 'user' | 'assistant';
  stageName?: string;
  stageNumber?: number;
  content: string;
  type?: 'stage-output' | 'feedback' | 'status' | 'final-editor';
  isLoading?: boolean;
  isCollapsed?: boolean;
}

interface ChatMessageProps {
  message: ChatMessageData;
  onEditOutput?: (editedContent: string) => void;
  isLatest?: boolean;
}

const ChatMessage = ({ message, onEditOutput, isLatest }: ChatMessageProps) => {
  const [isExpanded, setIsExpanded] = useState(isLatest !== false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(message.content);

  const isAssistant = message.role === 'assistant';
  const isUser = message.role === 'user';

  const handleSaveEdit = () => {
    onEditOutput?.(editedContent);
    setIsEditing(false);
  };

  // Loading state
  if (message.isLoading) {
    return (
      <div className="flex gap-3 py-6 px-4">
        <div className="flex-shrink-0 w-8 h-8 rounded-full gradient-bg flex items-center justify-center">
          <Bot className="w-4 h-4 text-primary-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-foreground">
              {message.stageName || 'Processing...'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-sm">Generating...</span>
          </div>
        </div>
      </div>
    );
  }

  // User feedback message
  if (isUser) {
    return (
      <div className="flex gap-3 py-4 px-4 justify-end">
        <div className="max-w-[80%] bg-primary/10 border border-primary/20 rounded-2xl rounded-br-md px-4 py-3">
          <p className="text-sm text-foreground whitespace-pre-wrap">{message.content}</p>
        </div>
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
          <User className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>
    );
  }

  // Status message (system)
  if (message.type === 'status') {
    return (
      <div className="flex justify-center py-2 px-4">
        <span className="text-xs text-muted-foreground bg-secondary/50 px-3 py-1 rounded-full">
          {message.content}
        </span>
      </div>
    );
  }

  // Assistant / stage output message
  const isLongOutput = message.content.length > 500;
  const shouldCollapse = !isLatest && isLongOutput;
  const displayContent = shouldCollapse && !isExpanded
    ? message.content.slice(0, 300) + '...'
    : message.content;

  return (
    <div className="flex gap-3 py-6 px-4 group">
      <div className="flex-shrink-0 w-8 h-8 rounded-full gradient-bg flex items-center justify-center text-xs font-bold text-primary-foreground">
        {message.stageNumber !== undefined ? message.stageNumber : <Bot className="w-4 h-4" />}
      </div>
      <div className="flex-1 min-w-0">
        {message.stageName && (
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-foreground">{message.stageName}</span>
            {message.stageNumber !== undefined && (
              <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                Stage {message.stageNumber}
              </span>
            )}
          </div>
        )}

        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="min-h-[200px] max-h-[400px] text-sm font-mono bg-secondary/30 border-border"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveEdit} className="gradient-bg text-primary-foreground">
                <Check className="w-3 h-3 mr-1" /> Save
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setIsEditing(false); setEditedContent(message.content); }}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="relative">
            <pre className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
              {displayContent}
            </pre>

            <div className="flex items-center gap-2 mt-2">
              {shouldCollapse && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs text-muted-foreground hover:text-foreground h-7 px-2"
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  {isExpanded ? <ChevronUp className="w-3 h-3 mr-1" /> : <ChevronDown className="w-3 h-3 mr-1" />}
                  {isExpanded ? 'Collapse' : 'Show full output'}
                </Button>
              )}
              {onEditOutput && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs text-muted-foreground hover:text-foreground h-7 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => { setIsEditing(true); setEditedContent(message.content); }}
                >
                  <Edit3 className="w-3 h-3 mr-1" /> Edit
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
