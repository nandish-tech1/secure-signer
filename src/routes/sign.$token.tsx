import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getSignerByToken, submitSignature, rejectSignature } from "@/lib/public-sign.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
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
        <div className="mx-auto max-w-6xl px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-foreground">
            <FileSignature className="h-5 w-5 text-accent" /> SignTrust
          </div>
          <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
            <ShieldCheck className="h-3 w-3" /> Secure signing session
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-6">
        <div className="mb-4">
          <h1 className="text-xl font-semibold text-foreground">{state.document.name}</h1>
          <p className="text-sm text-muted-foreground">Signing as {state.signer.email}</p>
        </div>

        <div className="grid lg:grid-cols-[1fr_320px] gap-6">
          <div className="bg-secondary rounded-lg p-6 overflow-auto">
            <div className="flex justify-center">
              <PdfViewer
                fileUrl={state.fileUrl}
                renderOverlay={(page) => (
                  <div className="absolute inset-0 pointer-events-none">
                    {state.fields.filter((f) => f.page === page).map((f) => (
                      <div
                        key={f.id}
                        className="absolute rounded border-2 border-accent bg-accent/15 flex items-center justify-center text-xs text-accent font-medium overflow-hidden"
                        style={{ left: `${f.x_ratio * 100}%`, top: `${f.y_ratio * 100}%`, width: `${f.width_ratio * 100}%`, height: `${f.height_ratio * 100}%` }}
                      >
                        {signatureUrl ? (
                          <img src={signatureUrl} alt="Signature" className="h-full w-full object-contain" />
                        ) : (
                          <span>Sign here</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              />
            </div>
          </div>

          <aside className="space-y-4">
            <Card className="p-4">
              <h3 className="font-semibold text-card-foreground">Your signature</h3>
              {signatureUrl ? (
                <>
                  <img src={signatureUrl} alt="Signature preview" className="mt-3 h-20 object-contain bg-secondary rounded border border-border" />
                  <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => setShowPad(true)}>Change</Button>
                </>
              ) : (
                <Button className="mt-3 w-full" onClick={() => setShowPad(true)}>Add signature</Button>
              )}
            </Card>

            <Card className="p-4 space-y-2">
              <Button className="w-full" onClick={handleSubmit} disabled={submitting || !signatureUrl}>
                Sign document
              </Button>
              <Button variant="outline" className="w-full" onClick={() => setRejectOpen(true)} disabled={submitting}>
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