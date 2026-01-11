import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BulkImportFormProps {
  onSuccess: () => void;
}

interface ChunkedSection {
  type: "hook" | "body" | "cta" | "proof" | "objection_handler";
  content: string;
  topic_tags: string[];
  niche: string;
  sub_niche: string;
  offer_type: string;
  source: string;
  quality_notes: string;
  selected?: boolean;
}

const TYPE_TO_TABLE: Record<string, string> = {
  hook: "rag_hooks",
  body: "rag_body_sections",
  cta: "rag_cta_sections",
  proof: "rag_proof_sections",
  objection_handler: "rag_objection_handlers",
};

const TYPE_LABELS: Record<string, string> = {
  hook: "Hook",
  body: "Body",
  cta: "CTA",
  proof: "Proof",
  objection_handler: "Objection",
};

export default function BulkImportForm({ onSuccess }: BulkImportFormProps) {
  const [isChunking, setIsChunking] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [niche, setNiche] = useState("");
  const [subNiche, setSubNiche] = useState("");
  const [offerType, setOfferType] = useState("");
  const [chunks, setChunks] = useState<ChunkedSection[]>([]);

  const handleChunk = async () => {
    if (!transcript.trim()) {
      toast.error("Please enter a transcript");
      return;
    }

    setIsChunking(true);

    try {
      const { data, error } = await supabase.functions.invoke("rag-chunk-transcript", {
        body: {
          transcript,
          source_name: sourceName,
          niche,
          sub_niche: subNiche,
          offer_type: offerType,
        },
      });

      if (error) throw error;

      const sections = data.sections || [];
      setChunks(sections.map((s: ChunkedSection) => ({ ...s, selected: true })));
      toast.success(`Chunked into ${sections.length} sections`);
    } catch (error) {
      console.error("Chunking error:", error);
      toast.error("Failed to chunk transcript");
    } finally {
      setIsChunking(false);
    }
  };

  const handleToggleAll = (checked: boolean) => {
    setChunks(chunks.map((c) => ({ ...c, selected: checked })));
  };

  const handleToggleChunk = (index: number) => {
    setChunks(
      chunks.map((c, i) => (i === index ? { ...c, selected: !c.selected } : c))
    );
  };

  const handleImport = async () => {
    const selectedChunks = chunks.filter((c) => c.selected);
    if (selectedChunks.length === 0) {
      toast.error("Please select at least one chunk to import");
      return;
    }

    setIsImporting(true);
    let successCount = 0;
    let errorCount = 0;

    for (const chunk of selectedChunks) {
      try {
        // Generate embedding
        const { data: embeddingData, error: embeddingError } = await supabase.functions.invoke(
          "rag-generate-embedding",
          { body: { text: chunk.content } }
        );

        if (embeddingError) throw embeddingError;

        // Insert based on chunk type
        let insertError: Error | null = null;
        const embedding = embeddingData.embedding as unknown as string;

        if (chunk.type === "hook") {
          const { error } = await supabase.from("rag_hooks").insert({
            content: chunk.content,
            source: chunk.source || null,
            quality_notes: chunk.quality_notes || null,
            embedding,
            niche: chunk.niche || null,
            sub_niche: chunk.sub_niche || null,
            offer_type: chunk.offer_type || null,
            topic_tags: chunk.topic_tags?.length > 0 ? chunk.topic_tags : null,
          });
          insertError = error;
        } else if (chunk.type === "body") {
          const { error } = await supabase.from("rag_body_sections").insert({
            content: chunk.content,
            source: chunk.source || null,
            quality_notes: chunk.quality_notes || null,
            embedding,
            niche: chunk.niche || null,
            sub_niche: chunk.sub_niche || null,
            offer_type: chunk.offer_type || null,
            topic_tags: chunk.topic_tags?.length > 0 ? chunk.topic_tags : null,
          });
          insertError = error;
        } else if (chunk.type === "cta") {
          const { error } = await supabase.from("rag_cta_sections").insert({
            content: chunk.content,
            source: chunk.source || null,
            quality_notes: chunk.quality_notes || null,
            embedding,
            offer_type: chunk.offer_type || null,
          });
          insertError = error;
        } else if (chunk.type === "proof") {
          const { error } = await supabase.from("rag_proof_sections").insert({
            content: chunk.content,
            source: chunk.source || null,
            quality_notes: chunk.quality_notes || null,
            embedding,
            niche: chunk.niche || null,
          });
          insertError = error;
        } else if (chunk.type === "objection_handler") {
          const { error } = await supabase.from("rag_objection_handlers").insert({
            content: chunk.content,
            source: chunk.source || null,
            quality_notes: chunk.quality_notes || null,
            embedding,
            offer_type: chunk.offer_type || null,
          });
          insertError = error;
        } else {
          console.error("Unknown type:", chunk.type);
          errorCount++;
          continue;
        }

        if (insertError) throw insertError;
        successCount++;
      } catch (error) {
        console.error("Import error for chunk:", error);
        errorCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`Imported ${successCount} chunks successfully`);
      setChunks([]);
      setTranscript("");
      onSuccess();
    }
    if (errorCount > 0) {
      toast.error(`Failed to import ${errorCount} chunks`);
    }

    setIsImporting(false);
  };

  const selectedCount = chunks.filter((c) => c.selected).length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Bulk Import via AI</CardTitle>
          <CardDescription>
            Paste a full transcript and let AI automatically chunk it into sections
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Full Transcript</Label>
            <Textarea
              placeholder="Paste the full video transcript here..."
              className="min-h-[200px]"
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {transcript.split(/\s+/).filter(Boolean).length} words
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>Source Name</Label>
              <Input
                placeholder="e.g., Alex Hormozi - Video Title"
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Niche</Label>
              <Input
                placeholder="e.g., business coaching"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Sub-Niche</Label>
              <Input
                placeholder="e.g., lead generation"
                value={subNiche}
                onChange={(e) => setSubNiche(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Offer Type</Label>
              <Input
                placeholder="e.g., high_ticket"
                value={offerType}
                onChange={(e) => setOfferType(e.target.value)}
              />
            </div>
          </div>

          <Button
            onClick={handleChunk}
            disabled={isChunking || !transcript.trim()}
            className="w-full"
          >
            {isChunking ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing Transcript...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Chunk with AI
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {chunks.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Review Chunks</CardTitle>
                <CardDescription>
                  {selectedCount} of {chunks.length} chunks selected for import
                </CardDescription>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="select-all"
                    checked={selectedCount === chunks.length}
                    onCheckedChange={(checked) => handleToggleAll(checked as boolean)}
                  />
                  <Label htmlFor="select-all" className="text-sm">
                    Select All
                  </Label>
                </div>
                <Button
                  onClick={handleImport}
                  disabled={isImporting || selectedCount === 0}
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Import Selected ({selectedCount})
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {chunks.map((chunk, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${
                    chunk.selected ? "border-primary bg-primary/5" : "border-muted"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={chunk.selected}
                      onCheckedChange={() => handleToggleChunk(index)}
                    />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={chunk.selected ? "default" : "secondary"}>
                          {TYPE_LABELS[chunk.type] || chunk.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {chunk.content.split(/\s+/).filter(Boolean).length} words
                        </span>
                      </div>
                      <p className="text-sm line-clamp-3">{chunk.content}</p>
                      {chunk.quality_notes && (
                        <p className="text-xs text-muted-foreground italic">
                          {chunk.quality_notes}
                        </p>
                      )}
                      {chunk.topic_tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {chunk.topic_tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
