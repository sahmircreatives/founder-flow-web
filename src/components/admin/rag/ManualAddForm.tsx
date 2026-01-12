import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ManualAddFormProps {
  onSuccess: () => void;
}

const SECTION_TYPES = [
  { value: "hook", label: "Hook", table: "rag_hooks" },
  { value: "body", label: "Body Section", table: "rag_body_sections" },
  { value: "cta", label: "CTA", table: "rag_cta_sections" },
  { value: "proof", label: "Proof", table: "rag_proof_sections" },
  { value: "objection_handler", label: "Objection Handler", table: "rag_objection_handlers" },
];

const NICHE_OPTIONS = [
  { value: "agency_owners", label: "Agency owners" },
  { value: "business_coaches", label: "Business coaches" },
  { value: "fitness_health_coaches", label: "Fitness/health coaches" },
  { value: "course_creators", label: "Course creators" },
  { value: "saas_founders", label: "SaaS founders" },
  { value: "consultants", label: "Consultants" },
  { value: "ecommerce", label: "Ecommerce" },
];

export default function ManualAddForm({ onSuccess }: ManualAddFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: "",
    content: "",
    niche: "",
    sub_niche: "",
    offer_type: "",
    source: "",
    quality_notes: "",
    cta_type: "",
    proof_type: "",
    objection_type: "",
  });
  const [topicTags, setTopicTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");

  const handleAddTag = () => {
    if (newTag.trim() && !topicTags.includes(newTag.trim())) {
      setTopicTags([...topicTags, newTag.trim()]);
      setNewTag("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTopicTags(topicTags.filter((t) => t !== tag));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.type || !formData.content || !formData.niche) {
      toast.error("Please select a type, niche, and enter content");
      return;
    }

    setIsLoading(true);

    try {
      // Generate embedding
      const { data: embeddingData, error: embeddingError } = await supabase.functions.invoke(
        "rag-generate-embedding",
        { body: { text: formData.content } }
      );

      if (embeddingError) throw embeddingError;
      
      const embedding = embeddingData.embedding;
      const sectionType = SECTION_TYPES.find((t) => t.value === formData.type);
      
      if (!sectionType) throw new Error("Invalid section type");

      // Build the record based on table type
      const baseRecord: Record<string, unknown> = {
        content: formData.content,
        source: formData.source || null,
        quality_notes: formData.quality_notes || null,
        embedding,
      };

      // Add type-specific fields
      if (sectionType.value === "hook" || sectionType.value === "body") {
        Object.assign(baseRecord, {
          niche: formData.niche || null,
          sub_niche: formData.sub_niche || null,
          offer_type: formData.offer_type || null,
          topic_tags: topicTags.length > 0 ? topicTags : null,
        });
      } else if (sectionType.value === "cta") {
        Object.assign(baseRecord, {
          niche: formData.niche || null,
          offer_type: formData.offer_type || null,
          cta_type: formData.cta_type || null,
        });
      } else if (sectionType.value === "proof") {
        Object.assign(baseRecord, {
          niche: formData.niche || null,
          proof_type: formData.proof_type || null,
        });
      } else if (sectionType.value === "objection_handler") {
        Object.assign(baseRecord, {
          niche: formData.niche || null,
          objection_type: formData.objection_type || null,
          offer_type: formData.offer_type || null,
        });
      }

      // Insert into appropriate table based on type
      let insertError: Error | null = null;
      
      if (sectionType.table === "rag_hooks") {
        const { error } = await supabase.from("rag_hooks").insert({
          content: formData.content,
          source: formData.source || null,
          quality_notes: formData.quality_notes || null,
          embedding: embedding as unknown as string,
          niche: formData.niche || null,
          sub_niche: formData.sub_niche || null,
          offer_type: formData.offer_type || null,
          topic_tags: topicTags.length > 0 ? topicTags : null,
        });
        insertError = error;
      } else if (sectionType.table === "rag_body_sections") {
        const { error } = await supabase.from("rag_body_sections").insert({
          content: formData.content,
          source: formData.source || null,
          quality_notes: formData.quality_notes || null,
          embedding: embedding as unknown as string,
          niche: formData.niche || null,
          sub_niche: formData.sub_niche || null,
          offer_type: formData.offer_type || null,
          topic_tags: topicTags.length > 0 ? topicTags : null,
        });
        insertError = error;
      } else if (sectionType.table === "rag_cta_sections") {
        const { error } = await supabase.from("rag_cta_sections").insert({
          content: formData.content,
          source: formData.source || null,
          quality_notes: formData.quality_notes || null,
          embedding: embedding as unknown as string,
          niche: formData.niche || null,
          offer_type: formData.offer_type || null,
          cta_type: formData.cta_type || null,
        });
        insertError = error;
      } else if (sectionType.table === "rag_proof_sections") {
        const { error } = await supabase.from("rag_proof_sections").insert({
          content: formData.content,
          source: formData.source || null,
          quality_notes: formData.quality_notes || null,
          embedding: embedding as unknown as string,
          niche: formData.niche || null,
          proof_type: formData.proof_type || null,
        });
        insertError = error;
      } else if (sectionType.table === "rag_objection_handlers") {
        const { error } = await supabase.from("rag_objection_handlers").insert({
          content: formData.content,
          source: formData.source || null,
          quality_notes: formData.quality_notes || null,
          embedding: embedding as unknown as string,
          niche: formData.niche || null,
          objection_type: formData.objection_type || null,
          offer_type: formData.offer_type || null,
        });
        insertError = error;
      }

      if (insertError) throw insertError;

      toast.success("Content added successfully!");
      
      // Reset form
      setFormData({
        type: "",
        content: "",
        niche: "",
        sub_niche: "",
        offer_type: "",
        source: "",
        quality_notes: "",
        cta_type: "",
        proof_type: "",
        objection_type: "",
      });
      setTopicTags([]);
      onSuccess();
    } catch (error) {
      console.error("Error adding content:", error);
      toast.error("Failed to add content");
    } finally {
      setIsLoading(false);
    }
  };

  const selectedType = SECTION_TYPES.find((t) => t.value === formData.type);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Single Chunk</CardTitle>
        <CardDescription>
          Add individual script sections to the RAG database
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Section Type *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  {SECTION_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Niche *</Label>
              <Select
                value={formData.niche}
                onValueChange={(value) => setFormData({ ...formData, niche: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select niche..." />
                </SelectTrigger>
                <SelectContent>
                  {NICHE_OPTIONS.map((niche) => (
                    <SelectItem key={niche.value} value={niche.value}>
                      {niche.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Source</Label>
              <Input
                placeholder="e.g., Alex Hormozi - $100M Leads"
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Content *</Label>
            <Textarea
              placeholder="Paste the script section here (100-400 words recommended)..."
              className="min-h-[200px]"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              {formData.content.split(/\s+/).filter(Boolean).length} words
            </p>
          </div>

          {(selectedType?.value === "hook" || selectedType?.value === "body") && (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Sub-Niche</Label>
                  <Input
                    placeholder="e.g., lead generation"
                    value={formData.sub_niche}
                    onChange={(e) => setFormData({ ...formData, sub_niche: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Offer Type</Label>
                  <Input
                    placeholder="e.g., high_ticket"
                    value={formData.offer_type}
                    onChange={(e) => setFormData({ ...formData, offer_type: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Topic Tags</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a tag..."
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTag())}
                  />
                  <Button type="button" variant="outline" onClick={handleAddTag}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {topicTags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <button type="button" onClick={() => handleRemoveTag(tag)}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {selectedType?.value === "cta" && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Offer Type</Label>
                <Input
                  placeholder="e.g., high_ticket"
                  value={formData.offer_type}
                  onChange={(e) => setFormData({ ...formData, offer_type: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>CTA Type</Label>
                <Input
                  placeholder="e.g., book_call, free_resource"
                  value={formData.cta_type}
                  onChange={(e) => setFormData({ ...formData, cta_type: e.target.value })}
                />
              </div>
            </div>
          )}

          {selectedType?.value === "proof" && (
            <div className="space-y-2">
              <Label>Proof Type</Label>
              <Input
                placeholder="e.g., case_study, testimonial"
                value={formData.proof_type}
                onChange={(e) => setFormData({ ...formData, proof_type: e.target.value })}
              />
            </div>
          )}

          {selectedType?.value === "objection_handler" && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Offer Type</Label>
                <Input
                  placeholder="e.g., high_ticket"
                  value={formData.offer_type}
                  onChange={(e) => setFormData({ ...formData, offer_type: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Objection Type</Label>
                <Input
                  placeholder="e.g., price, time, skepticism"
                  value={formData.objection_type}
                  onChange={(e) => setFormData({ ...formData, objection_type: e.target.value })}
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Quality Notes</Label>
            <Textarea
              placeholder="What makes this section effective? (e.g., uses pattern interrupt, strong emotional hook)"
              value={formData.quality_notes}
              onChange={(e) => setFormData({ ...formData, quality_notes: e.target.value })}
            />
          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Embedding & Saving...
              </>
            ) : (
              "Add to RAG Database"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
