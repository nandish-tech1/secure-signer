import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Pen, Type as TypeIcon, Stamp } from "lucide-react";

export type SignatureDetails = {
  fullName: string;
  initials: string;
  color: string;
  font: string;
  signatureDataUrl: string;
  initialsDataUrl: string;
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

  useEffect(() => {
    if (open) {
      setFullName(defaultName);
      setInitials(makeInitials(defaultName));
    }
  }, [open, defaultName]);

  const family = useMemo(() => FONTS.find((f) => f.id === font)?.family ?? FONTS[0].family, [font]);

  function handleApply() {
    const sigUrl = renderText(fullName || "Signature", family, color, 640, 180);
    const initUrl = renderText(initials || "AB", family, color, 320, 180);
    onApply({ fullName, initials, color, font, signatureDataUrl: sigUrl, initialsDataUrl: initUrl });
    onOpenChange(false);
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
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="signature"><Pen className="h-4 w-4" />Signature</TabsTrigger>
            <TabsTrigger value="initials"><TypeIcon className="h-4 w-4" />Initials</TabsTrigger>
            <TabsTrigger value="stamp" disabled><Stamp className="h-4 w-4" />Company Stamp</TabsTrigger>
          </TabsList>

          <TabsContent value="signature" className="mt-4">
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

        <div className="flex justify-end mt-4">
          <Button onClick={handleApply}>Apply</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}