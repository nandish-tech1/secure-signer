import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { getDocumentSignedUrl, finalizeIfComplete } from "@/lib/documents.functions";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppHeader } from "@/components/AppHeader";
import { PdfViewer } from "@/components/PdfViewer";
import { SignaturePad } from "@/components/SignaturePad";
import { SignatureDetailsDialog, type SignatureDetails } from "@/components/SignatureDetailsDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowLeft, Pen, Type, User, Calendar as CalendarIcon, FileText, Trash2, CheckCircle2, GripVertical } from "lucide-react";

export const Route = createFileRoute("/_authenticated/documents/$id/self-sign")({
  component: SelfSignPage,
});

type FieldType = "signature" | "initials" | "name" | "date" | "text";
type Field = {
  id: string;
  signer_id: string;
  page: number;
  x_ratio: number;
  y_ratio: number;
  width_ratio: number;
  height_ratio: number;
  field_type: FieldType;
  value: string | null;
};

const FIELD_DEFS: { type: FieldType; label: string; icon: any; w: number; h: number }[] = [
  { type: "signature", label: "Signature", icon: Pen, w: 0.22, h: 0.07 },
  { type: "initials", label: "Initials", icon: Pen, w: 0.1, h: 0.06 },
  { type: "name", label: "Name", icon: User, w: 0.2, h: 0.05 },
  { type: "date", label: "Date", icon: CalendarIcon, w: 0.14, h: 0.05 },
  { type: "text", label: "Text", icon: Type, w: 0.2, h: 0.05 },
];

function SelfSignPage() {
  const { id } = Route.useParams();
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const getUrl = useServerFn(getDocumentSignedUrl);
  const finalize = useServerFn(finalizeIfComplete);

  const defaultName = (user.user_metadata?.full_name as string | undefined) ?? user.email ?? "Me";
  const [fullName, setFullName] = useState(defaultName);
  const [initials, setInitials] = useState(makeInitials(defaultName));
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [initialsDataUrl, setInitialsDataUrl] = useState<string | null>(null);
  const [showPad, setShowPad] = useState(false);
  const [showDetails, setShowDetails] = useState(true);
  const [submitting, setSubmitting] = useState(false);
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
    queryFn: async () => getUrl({ data: { documentId: id, useSigned: true } }),
  });

  const signerQ = useQuery({
    queryKey: ["self-signer", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("signers").select("*").eq("document_id", id).order("created_at").limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const fieldsQ = useQuery({
    queryKey: ["fields", id],
    queryFn: async () => {
      const sid = signerQ.data?.id;
      if (!sid) return [] as Field[];
      const { data, error } = await supabase.from("signature_fields").select("*").eq("signer_id", sid);
      if (error) throw error;
      return (data ?? []) as Field[];
    },
    enabled: !!signerQ.data?.id,
  });

  const doc = docQ.data?.doc;
  const isCompleted = doc?.status === "completed";

  async function addFieldAt(type: FieldType, page: number, xRatio: number, yRatio: number) {
    if (!signerQ.data?.id) return;
    const def = FIELD_DEFS.find((d) => d.type === type)!;
    const w = def.w, h = def.h;
    const value =
      type === "name" ? fullName :
      type === "initials" ? (initialsDataUrl ?? initials) :
      type === "date" ? new Date().toLocaleDateString() :
      type === "text" ? "" : null;
    const { error } = await supabase.from("signature_fields").insert({
      signer_id: signerQ.data.id,
      page,
      x_ratio: Math.max(0, Math.min(1 - w, xRatio - w / 2)),
      y_ratio: Math.max(0, Math.min(1 - h, yRatio - h / 2)),
      width_ratio: w,
      height_ratio: h,
      field_type: type,
      value,
    });
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["fields", id] });
  }

  async function removeField(fid: string) {
    await supabase.from("signature_fields").delete().eq("id", fid);
    qc.invalidateQueries({ queryKey: ["fields", id] });
  }

  async function updateFieldValue(fid: string, value: string) {
    await supabase.from("signature_fields").update({ value }).eq("id", fid);
    qc.invalidateQueries({ queryKey: ["fields", id] });
  }

  function onFieldPointerDown(e: React.PointerEvent<HTMLDivElement>, f: Field) {
    if (isCompleted) return;
    e.stopPropagation();
    e.preventDefault();
    const overlay = e.currentTarget.parentElement as HTMLDivElement;
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
    if (d.moved) e.stopPropagation();
  }

  async function handleSign() {
    if (!signerQ.data?.id) return;
    const fields = fieldsQ.data ?? [];
    if (!fields.length) return toast.error("Drop at least one field onto the document first.");
    const needsSig = fields.some((f) => f.field_type === "signature" || f.field_type === "initials");
    if (needsSig && !signatureDataUrl) {
      setShowPad(true);
      return;
    }
    setSubmitting(true);
    try {
      // Update value-bearing fields with current name/initials/date
      for (const f of fields) {
        if (f.field_type === "name" && (f.value ?? "") !== fullName) {
          await supabase.from("signature_fields").update({ value: fullName }).eq("id", f.id);
        } else if (f.field_type === "initials" && (f.value ?? "") !== initials) {
          await supabase.from("signature_fields").update({ value: initials }).eq("id", f.id);
        }
      }
      const { error: sErr } = await supabase
        .from("signers")
        .update({
          name: fullName,
          status: "signed",
          signed_at: new Date().toISOString(),
          signature_data: signatureDataUrl,
        })
        .eq("id", signerQ.data.id);
      if (sErr) throw sErr;
      await supabase.from("audit_logs").insert({
        document_id: id,
        actor_email: user.email ?? null,
        signer_id: signerQ.data.id,
        action: "signer.signed",
      });
      await finalize({ data: { documentId: id } });
      toast.success("Document signed");
      navigate({ to: "/documents/$id", params: { id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to sign");
    } finally {
      setSubmitting(false);
    }
  }

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
            <p className="text-xs text-muted-foreground mt-1">Drag fields from the right panel onto the document, then click Sign.</p>
          </div>
          <Button onClick={handleSign} disabled={submitting || isCompleted}>
            <CheckCircle2 className="h-4 w-4" />{submitting ? "Signing…" : "Sign"}
          </Button>
        </div>

        <div className="grid lg:grid-cols-[1fr_320px] gap-6 mt-6">
          <div className="bg-secondary rounded-lg p-6 overflow-auto">
            {docQ.data?.url ? (
              <div className="flex justify-center">
                <PdfViewer
                  fileUrl={docQ.data.url}
                  renderOverlay={(page, _dim) => (
                    <div
                      className="absolute inset-0"
                      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const type = e.dataTransfer.getData("application/x-field-type") as FieldType;
                        if (!type) return;
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = (e.clientX - rect.left) / rect.width;
                        const y = (e.clientY - rect.top) / rect.height;
                        addFieldAt(type, page, x, y);
                      }}
                    >
                      {(fieldsQ.data ?? []).filter((f) => f.page === page).map((f) => {
                        const pos = draftPos[f.id];
                        const left = (pos?.x ?? Number(f.x_ratio)) * 100;
                        const top = (pos?.y ?? Number(f.y_ratio)) * 100;
                        const isSig = f.field_type === "signature";
                        const showText = !isSig;
                        const display =
                          f.field_type === "signature" ? null :
                          f.field_type === "initials" ? initials :
                          f.field_type === "name" ? fullName :
                          f.field_type === "date" ? (f.value || new Date().toLocaleDateString()) :
                          (f.value || "Text");
                        return (
                          <div
                            key={f.id}
                            className={`absolute rounded border-2 border-accent bg-accent/10 text-accent flex items-center justify-center text-[11px] font-medium select-none ${isCompleted ? "" : "cursor-grab active:cursor-grabbing"}`}
                            style={{
                              left: `${left}%`,
                              top: `${top}%`,
                              width: `${Number(f.width_ratio) * 100}%`,
                              height: `${Number(f.height_ratio) * 100}%`,
                              touchAction: "none",
                            }}
                            onPointerDown={(e) => onFieldPointerDown(e, f)}
                            onPointerMove={onFieldPointerMove}
                            onPointerUp={onFieldPointerUp}
                          >
                            {isSig && signatureDataUrl ? (
                              <img src={signatureDataUrl} alt="sig" className="max-h-full max-w-full object-contain pointer-events-none" />
                            ) : isSig ? (
                              <span className="opacity-70">Signature</span>
                            ) : (
                              <span className="truncate px-1 text-foreground">{display}</span>
                            )}
                            {!isCompleted && (
                              <button
                                type="button"
                                className="absolute -top-2 -right-2 bg-card border border-border rounded-full h-4 w-4 text-[10px] leading-none"
                                onPointerDown={(ev) => ev.stopPropagation()}
                                onClick={(ev) => { ev.stopPropagation(); removeField(f.id); }}
                                aria-label="Remove"
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

          <aside className="space-y-4">
            <Card className="p-4">
              <h3 className="font-semibold text-card-foreground">Your details</h3>
              <div className="mt-3 space-y-3">
                <div>
                  <Label className="text-xs">Full name</Label>
                  <Input value={fullName} onChange={(e) => { setFullName(e.target.value); setInitials(makeInitials(e.target.value)); }} />
                </div>
                <div>
                  <Label className="text-xs">Initials</Label>
                  <Input value={initials} onChange={(e) => setInitials(e.target.value)} />
                </div>
                <Button type="button" variant="outline" className="w-full" onClick={() => setShowPad(true)}>
                  <Pen className="h-4 w-4" />{signatureDataUrl ? "Change signature" : "Create signature"}
                </Button>
                {signatureDataUrl && (
                  <div className="rounded-md border border-border bg-card p-2">
                    <img src={signatureDataUrl} alt="Your signature" className="h-12 mx-auto" />
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold text-card-foreground">Fields</h3>
              <p className="text-xs text-muted-foreground mt-1">Drag a field onto the document.</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {FIELD_DEFS.map((d) => {
                  const Icon = d.icon;
                  return (
                    <div
                      key={d.type}
                      draggable
                      onDragStart={(e) => { e.dataTransfer.setData("application/x-field-type", d.type); e.dataTransfer.effectAllowed = "copy"; }}
                      className="rounded-md border border-border bg-card hover:border-accent hover:bg-accent/5 transition p-3 flex items-center gap-2 cursor-grab active:cursor-grabbing"
                      title={`Drag ${d.label} onto the document`}
                    >
                      <GripVertical className="h-3 w-3 text-muted-foreground" />
                      <Icon className="h-4 w-4 text-accent" />
                      <span className="text-sm">{d.label}</span>
                    </div>
                  );
                })}
              </div>
            </Card>

            {(fieldsQ.data ?? []).some((f) => f.field_type === "text") && (
              <Card className="p-4">
                <h3 className="font-semibold text-card-foreground">Text fields</h3>
                <div className="mt-3 space-y-2">
                  {(fieldsQ.data ?? []).filter((f) => f.field_type === "text").map((f) => (
                    <Input
                      key={f.id}
                      placeholder="Enter text"
                      defaultValue={f.value ?? ""}
                      onBlur={(e) => updateFieldValue(f.id, e.target.value)}
                    />
                  ))}
                </div>
              </Card>
            )}
          </aside>
        </div>
      </main>

      <Dialog open={showPad} onOpenChange={setShowPad}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Set your signature</DialogTitle>
          </DialogHeader>
          <SignaturePad
            onComplete={(r) => {
              setSignatureDataUrl(r.dataUrl);
              setShowPad(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function makeInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 4);
}