import { useState } from 'react';
import { Check, RefreshCw, ArrowRight, Edit3, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface StageCheckpointProps {
  stageName: string;
  stageNumber: number;
  output: string;
  onApprove: () => void;
  onRerun: (feedback: string) => void;
  onEditOutput: (editedOutput: string) => void;
  isRerunning: boolean;
}

const StageCheckpoint = ({
  stageName,
  stageNumber,
  output,
  onApprove,
  onRerun,
  onEditOutput,
  isRerunning,
}: StageCheckpointProps) => {
  const [feedback, setFeedback] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editedOutput, setEditedOutput] = useState(output);
  const [isExpanded, setIsExpanded] = useState(true);

  const handleSaveEdit = () => {
    onEditOutput(editedOutput);
    setIsEditing(false);
  };

  const handleRerun = () => {
    if (feedback.trim()) {
      onRerun(feedback);
      setFeedback('');
    }
  };

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card/50 backdrop-blur-sm">
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-secondary/30 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center text-sm font-bold text-white">
            {stageNumber}
          </div>
          <h3 className="text-lg font-semibold text-foreground">{stageName}</h3>
        </div>
        {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Output display / edit */}
          <div className="relative">
            {isEditing ? (
              <div className="space-y-2">
                <Textarea
                  value={editedOutput}
                  onChange={(e) => setEditedOutput(e.target.value)}
                  className="min-h-[200px] max-h-[400px] text-sm font-mono bg-secondary/30 border-border"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveEdit} className="gradient-bg text-white">
                    <Check className="w-3 h-3 mr-1" /> Save Changes
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setIsEditing(false); setEditedOutput(output); }}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="relative group">
                <pre className="p-4 rounded-lg bg-secondary/30 border border-border text-sm text-foreground/90 whitespace-pre-wrap overflow-x-auto max-h-[400px] overflow-y-auto leading-relaxed">
                  {output}
                </pre>
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity border-border"
                  onClick={() => { setIsEditing(true); setEditedOutput(output); }}
                >
                  <Edit3 className="w-3 h-3 mr-1" /> Edit
                </Button>
              </div>
            )}
          </div>

          {/* Feedback / re-run section */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <Textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Request changes... e.g. 'Make the claims more specific' or 'Add more stats about revenue'"
                className="min-h-[60px] text-sm bg-secondary/30 border-border resize-none"
              />
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={onApprove}
                disabled={isRerunning}
                className="gradient-bg text-white hover:opacity-90"
              >
                <ArrowRight className="w-4 h-4 mr-2" />
                Approve & Continue
              </Button>
              <Button
                variant="outline"
                onClick={handleRerun}
                disabled={isRerunning || !feedback.trim()}
                className="border-border text-foreground hover:bg-secondary"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRerunning ? 'animate-spin' : ''}`} />
                {isRerunning ? 'Re-running...' : 'Re-run with Changes'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StageCheckpoint;
