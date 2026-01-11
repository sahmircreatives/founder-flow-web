import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import ManualAddForm from "@/components/admin/rag/ManualAddForm";
import BulkImportForm from "@/components/admin/rag/BulkImportForm";
import RAGContentTable from "@/components/admin/rag/RAGContentTable";

export default function RAGAdmin() {
  const [activeTab, setActiveTab] = useState("manual");
  const [refreshKey, setRefreshKey] = useState(0);

  const handleContentAdded = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">RAG Content Manager</h1>
            <p className="text-muted-foreground">
              Manage script examples for AI-powered retrieval
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="manual">Manual Add</TabsTrigger>
            <TabsTrigger value="bulk">Bulk Import</TabsTrigger>
            <TabsTrigger value="manage">View/Manage</TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="space-y-6">
            <ManualAddForm onSuccess={handleContentAdded} />
          </TabsContent>

          <TabsContent value="bulk" className="space-y-6">
            <BulkImportForm onSuccess={handleContentAdded} />
          </TabsContent>

          <TabsContent value="manage" className="space-y-6">
            <RAGContentTable key={refreshKey} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
