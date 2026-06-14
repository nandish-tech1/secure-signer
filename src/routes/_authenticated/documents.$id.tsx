import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { getDocumentSignedUrl, sendForSignature } from "@/lib/documents.functions";
import { addSignersWithDetails } from "@/lib/add-signers.functions";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AppHeader } from "@/components/AppHeader";
import { PdfViewer } from "@/components/PdfViewer";
import { StatusBadge } from "./dashboard";
import { AddSignersModal, type SignerInput } from "@/components/AddSignersModal";
import { toast } from "sonner";
import { ArrowLeft, Copy, Download, Send, Trash2, UserPlus, MousePointerClick, Pen, FileSignature, CheckCircle2, Type as TypeIcon } from "lucide-react";

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
type FieldType = "signature" | "name" | "date" | "company_stamp" | "initials" | "checkbox" | "text";
type Field = { id: string; signer_id: string; page: number; x_ratio: number; y_ratio: number; width_ratio: number; height_ratio: number; field_type?: FieldType; label?: string };

function getFieldTypeLabel(type: FieldType): string {
  const labels: Record<FieldType, string> = {
    signature: "Signature",
    name: "Name",
    date: "Date",
    company_stamp: "Company Stamp",
    initials: "Initials",
    checkbox: "Checkbox",
    text: "Text Field",
  };
  return labels[type] || type;
}

function DocumentPage() {
  const { id } = Route.useParams();
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const getUrl = useServerFn(getDocumentSignedUrl);
  const sendFn = useServerFn(sendForSignature);
  const addSignersFn = useServerFn(addSignersWithDetails);

  const [activeSignerId, setActiveSignerId] = useState<string | null>(null);
  const [newSigner, setNewSigner] = useState({ email: "", name: "" });
  const [showAddSigner, setShowAddSigner] = useState(false);
  const [showBulkAddModal, setShowBulkAddModal] = useState(false);
  const [draftPos, setDraftPos] = useState<Record<string, { x: number; y: number }>>({});
  const [selectedFieldType, setSelectedFieldType] = useState<FieldType>("signature");
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
    const { data: inserted, error } = await supabase.from("signers").insert({
      document_id: id, email: newSigner.email, name: newSigner.name || null, token,
    }).select().single();
    if (error || !inserted) return toast.error(error?.message ?? "Failed to add signer");
    toast.success("Signer added");
    setNewSigner({ email: "", name: "" });
    setShowAddSigner(false);
    // select the newly added signer so the user can immediately place fields
    setActiveSignerId(inserted.id);
    // copy the signing link to clipboard so it's immediately available
    try {
      const url = `${window.location.origin}/sign/${inserted.token}`;
      await navigator.clipboard.writeText(url);
      toast.success("Signing link copied to clipboard");
    } catch (err) {
      // ignore clipboard failures
    }
    qc.invalidateQueries({ queryKey: ["signers", id] });
  }

  async function removeSigner(sid: string) {
    await supabase.from("signers").delete().eq("id", sid);
    qc.invalidateQueries({ queryKey: ["signers", id] });
    qc.invalidateQueries({ queryKey: ["fields", id] });
  }

  async function handleBulkAddSigners(signers: SignerInput[], signingMode: "ordered" | "parallel", expirationDays: number) {
    try {
      await addSignersFn({
        data: {
          documentId: id,
          signers,
          signingMode,
          expirationDays,
        }
      });
      toast.success(`Added ${signers.length} signer${signers.length !== 1 ? "s" : ""}`);
      setShowBulkAddModal(false);
      qc.invalidateQueries({ queryKey: ["signers", id] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add signers");
    }
  }

  async function handlePageClick(page: number, dim: { width: number; height: number }, e: React.MouseEvent<HTMLDivElement>) {
    if (!activeSignerId) return toast.error("Add a signer first");
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const w = 0.22, h = 0.07;
    const { error } = await supabase.from("signature_fields").insert({
      signer_id: activeSignerId, 
      page, 
      field_type: selectedFieldType,
      x_ratio: Math.max(0, Math.min(1 - w, x - w / 2)), 
      y_ratio: Math.max(0, Math.min(1 - h, y - h / 2)), 
      width_ratio: w, 
      height_ratio: h,
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
      <AddSignersModal
        open={showBulkAddModal}
        onOpenChange={setShowBulkAddModal}
        onApply={handleBulkAddSigners}
      />
      <AppHeader email={user.email} />
      <main className="mx-auto max-w-7xl px-6 py-6">
        <Link to="/dashboard" className="text-sm text-muted-foreground inline-flex items-center gap-1 hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to documents
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 sm:gap-4 mt-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground truncate">{doc?.name ?? "Loading…"}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {doc && <StatusBadge status={doc.status as any} />}
              <span className="text-xs text-muted-foreground">{doc?.page_count} pages</span>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {isCompleted && (
              <a href={docQ.data?.url} target="_blank" rel="noreferrer">
                <Button variant="outline" size="sm" className="whitespace-nowrap"><Download className="h-4 w-4" /><span className="hidden sm:inline ml-2">Signed PDF</span></Button>
              </a>
            )}
            {!isCompleted && (
              <Button onClick={sendDocument} size="sm" className="whitespace-nowrap"><Send className="h-4 w-4" /><span className="hidden sm:inline ml-2">Mark as sent</span></Button>
            )}
            <Button variant="outline" onClick={deleteDocument} size="sm" className="px-2"><Trash2 className="h-4 w-4" /></Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4 sm:gap-6 mt-4 sm:mt-6">
          {/* PDF viewer with overlay */}
          <div className="bg-secondary rounded-lg p-3 sm:p-6 overflow-hidden flex flex-col min-h-[600px] sm:min-h-auto">
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
                            className={`absolute rounded border-2 flex flex-col items-center justify-center text-[9px] font-medium select-none ${isCompleted ? "" : "cursor-grab active:cursor-grabbing"}`}
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
                            <span className="truncate px-1">{getFieldTypeLabel((f.field_type as FieldType) || "signature")}</span>
                            <span className="truncate px-1 text-[8px] opacity-75">{signer?.name || signer?.email}</span>
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

          {/* Right panel: signing options */}
          <aside className="space-y-3 sm:space-y-4 max-h-[calc(100vh-200px)] sm:max-h-none overflow-y-auto sm:overflow-visible pr-2 sm:pr-0">
            {/* Field Configuration Card */}
            <Card className="p-3 sm:p-4">
              <h3 className="font-semibold text-card-foreground text-sm sm:text-base mb-3 sm:mb-4">Field Configuration</h3>
              
              {/* Field Type Selection */}
              <div className="mb-3 sm:mb-4">
                <Label className="text-xs font-medium text-muted-foreground mb-2 block">Field type to add</Label>
                <div className="grid grid-cols-2 gap-2 sm:gap-2">
                  <button 
                    type="button"
                    onClick={() => setSelectedFieldType("signature")}
                    className={`flex flex-col items-center justify-center p-2 sm:p-3 border-2 rounded-lg transition text-xs sm:text-sm ${selectedFieldType === "signature" ? "border-accent bg-accent/10" : "border-border hover:bg-muted"}`}
                  >
                    <Pen className={`h-4 sm:h-5 w-4 sm:w-5 mb-1 ${selectedFieldType === "signature" ? "text-accent" : "text-muted-foreground"}`} />
                    <span className={`text-xs font-medium ${selectedFieldType === "signature" ? "text-accent" : "text-muted-foreground"}`}>Signature</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => setSelectedFieldType("name")}
                    className={`flex flex-col items-center justify-center p-2 sm:p-3 border-2 rounded-lg transition text-xs sm:text-sm ${selectedFieldType === "name" ? "border-accent bg-accent/10" : "border-border hover:bg-muted"}`}
                  >
                    <TypeIcon className={`h-4 sm:h-5 w-4 sm:w-5 mb-1 ${selectedFieldType === "name" ? "text-accent" : "text-muted-foreground"}`} />
                    <span className={`text-xs font-medium ${selectedFieldType === "name" ? "text-accent" : "text-muted-foreground"}`}>Name</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => setSelectedFieldType("date")}
                    className={`flex flex-col items-center justify-center p-2 sm:p-3 border-2 rounded-lg transition text-xs sm:text-sm ${selectedFieldType === "date" ? "border-accent bg-accent/10" : "border-border hover:bg-muted"}`}
                  >
                    <Pen className={`h-4 sm:h-5 w-4 sm:w-5 mb-1 ${selectedFieldType === "date" ? "text-accent" : "text-muted-foreground"}`} />
                    <span className={`text-xs font-medium ${selectedFieldType === "date" ? "text-accent" : "text-muted-foreground"}`}>Date</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => setSelectedFieldType("company_stamp")}
                    className={`flex flex-col items-center justify-center p-2 sm:p-3 border-2 rounded-lg transition text-xs sm:text-sm ${selectedFieldType === "company_stamp" ? "border-accent bg-accent/10" : "border-border hover:bg-muted"}`}
                  >
                    <FileSignature className={`h-4 sm:h-5 w-4 sm:w-5 mb-1 ${selectedFieldType === "company_stamp" ? "text-accent" : "text-muted-foreground"}`} />
                    <span className={`text-xs font-medium ${selectedFieldType === "company_stamp" ? "text-accent" : "text-muted-foreground"}`}>Stamp</span>
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Click on the document to place <span className="font-medium">{selectedFieldType}</span> field
                </p>
              </div>

              <hr className="my-3 sm:my-4" />

              {/* Signers Section */}
              <div className="mb-3 sm:mb-4">
                <Label className="text-xs font-medium text-muted-foreground mb-2 block">Signers</Label>
                <div className="space-y-2">
                  {(signersQ.data ?? []).length === 0 && (
                    <p className="text-xs text-muted-foreground">No signers added yet</p>
                  )}
                  {(signersQ.data ?? []).map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setActiveSignerId(s.id)}
                      className={`w-full flex items-center gap-2 p-2 rounded border transition ${activeSignerId === s.id ? "border-accent bg-accent/5" : "border-border hover:bg-muted"}`}
                    >
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: signerColors[s.id] }} />
                      <div className="text-left min-w-0 flex-1">
                        <div className="text-xs font-medium truncate">{s.name || s.email}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <SignerStatusBadge status={s.status} />
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); copyLink(s.token); }}
                          title="Copy signing link"
                          className="inline-flex items-center justify-center p-1 rounded hover:bg-muted"
                        >
                          <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      </div>
                    </button>
                  ))}
                  {!isCompleted && (signersQ.data ?? []).length > 0 && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="w-full mt-2"
                      onClick={() => setShowBulkAddModal(true)}
                    >
                      <UserPlus className="h-3 w-3 mr-1" /> Add more signers
                    </Button>
                  )}
                </div>
              </div>

              {/* Required Fields */}
              <div className="mb-3 sm:mb-4">
                <Label className="text-xs font-medium text-muted-foreground mb-2 block">Placed fields</Label>
                <div className="space-y-1">
                  {(fieldsQ.data ?? []).length === 0 ? (
                    <p className="text-xs text-muted-foreground">Select a field type above and click on the document to place it</p>
                  ) : (
                    (fieldsQ.data ?? []).map((f) => {
                      const signer = signersQ.data?.find((s) => s.id === f.signer_id);
                      return (
                        <div key={f.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded text-xs">
                          <CheckCircle2 className="h-3 w-3 text-accent shrink-0" />
                          <span className="flex-1">
                            <span className="font-medium">{getFieldTypeLabel((f.field_type as FieldType) || "signature")}</span> - <span className="font-medium">{signer?.name || signer?.email}</span> (Page {f.page})
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeField(f.id);
                            }}
                            className="text-destructive hover:opacity-70"
                          >
                            ×
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Optional Fields */}
              <div className="mb-3 sm:mb-4">
                <Label className="text-xs font-medium text-muted-foreground mb-2 block">Optional fields</Label>
                <p className="text-xs text-muted-foreground">No optional fields added</p>
              </div>

              {/* Send Button */}
              {!isCompleted && (signersQ.data ?? []).length > 0 && (fieldsQ.data ?? []).length > 0 && (
                <Button 
                  onClick={sendDocument} 
                  className="w-full bg-red-600 hover:bg-red-700 text-white"
                  size="lg"
                >
                  <Send className="h-4 w-4 mr-2" /> Send to Sign
                </Button>
              )}

              {/* Placeholder for add signers button */}
              {(signersQ.data ?? []).length === 0 && !isCompleted && (
                <Button 
                  onClick={() => setShowBulkAddModal(true)} 
                  className="w-full"
                  variant="default"
                >
                  <UserPlus className="h-4 w-4 mr-2" /> Add Signers
                </Button>
              )}
            </Card>

            {/* Audit Trail Card */}
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

      {/* Bulk add signers modal */}
      <AddSignersModal
        open={showBulkAddModal}
        onOpenChange={setShowBulkAddModal}
        onApply={handleBulkAddSigners}
      />
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