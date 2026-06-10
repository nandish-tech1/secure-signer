import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import SignatureCanvas from "react-signature-canvas";
import { Pen, Type as TypeIcon, Upload as UploadIcon, Edit3 } from "lucide-react";

export type SignatureDetails = {
  fullName: string;
  initials: string;
  color: string;
  font: string;
  signatureDataUrl: string;
  initialsDataUrl: string;
  saveToProfile?: boolean;
};

const FONTS = [
  { id: "Great Vibes", label: "Great Vibes", family: "'Great Vibes', 'Brush Script MT', cursive" },
  { id: "Dancing Script", label: "Dancing Script", family: "'Dancing Script', 'Brush Script MT', cursive" },
  { id: "Pacifico", label: "Pacifico", family: "'Pacifico', 'Brush Script MT', cursive" },
  { id: "Caveat", label: "Caveat", family: "'Caveat', 'Brush Script MT', cursive" },
];

const COLORS = [
  { id: "#111827", label: "Black" },
  { id: "#dc2626", label: "Red" },
  { id: "#2563eb", label: "Blue" },
  { id: "#16a34a", label: "Green" },
];

function renderText(text: string, font: string, color: string, w = 640, h = 180): string {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = color;
  // Auto-size to fit
  let size = Math.floor(h * 0.7);
  ctx.font = `${size}px ${font}`;
  while (ctx.measureText(text).width > w - 24 && size > 16) {
    size -= 2;
    ctx.font = `${size}px ${font}`;
  }
  ctx.textBaseline = "middle";
  ctx.fillText(text || " ", 12, h / 2);
  return c.toDataURL("image/png");
}

function makeInitials(name: string): string {
  return name.split(/\s+/).filter(Boolean).map((p) => p[0]?.toUpperCase() ?? "").join("").slice(0, 4);
}

export function SignatureDetailsDialog({
  open,
  onOpenChange,
  defaultName,
  onApply,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  defaultName: string;
  onApply: (d: SignatureDetails) => void;
}) {
  const [fullName, setFullName] = useState(defaultName);
  const [initials, setInitials] = useState(makeInitials(defaultName));
  const [font, setFont] = useState(FONTS[0].id);
  const [color, setColor] = useState(COLORS[0].id);
  const [tab, setTab] = useState("signature");
  const [mode, setMode] = useState<"type" | "draw" | "upload">("type");
  const [drawnUrl, setDrawnUrl] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [saveToProfile, setSaveToProfile] = useState(true);
  const drawRef = useRef<SignatureCanvas | null>(null);

  useEffect(() => {
    if (open) {
      setFullName(defaultName);
      setInitials(makeInitials(defaultName));
    }
  }, [open, defaultName]);

  const family = useMemo(() => FONTS.find((f) => f.id === font)?.family ?? FONTS[0].family, [font]);

  function handleApply() {
    let sigUrl = "";
    if (mode === "draw") {
      const pad = drawRef.current;
      if (pad && !pad.isEmpty()) sigUrl = pad.getCanvas().toDataURL("image/png");
      else sigUrl = drawnUrl ?? renderText(fullName || "Signature", family, color, 640, 180);
    } else if (mode === "upload" && uploadedUrl) {
      sigUrl = uploadedUrl;
    } else {
      sigUrl = renderText(fullName || "Signature", family, color, 640, 180);
    }
    const initUrl = renderText(initials || "AB", family, color, 320, 180);
    onApply({ fullName, initials, color, font, signatureDataUrl: sigUrl, initialsDataUrl: initUrl, saveToProfile });
    onOpenChange(false);
  }

  function onUploadFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => setUploadedUrl(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Set your signature details</DialogTitle>
        </DialogHeader>

        <div className="grid sm:grid-cols-2 gap-3 mt-2">
          <div>
            <Label className="text-xs">Full name</Label>
            <Input value={fullName} placeholder="Your name" onChange={(e) => { setFullName(e.target.value); setInitials(makeInitials(e.target.value)); }} />
          </div>
          <div>
            <Label className="text-xs">Initials</Label>
            <Input value={initials} placeholder="Your initials" onChange={(e) => setInitials(e.target.value)} />
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="mt-4">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="signature"><Pen className="h-4 w-4" />Signature</TabsTrigger>
            <TabsTrigger value="initials"><TypeIcon className="h-4 w-4" />Initials</TabsTrigger>
          </TabsList>

          <TabsContent value="signature" className="mt-4">
            <div className="flex items-center gap-1 rounded-md bg-muted p-1 mb-3 text-xs">
              <button type="button" onClick={() => setMode("type")} className={`flex-1 inline-flex items-center justify-center gap-1 py-1.5 rounded ${mode === "type" ? "bg-background shadow" : ""}`}>
                <TypeIcon className="h-3.5 w-3.5" /> Type
              </button>
              <button type="button" onClick={() => setMode("draw")} className={`flex-1 inline-flex items-center justify-center gap-1 py-1.5 rounded ${mode === "draw" ? "bg-background shadow" : ""}`}>
                <Edit3 className="h-3.5 w-3.5" /> Draw
              </button>
              <button type="button" onClick={() => setMode("upload")} className={`flex-1 inline-flex items-center justify-center gap-1 py-1.5 rounded ${mode === "upload" ? "bg-background shadow" : ""}`}>
                <UploadIcon className="h-3.5 w-3.5" /> Upload
              </button>
            </div>

            {mode === "type" && (
            <div className="space-y-2 max-h-72 overflow-auto pr-1">
              {FONTS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFont(f.id)}
                  className={`w-full flex items-center gap-3 rounded-md border p-3 text-left transition ${font === f.id ? "border-accent bg-accent/10" : "border-border hover:bg-muted/40"}`}
                >
                  <span className={`h-4 w-4 rounded-full border-2 flex-shrink-0 ${font === f.id ? "border-accent bg-accent" : "border-muted-foreground"}`} />
                  <span className="text-3xl truncate" style={{ fontFamily: f.family, color }}>{fullName || "Signature"}</span>
                </button>
              ))}
            </div>
            )}

            {mode === "draw" && (
              <div className="space-y-2">
                <div className="rounded-md border border-border bg-card">
                  <SignatureCanvas ref={drawRef} canvasProps={{ className: "w-full h-40 rounded-md" }} penColor={color} />
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => drawRef.current?.clear()}>Clear</Button>
              </div>
            )}

            {mode === "upload" && (
              <div className="space-y-2">
                <label className="block rounded-md border-2 border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground cursor-pointer hover:border-accent">
                  <UploadIcon className="h-5 w-5 mx-auto mb-2" />
                  {uploadedUrl ? "Replace image" : "Click to upload signature image (PNG/JPG)"}
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) onUploadFile(f); }}
                  />
                </label>
                {uploadedUrl && (
                  <div className="rounded-md border border-border bg-card p-2">
                    <img src={uploadedUrl} alt="Uploaded signature" className="h-20 mx-auto" />
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="initials" className="mt-4">
            <div className="space-y-2 max-h-72 overflow-auto pr-1">
              {FONTS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFont(f.id)}
                  className={`w-full flex items-center gap-3 rounded-md border p-3 text-left transition ${font === f.id ? "border-accent bg-accent/10" : "border-border hover:bg-muted/40"}`}
                >
                  <span className={`h-4 w-4 rounded-full border-2 flex-shrink-0 ${font === f.id ? "border-accent bg-accent" : "border-muted-foreground"}`} />
                  <span className="text-3xl" style={{ fontFamily: f.family, color }}>{initials || "AB"}</span>
                </button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="stamp" className="mt-4 text-sm text-muted-foreground">
            Company stamp is not available in this plan.
          </TabsContent>
        </Tabs>

        <div className="flex items-center gap-3 mt-4">
          <span className="text-sm text-muted-foreground">Color:</span>
          {COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-label={c.label}
              onClick={() => setColor(c.id)}
              className={`h-6 w-6 rounded-full border-2 transition ${color === c.id ? "border-foreground scale-110" : "border-transparent"}`}
              style={{ backgroundColor: c.id }}
            />
          ))}
        </div>

        <div className="flex items-center justify-between mt-4 gap-3">
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <Checkbox checked={saveToProfile} onCheckedChange={(v) => setSaveToProfile(Boolean(v))} />
            Save signature for next time
          </label>
          <Button onClick={handleApply}>Apply</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}