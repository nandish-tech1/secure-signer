import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { getDocumentSignedUrl, sendForSignature } from "@/lib/documents.functions";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AppHeader } from "@/components/AppHeader";
import { PdfViewer } from "@/components/PdfViewer";
import { StatusBadge } from "./dashboard";
import { toast } from "sonner";
import { ArrowLeft, Copy, Download, Send, Trash2, UserPlus, MousePointerClick } from "lucide-react";

export const Route = createFileRoute("/_authenticated/documents/$id")({
  component: DocumentPage,
});

type Signer = {
  id: string;
  email: string;
  name: string | null;
  token: string;
  status: "pending" | "signed" | "rejected";
  signed_at: string | null;
  signed_ip: string | null;
  rejection_reason: string | null;
};
type Field = { id: string; signer_id: string; page: number; x_ratio: number; y_ratio: number; width_ratio: number; height_ratio: number };

function DocumentPage() {
  const { id } = Route.useParams();
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const getUrl = useServerFn(getDocumentSignedUrl);
  const sendFn = useServerFn(sendForSignature);

  const [activeSignerId, setActiveSignerId] = useState<string | null>(null);
  const [newSigner, setNewSigner] = useState({ email: "", name: "" });
  const [showAddSigner, setShowAddSigner] = useState(false);
  const [draftPos, setDraftPos] = useState<Record<string, { x: number; y: number }>>({});
  const dragRef = useRef<{
    fieldId: string;
    startClientX: number;
    startClientY: number;
    startX: number;
    startY: number;
    overlayW: number;
    overlayH: number;
    w: number;
    h: number;
    moved: boolean;
  } | null>(null);

  const docQ = useQuery({
    queryKey: ["doc", id],
    queryFn: async () => {
      const res = await getUrl({ data: { documentId: id, useSigned: true } });
      return res;
    },
  });

  const signersQ = useQuery({
    queryKey: ["signers", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("signers").select("*").eq("document_id", id).order("created_at");
      if (error) throw error;
      return data as Signer[];
    },
  });

  const fieldsQ = useQuery({
    queryKey: ["fields", id],
    queryFn: async () => {
      const signerIds = (signersQ.data ?? []).map((s) => s.id);
      if (!signerIds.length) return [] as Field[];
      const { data, error } = await supabase.from("signature_fields").select("*").in("signer_id", signerIds);
      if (error) throw error;
      return data as Field[];
    },
    enabled: !!signersQ.data,
  });

  const auditQ = useQuery({
    queryKey: ["audit", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("audit_logs").select("*").eq("document_id", id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!activeSignerId && signersQ.data?.[0]) setActiveSignerId(signersQ.data[0].id);
  }, [signersQ.data, activeSignerId]);

  async function addSigner(e: React.FormEvent) {
    e.preventDefault();
    if (!newSigner.email) return;
    const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "").slice(0, 8);
    const { error } = await supabase.from("signers").insert({
      document_id: id, email: newSigner.email, name: newSigner.name || null, token,
    });
    if (error) return toast.error(error.message);
    toast.success("Signer added");
    setNewSigner({ email: "", name: "" });
    setShowAddSigner(false);
    qc.invalidateQueries({ queryKey: ["signers", id] });
  }

  async function removeSigner(sid: string) {
    await supabase.from("signers").delete().eq("id", sid);
    qc.invalidateQueries({ queryKey: ["signers", id] });
    qc.invalidateQueries({ queryKey: ["fields", id] });
  }

  async function handlePageClick(page: number, dim: { width: number; height: number }, e: React.MouseEvent<HTMLDivElement>) {
    if (!activeSignerId) return toast.error("Add a signer first");
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const w = 0.22, h = 0.07;
    const { error } = await supabase.from("signature_fields").insert({
      signer_id: activeSignerId, page, x_ratio: Math.max(0, Math.min(1 - w, x - w / 2)), y_ratio: Math.max(0, Math.min(1 - h, y - h / 2)), width_ratio: w, height_ratio: h,
    });
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["fields", id] });
  }

  async function removeField(fid: string) {
    await supabase.from("signature_fields").delete().eq("id", fid);
    qc.invalidateQueries({ queryKey: ["fields", id] });
  }

  function onFieldPointerDown(
    e: React.PointerEvent<HTMLDivElement>,
    f: Field,
  ) {
    if (isCompleted) return;
    e.stopPropagation();
    e.preventDefault();
    const overlay = (e.currentTarget.parentElement as HTMLDivElement);
    const rect = overlay.getBoundingClientRect();
    dragRef.current = {
      fieldId: f.id,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startX: Number(f.x_ratio),
      startY: Number(f.y_ratio),
      overlayW: rect.width,
      overlayH: rect.height,
      w: Number(f.width_ratio),
      h: Number(f.height_ratio),
      moved: false,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onFieldPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const d = dragRef.current;
    if (!d) return;
    const dx = (e.clientX - d.startClientX) / d.overlayW;
    const dy = (e.clientY - d.startClientY) / d.overlayH;
    if (Math.abs(dx) + Math.abs(dy) > 0.002) d.moved = true;
    const nx = Math.max(0, Math.min(1 - d.w, d.startX + dx));
    const ny = Math.max(0, Math.min(1 - d.h, d.startY + dy));
    setDraftPos((p) => ({ ...p, [d.fieldId]: { x: nx, y: ny } }));
  }

  async function onFieldPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const d = dragRef.current;
    if (!d) return;
    dragRef.current = null;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
    const pos = draftPos[d.fieldId];
    if (d.moved && pos) {
      const { error } = await supabase
        .from("signature_fields")
        .update({ x_ratio: pos.x, y_ratio: pos.y })
        .eq("id", d.fieldId);
      if (error) toast.error(error.message);
      qc.invalidateQueries({ queryKey: ["fields", id] });
    }
    // suppress the synthetic click that would place a new field
    if (d.moved) {
      e.stopPropagation();
    }
  }

  async function sendDocument() {
    if (!signersQ.data?.length) return toast.error("Add at least one signer");
    if (!fieldsQ.data?.length) return toast.error("Place at least one signature field");
    await sendFn({ data: { documentId: id } });
    toast.success("Document sent — share signing links with each signer");
    qc.invalidateQueries({ queryKey: ["doc", id] });
  }

  function copyLink(token: string) {
    const url = `${window.location.origin}/sign/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Signing link copied");
  }

  async function deleteDocument() {
    if (!confirm("Delete this document permanently?")) return;
    await supabase.from("documents").delete().eq("id", id);
    toast.success("Deleted");
    navigate({ to: "/dashboard" });
  }

  const signerColors = useMemo(() => {
    const palette = ["#3b6fa0", "#9b59b6", "#16a085", "#e67e22", "#c0392b"];
    const map: Record<string, string> = {};
    (signersQ.data ?? []).forEach((s, i) => (map[s.id] = palette[i % palette.length]));
    return map;
  }, [signersQ.data]);

  const doc = docQ.data?.doc;
  const isCompleted = doc?.status === "completed";

  return (
    <div className="min-h-screen bg-background">
      <AppHeader email={user.email} />
      <main className="mx-auto max-w-7xl px-6 py-6">
        <Link to="/dashboard" className="text-sm text-muted-foreground inline-flex items-center gap-1 hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to documents
        </Link>

        <div className="flex items-end justify-between gap-4 mt-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{doc?.name ?? "Loading…"}</h1>
            <div className="flex items-center gap-2 mt-1">
              {doc && <StatusBadge status={doc.status as any} />}
              <span className="text-xs text-muted-foreground">{doc?.page_count} pages</span>
            </div>
          </div>
          <div className="flex gap-2">
            {isCompleted && (
              <a href={docQ.data?.url} target="_blank" rel="noreferrer">
                <Button variant="outline"><Download className="h-4 w-4" />Signed PDF</Button>
              </a>
            )}
            {!isCompleted && (
              <Button onClick={sendDocument}><Send className="h-4 w-4" />Mark as sent</Button>
            )}
            <Button variant="outline" onClick={deleteDocument}><Trash2 className="h-4 w-4" /></Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_360px] gap-6 mt-6">
          {/* PDF viewer with overlay */}
          <div className="bg-secondary rounded-lg p-6 overflow-auto">
            {docQ.data?.url ? (
              <div className="flex justify-center">
                <PdfViewer
                  fileUrl={docQ.data.url}
                  renderOverlay={(page, dim) => (
                    <div
                      className="absolute inset-0 cursor-crosshair"
                      onClick={(e) => !isCompleted && handlePageClick(page, dim, e)}
                      title={isCompleted ? "Signed" : "Click to place signature for selected signer"}
                    >
                      {(fieldsQ.data ?? []).filter((f) => f.page === page).map((f) => {
                        const signer = signersQ.data?.find((s) => s.id === f.signer_id);
                        const color = signerColors[f.signer_id] ?? "#3b6fa0";
                        const pos = draftPos[f.id];
                        const left = (pos?.x ?? Number(f.x_ratio)) * 100;
                        const top = (pos?.y ?? Number(f.y_ratio)) * 100;
                        return (
                          <div
                            key={f.id}
                            className={`absolute rounded border-2 flex items-center justify-center text-[10px] font-medium select-none ${isCompleted ? "" : "cursor-grab active:cursor-grabbing"}`}
                            style={{
                              left: `${left}%`,
                              top: `${top}%`,
                              width: `${f.width_ratio * 100}%`,
                              height: `${f.height_ratio * 100}%`,
                              borderColor: color,
                              background: `${color}20`,
                              color,
                              touchAction: "none",
                            }}
                            onPointerDown={(e) => onFieldPointerDown(e, f)}
                            onPointerMove={onFieldPointerMove}
                            onPointerUp={onFieldPointerUp}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="truncate px-1">{signer?.name || signer?.email}</span>
                            {!isCompleted && (
                              <button
                                className="absolute -top-2 -right-2 bg-card border border-border rounded-full h-4 w-4 text-[10px] leading-none"
                                onPointerDown={(ev) => ev.stopPropagation()}
                                onClick={(ev) => { ev.stopPropagation(); removeField(f.id); }}
                                aria-label="Remove field"
                              >×</button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                />
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Loading document…</div>
            )}
          </div>

          {/* Right panel: signers + audit */}
          <aside className="space-y-4">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-card-foreground">Signers</h3>
                {!isCompleted && (
                  <Button size="sm" variant="ghost" onClick={() => setShowAddSigner((s) => !s)}>
                    <UserPlus className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {showAddSigner && (
                <form onSubmit={addSigner} className="mt-3 space-y-2">
                  <Input placeholder="Email" type="email" required value={newSigner.email} onChange={(e) => setNewSigner((s) => ({ ...s, email: e.target.value }))} />
                  <Input placeholder="Name (optional)" value={newSigner.name} onChange={(e) => setNewSigner((s) => ({ ...s, name: e.target.value }))} />
                  <Button type="submit" size="sm" className="w-full">Add signer</Button>
                </form>
              )}

              <div className="mt-3 space-y-2">
                {(signersQ.data ?? []).length === 0 && (
                  <p className="text-xs text-muted-foreground">No signers yet. Add one to begin placing signature fields.</p>
                )}
                {(signersQ.data ?? []).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setActiveSignerId(s.id)}
                    className={`w-full text-left rounded-md border p-3 transition ${activeSignerId === s.id ? "border-accent bg-accent/5" : "border-border bg-card"}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="h-3 w-3 rounded-full shrink-0" style={{ background: signerColors[s.id] }} />
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{s.name || s.email}</div>
                          <div className="text-xs text-muted-foreground truncate">{s.email}</div>
                        </div>
                      </div>
                      <SignerStatusBadge status={s.status} />
                    </div>
                    <div className="mt-2 flex gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); copyLink(s.token); }}>
                        <Copy className="h-3 w-3" /> Copy link
                      </Button>
                      {!isCompleted && s.status === "pending" && (
                        <Button type="button" size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); removeSigner(s.id); }}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    {s.status === "rejected" && s.rejection_reason && (
                      <p className="text-xs text-destructive mt-2">Reason: {s.rejection_reason}</p>
                    )}
                  </button>
                ))}
              </div>

              {!isCompleted && activeSignerId && (
                <p className="text-xs text-muted-foreground mt-3 inline-flex items-center gap-1">
                  <MousePointerClick className="h-3 w-3" /> Click on the document to place a field for the selected signer.
                </p>
              )}
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold text-card-foreground">Audit trail</h3>
              <ul className="mt-3 space-y-2 text-xs">
                {(auditQ.data ?? []).map((a: any) => (
                  <li key={a.id} className="border-l-2 border-border pl-3">
                    <div className="font-medium text-foreground">{prettyAction(a.action)}</div>
                    <div className="text-muted-foreground">
                      {new Date(a.created_at).toLocaleString()}
                      {a.actor_email && ` · ${a.actor_email}`}
                      {a.ip && ` · ${a.ip}`}
                    </div>
                  </li>
                ))}
                {(auditQ.data ?? []).length === 0 && (
                  <li className="text-muted-foreground">No activity yet.</li>
                )}
              </ul>
            </Card>
          </aside>
        </div>
      </main>
    </div>
  );
}

function SignerStatusBadge({ status }: { status: Signer["status"] }) {
  const map = {
    pending: "bg-muted text-muted-foreground",
    signed: "bg-[oklch(0.62_0.15_155/_0.15)] text-[oklch(0.42_0.15_155)]",
    rejected: "bg-destructive/15 text-destructive",
  } as const;
  return <Badge variant="outline" className={`text-[10px] ${map[status]}`}>{status}</Badge>;
}

function prettyAction(a: string) {
  return ({
    "document.uploaded": "Document uploaded",
    "document.sent": "Sent for signature",
    "document.finalized": "Document finalized",
    "signer.viewed": "Signer viewed",
    "signer.signed": "Signer signed",
    "signer.rejected": "Signer rejected",
  } as Record<string, string>)[a] ?? a;
}