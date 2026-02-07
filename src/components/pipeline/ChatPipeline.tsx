import { useState, useRef, useEffect } from 'react';
import { Send, ArrowRight, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import ChatMessage, { ChatMessageData } from './ChatMessage';
import PipelineProgress from './PipelineProgress';

interface ChatPipelineProps {
  messages: ChatMessageData[];
  currentStage: number;
  stages: { name: string; label: string }[];
  waitingForApproval: boolean;
  isRunning: boolean;
  onApprove: () => void;
  onRerun: (feedback: string) => void;
  onEditOutput: (stageName: string, editedText: string) => void;
}

const ChatPipeline = ({
  messages,
  currentStage,
  stages,
  waitingForApproval,
  isRunning,
  onApprove,
  onRerun,
  onEditOutput,
}: ChatPipelineProps) => {
  const [feedback, setFeedback] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isRunning]);

  const handleSendFeedback = () => {
    if (feedback.trim()) {
      onRerun(feedback.trim());
      setFeedback('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (waitingForApproval && feedback.trim()) {
        handleSendFeedback();
      } else if (waitingForApproval && !feedback.trim()) {
        onApprove();
      }
    }
  };

  const currentStageName = currentStage >= 0 && currentStage < stages.length
    ? stages[currentStage].name
    : '';

  return (
    <div className="flex flex-col h-[calc(100vh-220px)]">
      {/* Progress bar */}
      <div className="flex-shrink-0 pb-3 border-b border-border mb-1">
        <PipelineProgress currentStage={currentStage} stages={stages} waitingForApproval={waitingForApproval} />
      </div>

      {/* Chat messages area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-0 divide-y divide-border/30"
      >
        {messages.map((msg, index) => (
          <ChatMessage
            key={msg.id}
            message={msg}
            isLatest={index === messages.length - 1}
            onEditOutput={
              msg.type === 'stage-output' && msg.stageName
                ? (edited) => onEditOutput(
                    stages.find(s => `Stage ${stages.indexOf(s)}: ${s.label}` === msg.stageName)?.name || currentStageName,
                    edited
                  )
                : undefined
            }
          />
        ))}

        {/* Loading indicator for current stage */}
        {isRunning && !waitingForApproval && (
          <ChatMessage
            message={{
              id: 'loading',
              role: 'assistant',
              stageName: currentStage >= 0 ? `Stage ${currentStage}: ${stages[currentStage]?.label}` : 'Processing...',
              stageNumber: currentStage,
              content: '',
              isLoading: true,
            }}
          />
        )}
      </div>

      {/* Input area - ChatGPT style */}
      <div className="flex-shrink-0 pt-3 border-t border-border">
        {waitingForApproval ? (
          <div className="space-y-3">
            <div className="relative">
              <Textarea
                ref={textareaRef}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Request changes or press Enter to approve & continue..."
                className="min-h-[52px] max-h-[120px] pr-24 text-sm bg-secondary/30 border-border resize-none"
                rows={1}
              />
              <div className="absolute right-2 bottom-2 flex gap-1.5">
                {feedback.trim() ? (
                  <Button
                    size="sm"
                    onClick={handleSendFeedback}
                    className="gradient-bg text-primary-foreground h-8 w-8 p-0"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={onApprove}
                    className="gradient-bg text-primary-foreground h-8 px-3 text-xs"
                  >
                    <ArrowRight className="w-3 h-3 mr-1" />
                    Approve
                  </Button>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Type feedback to re-run this stage, or approve to continue to the next stage
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-center py-3">
            <span className="text-sm text-muted-foreground">
              {isRunning ? 'Running pipeline stage...' : 'Pipeline complete'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPipeline;
