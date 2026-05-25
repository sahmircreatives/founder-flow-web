import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Trash2, Eye, Edit2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface RAGItem {
  id: string;
  content: string;
  source: string | null;
  quality_notes: string | null;
  niche?: string | null;
  sub_niche?: string | null;
  offer_type?: string | null;
  topic_tags?: string[] | null;
  cta_type?: string | null;
  proof_type?: string | null;
  objection_type?: string | null;
  created_at: string;
}

const TABLES = [
  { value: "rag_hooks", label: "Hooks" },
  { value: "rag_body_sections", label: "Body Sections" },
  { value: "rag_cta_sections", label: "CTAs" },
  { value: "rag_proof_sections", label: "Proof" },
  { value: "rag_objection_handlers", label: "Objection Handlers" },
];

const NICHE_OPTIONS = [
  { value: "all", label: "All Niches" },
  { value: "agency_owners", label: "Agency owners" },
  { value: "business_coaches", label: "Business coaches" },
  { value: "fitness_health_coaches", label: "Fitness/health coaches" },
  { value: "course_creators", label: "Course creators" },
  { value: "saas_founders", label: "SaaS founders" },
  { value: "consultants", label: "Consultants" },
  { value: "ecommerce", label: "Ecommerce" },
];

export default function RAGContentTable() {
  const [selectedTable, setSelectedTable] = useState("rag_hooks");
  const [selectedNiche, setSelectedNiche] = useState("all");
  const [items, setItems] = useState<RAGItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editItem, setEditItem] = useState<RAGItem | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const fetchItems = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from(selectedTable as "rag_hooks" | "rag_body_sections" | "rag_cta_sections" | "rag_proof_sections" | "rag_objection_handlers")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (selectedNiche && selectedNiche !== "all") {
        query = query.eq("niche", selectedNiche);
      }

      const { data, error } = await query;

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Failed to fetch items");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [selectedTable, selectedNiche]);

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from(selectedTable as "rag_hooks" | "rag_body_sections" | "rag_cta_sections" | "rag_proof_sections" | "rag_objection_handlers")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Item deleted");
      fetchItems();
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete item");
    }
  };

  const handleUpdate = async () => {
    if (!editItem) return;
    setIsEditing(true);

    try {
      // Regenerate embedding if content changed
      const { data: embeddingData, error: embeddingError } = await supabase.functions.invoke(
        "rag-generate-embedding",
        { body: { text: editItem.content } }
      );

      if (embeddingError) throw embeddingError;

      const updateData: Record<string, unknown> = {
        content: editItem.content,
        source: editItem.source,
        quality_notes: editItem.quality_notes,
        embedding: embeddingData.embedding,
      };

      // Add type-specific fields
      if (selectedTable === "rag_hooks" || selectedTable === "rag_body_sections") {
        Object.assign(updateData, {
          niche: editItem.niche,
          sub_niche: editItem.sub_niche,
          offer_type: editItem.offer_type,
        });
      } else if (selectedTable === "rag_cta_sections") {
        Object.assign(updateData, {
          niche: editItem.niche,
          offer_type: editItem.offer_type,
        });
      } else if (selectedTable === "rag_proof_sections") {
        Object.assign(updateData, {
          niche: editItem.niche,
        });
      } else if (selectedTable === "rag_objection_handlers") {
        Object.assign(updateData, {
          niche: editItem.niche,
          offer_type: editItem.offer_type,
        });
      }

      const { error } = await supabase
        .from(selectedTable as "rag_hooks" | "rag_body_sections" | "rag_cta_sections" | "rag_proof_sections" | "rag_objection_handlers")
        .update(updateData as any)
        .eq("id", editItem.id);

      if (error) throw error;
      toast.success("Item updated");
      setEditItem(null);
      fetchItems();
    } catch (error) {
      console.error("Update error:", error);
      toast.error("Failed to update item");
    } finally {
      setIsEditing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle>Manage Content</CardTitle>
            <CardDescription>View, edit, or delete RAG content</CardDescription>
          </div>
          <div className="flex gap-2">
            <Select value={selectedNiche} onValueChange={setSelectedNiche}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by niche" />
              </SelectTrigger>
              <SelectContent>
                {NICHE_OPTIONS.map((niche) => (
                  <SelectItem key={niche.value} value={niche.value}>
                    {niche.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedTable} onValueChange={setSelectedTable}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TABLES.map((table) => (
                  <SelectItem key={table.value} value={table.value}>
                    {table.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No content found in this collection
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">Content Preview</TableHead>
                <TableHead>Niche</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Metadata</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <p className="line-clamp-2 text-sm">{item.content}</p>
                  </TableCell>
                  <TableCell>
                    {item.niche ? (
                      <Badge variant="default">{NICHE_OPTIONS.find(n => n.value === item.niche)?.label || item.niche}</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {item.source || "—"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {item.offer_type && <Badge variant="secondary">{item.offer_type}</Badge>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>View Content</DialogTitle>
                            <DialogDescription>
                              Source: {item.source || "Unknown"}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label>Content</Label>
                              <div className="mt-2 p-4 bg-muted rounded-lg whitespace-pre-wrap text-sm">
                                {item.content}
                              </div>
                            </div>
                            {item.quality_notes && (
                              <div>
                                <Label>Quality Notes</Label>
                                <p className="mt-1 text-sm text-muted-foreground">
                                  {item.quality_notes}
                                </p>
                              </div>
                            )}
                            <div className="flex flex-wrap gap-2">
                              {item.niche && <Badge>Niche: {item.niche}</Badge>}
                              {item.sub_niche && <Badge variant="secondary">Sub: {item.sub_niche}</Badge>}
                              {item.offer_type && <Badge variant="outline">Offer: {item.offer_type}</Badge>}
                              {item.topic_tags?.map((tag) => (
                                <Badge key={tag} variant="outline">{tag}</Badge>
                              ))}
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Dialog open={editItem?.id === item.id} onOpenChange={(open) => !open && setEditItem(null)}>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => setEditItem(item)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Edit Content</DialogTitle>
                          </DialogHeader>
                          {editItem && (
                            <div className="space-y-4">
                              <div>
                                <Label>Content</Label>
                                <Textarea
                                  className="min-h-[200px] mt-2"
                                  value={editItem.content}
                                  onChange={(e) => setEditItem({ ...editItem, content: e.target.value })}
                                />
                              </div>
                              <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                  <Label>Source</Label>
                                  <Input
                                    className="mt-2"
                                    value={editItem.source || ""}
                                    onChange={(e) => setEditItem({ ...editItem, source: e.target.value })}
                                  />
                                </div>
                                <div>
                                  <Label>Quality Notes</Label>
                                  <Input
                                    className="mt-2"
                                    value={editItem.quality_notes || ""}
                                    onChange={(e) => setEditItem({ ...editItem, quality_notes: e.target.value })}
                                  />
                                </div>
                              </div>
                              {(selectedTable === "rag_hooks" || selectedTable === "rag_body_sections") && (
                                <div className="grid gap-4 md:grid-cols-3">
                                  <div>
                                    <Label>Niche</Label>
                                    <Input
                                      className="mt-2"
                                      value={editItem.niche || ""}
                                      onChange={(e) => setEditItem({ ...editItem, niche: e.target.value })}
                                    />
                                  </div>
                                  <div>
                                    <Label>Sub-Niche</Label>
                                    <Input
                                      className="mt-2"
                                      value={editItem.sub_niche || ""}
                                      onChange={(e) => setEditItem({ ...editItem, sub_niche: e.target.value })}
                                    />
                                  </div>
                                  <div>
                                    <Label>Offer Type</Label>
                                    <Input
                                      className="mt-2"
                                      value={editItem.offer_type || ""}
                                      onChange={(e) => setEditItem({ ...editItem, offer_type: e.target.value })}
                                    />
                                  </div>
                                </div>
                              )}
                              <Button onClick={handleUpdate} disabled={isEditing} className="w-full">
                                {isEditing ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Updating...
                                  </>
                                ) : (
                                  "Save Changes"
                                )}
                              </Button>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Content</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this content? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(item.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
