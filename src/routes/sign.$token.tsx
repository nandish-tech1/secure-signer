import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getSignerByToken, submitSignature, rejectSignature } from "@/lib/public-sign.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PdfViewer } from "@/components/PdfViewer";
import { SignaturePad } from "@/components/SignaturePad";
import { toast } from "sonner";
import { CheckCircle2, FileSignature, XCircle, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/sign/$token")({
  ssr: false,
  head: () => ({ meta: [{ title: "Sign document — SignTrust" }] }),
  component: SignPage,
});

type State = Awaited<ReturnType<typeof getSignerByToken>> | null;
type FieldType = "signature" | "name" | "date" | "company_stamp" | "initials" | "checkbox" | "text";
type FieldValue = { fieldId: string; type: FieldType; value: string | { dataUrl: string; typed?: string } };

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

function SignPage() {
  const { token } = Route.useParams();
  const getFn = useServerFn(getSignerByToken);
  const submitFn = useServerFn(submitSignature);
  const rejectFn = useServerFn(rejectSignature);
  const [state, setState] = useState<State>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPad, setShowPad] = useState(false);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [typed, setTyped] = useState<string | undefined>();
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getFn({ data: { token } })
      .then((r) => setState(r))
      .catch((e) => setError(e.message ?? "Invalid link"));
  }, [token, getFn]);

  async function handleSubmit() {
    if (!signatureUrl) return toast.error("Please add your signature first");
    setSubmitting(true);
    try {
      await submitFn({ data: { token, signatureDataUrl: signatureUrl, typed } });
      toast.success("Signed successfully");
      const r = await getFn({ data: { token } });
      setState(r);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReject() {
    if (!reason.trim()) return toast.error("Please provide a reason");
    setSubmitting(true);
    try {
      await rejectFn({ data: { token, reason } });
      const r = await getFn({ data: { token } });
      setState(r);
      setRejectOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setSubmitting(false); }
  }

  if (error) {
    return (
      <CenteredCard>
        <XCircle className="h-10 w-10 text-destructive mx-auto" />
        <h1 className="text-xl font-semibold mt-3">Link invalid</h1>
        <p className="text-sm text-muted-foreground mt-2">{error}</p>
      </CenteredCard>
    );
  }
  if (!state) return <CenteredCard><p className="text-sm text-muted-foreground">Loading…</p></CenteredCard>;

  if (state.signer.status === "signed") {
    return (
      <CenteredCard>
        <CheckCircle2 className="h-10 w-10 text-[oklch(0.62_0.15_155)] mx-auto" />
        <h1 className="text-xl font-semibold mt-3">You've signed this document</h1>
        <p className="text-sm text-muted-foreground mt-2">Signed on {state.signer.signed_at && new Date(state.signer.signed_at).toLocaleString()}.</p>
      </CenteredCard>
    );
  }
  if (state.signer.status === "rejected") {
    return (
      <CenteredCard>
        <XCircle className="h-10 w-10 text-destructive mx-auto" />
        <h1 className="text-xl font-semibold mt-3">You rejected this document</h1>
        {state.signer.rejection_reason && <p className="text-sm text-muted-foreground mt-2">Reason: {state.signer.rejection_reason}</p>}
      </CenteredCard>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background sticky top-0 z-30">
        <div className="mx-auto max-w-6xl px-3 sm:px-6 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-semibold text-foreground text-sm sm:text-base">
            <FileSignature className="h-5 w-5 text-accent" /> <span className="hidden sm:inline">SignTrust</span>
          </div>
          <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
            <ShieldCheck className="h-3 w-3" /> <span className="hidden sm:inline">Secure signing session</span>
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-3 sm:px-6 py-4 sm:py-6">
        <div className="mb-4">
          <h1 className="text-lg sm:text-xl font-semibold text-foreground truncate">{state.document.name}</h1>
          <p className="text-xs sm:text-sm text-muted-foreground truncate">Signing as {state.signer.email}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 sm:gap-6">
          <div className="bg-secondary rounded-lg p-3 sm:p-6 overflow-hidden flex flex-col">
            <div className="flex justify-center flex-1">
              <PdfViewer
                fileUrl={state.fileUrl}
                renderOverlay={(page) => (
                  <div className="absolute inset-0 pointer-events-none">
                    {state.fields.filter((f) => f.page === page).map((f) => {
                      const fieldType = (f.field_type as FieldType) || "signature";
                      const value = fieldValues[f.id];
                      const isFilled = fieldType === "signature" ? signatureUrl : value;
                      return (
                        <div
                          key={f.id}
                          className={`absolute rounded border-2 flex items-center justify-center text-[10px] font-medium overflow-hidden ${
                            isFilled ? "border-green-500 bg-green-500/10" : "border-accent bg-accent/15"
                          }`}
                          style={{ left: `${f.x_ratio * 100}%`, top: `${f.y_ratio * 100}%`, width: `${f.width_ratio * 100}%`, height: `${f.height_ratio * 100}%` }}
                        >
                          {fieldType === "signature" && signatureUrl ? (
                            <img src={signatureUrl} alt="Signature" className="h-full w-full object-contain" />
                          ) : (
                            <span className="text-center text-muted-foreground">{getFieldTypeLabel(fieldType)}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              />
            </div>
          </div>

          <aside className="space-y-3 sm:space-y-4 max-h-[calc(100vh-200px)] sm:max-h-none overflow-y-auto sm:overflow-visible pr-2 sm:pr-0">
            {/* Fields to fill */}
            <Card className="p-3 sm:p-4 space-y-3">
              <h3 className="font-semibold text-card-foreground text-sm sm:text-base">Fields to complete</h3>
              <div className="space-y-3 sm:space-y-4">
                {state.fields.map((f) => {
                  const fieldType = (f.field_type as FieldType) || "signature";
                  const value = fieldValues[f.id];
                  
                  if (fieldType === "signature") {
                    return (
                      <div key={f.id} className="space-y-2">
                        <Label className="text-xs font-medium">Signature (Page {f.page})</Label>
                        {signatureUrl ? (
                          <>
                            <img src={signatureUrl} alt="Signature preview" className="h-12 sm:h-16 object-contain bg-secondary rounded border border-border" />
                            <Button variant="outline" size="sm" className="w-full text-xs sm:text-sm" onClick={() => setShowPad(true)}>Change</Button>
                          </>
                        ) : (
                          <Button className="w-full text-xs sm:text-sm" onClick={() => setShowPad(true)}>Add Signature</Button>
                        )}
                      </div>
                    );
                  } else if (fieldType === "name") {
                    return (
                      <div key={f.id} className="space-y-2">
                        <Label htmlFor={`field-${f.id}`} className="text-xs font-medium">Name (Page {f.page})</Label>
                        <Input
                          id={`field-${f.id}`}
                          placeholder="Enter your full name"
                          value={value || ""}
                          onChange={(e) => setFieldValues({ ...fieldValues, [f.id]: e.target.value })}
                          className="text-xs sm:text-sm"
                        />
                      </div>
                    );
                  } else if (fieldType === "date") {
                    return (
                      <div key={f.id} className="space-y-2">
                        <Label htmlFor={`field-${f.id}`} className="text-xs font-medium">Date (Page {f.page})</Label>
                        <Input
                          id={`field-${f.id}`}
                          type="date"
                          value={value || ""}
                          onChange={(e) => setFieldValues({ ...fieldValues, [f.id]: e.target.value })}
                          className="text-xs sm:text-sm"
                        />
                      </div>
                    );
                  } else if (fieldType === "company_stamp") {
                    return (
                      <div key={f.id} className="space-y-2">
                        <Label htmlFor={`field-${f.id}`} className="text-xs font-medium">Company Stamp (Page {f.page})</Label>
                        <Input
                          id={`field-${f.id}`}
                          placeholder="Company name or stamp ID"
                          value={value || ""}
                          onChange={(e) => setFieldValues({ ...fieldValues, [f.id]: e.target.value })}
                          className="text-xs sm:text-sm"
                        />
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </Card>

            {/* Signature Section (Legacy) */}
            {state.fields.some((f) => !f.field_type || (f.field_type as FieldType) === "signature") && (
              <Card className="p-4">
                <h3 className="font-semibold text-card-foreground">Your signature</h3>
                {signatureUrl ? (
                  <>
                    <img src={signatureUrl} alt="Signature preview" className="mt-3 h-20 object-contain bg-secondary rounded border border-border" />
                    <Button variant="outline" size="sm" className="mt-3 w-full text-xs sm:text-sm" onClick={() => setShowPad(true)}>Change</Button>
                  </>
                ) : (
                  <Button className="mt-3 w-full text-xs sm:text-sm" onClick={() => setShowPad(true)}>Add signature</Button>
                )}
              </Card>
            )}

            <Card className="p-3 sm:p-4 space-y-2">
              <Button className="w-full text-xs sm:text-sm" onClick={handleSubmit} disabled={submitting || !signatureUrl}>
                Sign document
              </Button>
              <Button variant="outline" className="w-full text-xs sm:text-sm" onClick={() => setRejectOpen(true)} disabled={submitting}>
                Reject
              </Button>
              <p className="text-xs text-muted-foreground">
                By signing, you agree your electronic signature is legally binding and that this action will be recorded with timestamp and IP.
              </p>
            </Card>
          </aside>
        </div>
      </main>

      <Dialog open={showPad} onOpenChange={setShowPad}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add your signature</DialogTitle></DialogHeader>
          <SignaturePad onComplete={(r) => { setSignatureUrl(r.dataUrl); setTyped(r.typed); setShowPad(false); }} />
        </DialogContent>
      </Dialog>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject document</DialogTitle></DialogHeader>
          <Textarea placeholder="Reason for rejecting" value={reason} onChange={(e) => setReason(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={submitting}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CenteredCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="p-8 max-w-md w-full text-center">{children}</Card>
    </div>
  );
}