import { useState, useEffect, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Trash2, Upload, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD ?? "admin";

// ---------------------------------------------------------------------------
// Password gate
// ---------------------------------------------------------------------------

function PasswordGate({ onAuth }: { onAuth: () => void }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState(false);

  const submit = () => {
    if (pw === ADMIN_PASSWORD) {
      sessionStorage.setItem("admin_authed", "1");
      onAuth();
    } else {
      setError(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-4 p-8 rounded-2xl border border-border bg-card">
        <h1 className="text-xl font-bold">Admin Access</h1>
        <div className="space-y-2">
          <Label htmlFor="pw">Password</Label>
          <Input
            id="pw"
            type="password"
            value={pw}
            onChange={(e) => {
              setPw(e.target.value);
              setError(false);
            }}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Enter admin password"
          />
          {error && (
            <p className="text-xs text-destructive">Incorrect password</p>
          )}
        </div>
        <Button className="w-full" onClick={submit}>
          Enter
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Person {
  id: string;
  name: string;
  follower_count: string;
  verified: boolean;
  photo_url: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Add Person form
// ---------------------------------------------------------------------------

function AddPersonForm({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [followerCount, setFollowerCount] = useState("");
  const [verified, setVerified] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const pickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const reset = () => {
    setName("");
    setFollowerCount("");
    setVerified(false);
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const save = async () => {
    if (!name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      let photo_url: string | null = null;
      if (photoFile) {
        const ext = photoFile.name.split(".").pop();
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("profile-photos")
          .upload(path, photoFile);
        if (uploadError) throw uploadError;
        const { data } = supabase.storage
          .from("profile-photos")
          .getPublicUrl(path);
        photo_url = data.publicUrl;
      }
      const { error } = await supabase.from("connected_with").insert({
        name: name.trim(),
        follower_count: followerCount.trim(),
        verified,
        photo_url,
      });
      if (error) throw error;
      toast({ title: "Person added" });
      reset();
      onSuccess();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-md space-y-6">
      {/* Photo upload */}
      <div className="space-y-2">
        <Label>Profile Photo</Label>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-16 h-16 rounded-full border-2 border-dashed border-border bg-muted flex items-center justify-center overflow-hidden shrink-0 hover:border-primary/50 transition-colors"
          >
            {photoPreview ? (
              <img
                src={photoPreview}
                alt="preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <Upload className="w-5 h-5 text-muted-foreground" />
            )}
          </button>
          <span className="text-sm text-muted-foreground">
            {photoFile ? photoFile.name : "Click to upload a photo"}
          </span>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={pickFile}
        />
      </div>

      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Marcus Lee"
        />
      </div>

      {/* Follower count / role */}
      <div className="space-y-2">
        <Label htmlFor="followers">Follower Count / Role</Label>
        <Input
          id="followers"
          value={followerCount}
          onChange={(e) => setFollowerCount(e.target.value)}
          placeholder="e.g. 850K subs"
        />
      </div>

      {/* Verified toggle */}
      <div className="flex items-center gap-3">
        <Switch
          id="verified"
          checked={verified}
          onCheckedChange={setVerified}
        />
        <Label htmlFor="verified">Verified</Label>
      </div>

      <Button onClick={save} disabled={saving}>
        {saving ? "Saving..." : "Add Person"}
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Manage table
// ---------------------------------------------------------------------------

function ManageTable() {
  const { toast } = useToast();
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("connected_with")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          toast({
            title: "Failed to load",
            description: error.message,
            variant: "destructive",
          });
        } else {
          setPeople(data ?? []);
        }
        setLoading(false);
      });
  }, []);

  const deletePerson = async (person: Person) => {
    if (!confirm(`Delete ${person.name}?`)) return;

    if (person.photo_url) {
      const parts = person.photo_url.split("/profile-photos/");
      const path = parts[1];
      if (path) {
        await supabase.storage.from("profile-photos").remove([path]);
      }
    }

    const { error } = await supabase
      .from("connected_with")
      .delete()
      .eq("id", person.id);

    if (error) {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setPeople((prev) => prev.filter((p) => p.id !== person.id));
      toast({ title: "Deleted" });
    }
  };

  if (loading) {
    return <p className="text-muted-foreground text-sm">Loading...</p>;
  }

  if (!people.length) {
    return (
      <p className="text-muted-foreground text-sm">No people added yet.</p>
    );
  }

  return (
    <div className="space-y-3 max-w-lg">
      {people.map((p) => (
        <div
          key={p.id}
          className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card"
        >
          <div className="w-10 h-10 rounded-full bg-muted overflow-hidden shrink-0">
            {p.photo_url ? (
              <img
                src={p.photo_url}
                alt={p.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs font-semibold text-muted-foreground">
                {p.name
                  .split(" ")
                  .slice(0, 2)
                  .map((w) => w[0])
                  .join("")
                  .toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold truncate">{p.name}</span>
              {p.verified && (
                <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              {p.follower_count}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => deletePerson(p)}
          >
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ConnectionsAdmin() {
  const [authed, setAuthed] = useState(
    sessionStorage.getItem("admin_authed") === "1"
  );
  const [activeTab, setActiveTab] = useState("add");
  const [refreshKey, setRefreshKey] = useState(0);

  if (!authed) return <PasswordGate onAuth={() => setAuthed(true)} />;

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
            <h1 className="text-3xl font-bold">Connections Manager</h1>
            <p className="text-muted-foreground">
              Manage the Connected With section
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-xs grid-cols-2">
            <TabsTrigger value="add">Add Person</TabsTrigger>
            <TabsTrigger value="manage">Manage</TabsTrigger>
          </TabsList>

          <TabsContent value="add" className="space-y-6">
            <AddPersonForm
              onSuccess={() => {
                setRefreshKey((k) => k + 1);
                setActiveTab("manage");
              }}
            />
          </TabsContent>

          <TabsContent value="manage" className="space-y-6">
            <ManageTable key={refreshKey} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
