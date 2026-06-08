import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Upload, FileText, Loader2, User, Users } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

type Doc = {
  id: string;
  name: string;
  status: "draft" | "sent" | "completed" | "cancelled";
  created_at: string;
  page_count: number;
};

function Dashboard() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [filter, setFilter] = useState<"all" | "draft" | "sent" | "completed">("all");
  const [chooserDocId, setChooserDocId] = useState<string | null>(null);

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["documents", filter],
    queryFn: async () => {
      let q = supabase.from("documents").select("*").order("created_at", { ascending: false });
      if (filter !== "all") q = q.eq("status", filter);
      const { data, error } = await q;
      if (error) throw error;
      return data as Doc[];
    },
  });

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.type !== "application/pdf") return toast.error("Only PDF files are supported");
    if (file.size > 20 * 1024 * 1024) return toast.error("Max file size is 20MB");

    setUploading(true);
    try {
      // Determine page count via pdf-lib in browser
      const { PDFDocument } = await import("pdf-lib");
      const buf = await file.arrayBuffer();
      const pdf = await PDFDocument.load(buf);
      const pageCount = pdf.getPageCount();

      const id = crypto.randomUUID();
      const path = `${user.id}/originals/${id}.pdf`;
      const { error: upErr } = await supabase.storage
        .from("documents")
        .upload(path, file, { contentType: "application/pdf" });
      if (upErr) throw upErr;

      const { error: insErr } = await supabase.from("documents").insert({
        id,
        owner_id: user.id,
        name: file.name,
        original_path: path,
        page_count: pageCount,
      });
      if (insErr) throw insErr;

      await supabase.from("audit_logs").insert({
        document_id: id,
        actor_email: user.email ?? null,
        action: "document.uploaded",
        metadata: { name: file.name, size: file.size },
      });

      toast.success("Document uploaded");
      qc.invalidateQueries({ queryKey: ["documents"] });
      setChooserDocId(id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function chooseOnlyMe() {
    if (!chooserDocId) return;
    const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "").slice(0, 8);
    // Create the signer as the current user (idempotent: only if none exists)
    const { data: existing } = await supabase.from("signers").select("id").eq("document_id", chooserDocId).limit(1);
    if (!existing?.length) {
      const { error } = await supabase.from("signers").insert({
        document_id: chooserDocId,
        email: user.email ?? "self@local",
        name: (user.user_metadata?.full_name as string | undefined) ?? user.email ?? "Me",
        token,
      });
      if (error) return toast.error(error.message);
    }
    const id = chooserDocId;
    setChooserDocId(null);
    navigate({ to: "/documents/$id/self-sign", params: { id } });
  }

  function chooseSeveralPeople() {
    if (!chooserDocId) return;
    const id = chooserDocId;
    setChooserDocId(null);
    navigate({ to: "/documents/$id", params: { id } });
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader email={user.email} />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Documents</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage uploads, signers, and signed PDFs.</p>
          </div>
          <label>
            <input type="file" accept="application/pdf" className="sr-only" onChange={handleUpload} disabled={uploading} />
            <Button asChild>
              <span className="cursor-pointer">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploading ? "Uploading…" : "Upload PDF"}
              </span>
            </Button>
          </label>
        </div>

        <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)} className="mt-8">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="draft">Draft</TabsTrigger>
            <TabsTrigger value="sent">Sent</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="mt-6 grid gap-3">
          {isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
          {!isLoading && docs.length === 0 && (
            <Card className="p-10 text-center text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto opacity-50" />
              <p className="mt-3 text-sm">No documents yet. Upload your first PDF to begin.</p>
            </Card>
          )}
          {docs.map((d) => (
            <Link key={d.id} to="/documents/$id" params={{ id: d.id }}>
              <Card className="p-4 hover:shadow-md transition-shadow flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="h-5 w-5 text-accent shrink-0" />
                  <div className="min-w-0">
                    <div className="font-medium text-card-foreground truncate">{d.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {d.page_count} page{d.page_count !== 1 && "s"} · {new Date(d.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <StatusBadge status={d.status} />
              </Card>
            </Link>
          ))}
        </div>
      </main>

      <Dialog open={!!chooserDocId} onOpenChange={(o) => !o && setChooserDocId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Who will sign this document?</DialogTitle>
            <DialogDescription>Choose how you want to proceed.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={chooseOnlyMe}
              className="rounded-lg border border-border bg-card hover:border-accent hover:bg-accent/5 transition p-5 text-left flex flex-col items-center gap-2"
            >
              <div className="h-12 w-12 rounded-full bg-accent/10 text-accent flex items-center justify-center">
                <User className="h-6 w-6" />
              </div>
              <div className="font-medium">Only me</div>
              <div className="text-xs text-muted-foreground text-center">Sign this document yourself</div>
            </button>
            <button
              type="button"
              onClick={chooseSeveralPeople}
              className="rounded-lg border border-border bg-card hover:border-accent hover:bg-accent/5 transition p-5 text-left flex flex-col items-center gap-2"
            >
              <div className="h-12 w-12 rounded-full bg-accent/10 text-accent flex items-center justify-center">
                <Users className="h-6 w-6" />
              </div>
              <div className="font-medium">Several people</div>
              <div className="text-xs text-muted-foreground text-center">Invite others to sign</div>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function StatusBadge({ status }: { status: Doc["status"] }) {
  const map = {
    draft: { label: "Draft", className: "bg-muted text-muted-foreground" },
    sent: { label: "Sent", className: "bg-accent/15 text-accent border-accent/30" },
    completed: { label: "Completed", className: "bg-[oklch(0.62_0.15_155/_0.15)] text-[oklch(0.42_0.15_155)] border-[oklch(0.62_0.15_155/_0.3)]" },
    cancelled: { label: "Cancelled", className: "bg-destructive/15 text-destructive border-destructive/30" },
  } as const;
  const cfg = map[status];
  return <Badge variant="outline" className={cfg.className}>{cfg.label}</Badge>;
}