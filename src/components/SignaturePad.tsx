import { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export type SignatureResult = { dataUrl: string; typed?: string };

export function SignaturePad({ onComplete }: { onComplete: (r: SignatureResult) => void }) {
  const padRef = useRef<SignatureCanvas | null>(null);
  const [typed, setTyped] = useState("");

  function submitDraw() {
    const pad = padRef.current;
    if (!pad || pad.isEmpty()) return;
    const dataUrl = pad.getCanvas().toDataURL("image/png");
    onComplete({ dataUrl });
  }

  function submitTyped() {
    if (!typed.trim()) return;
    // Render typed name to canvas
    const c = document.createElement("canvas");
    c.width = 600; c.height = 160;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#0f1b3d";
    ctx.font = "italic 64px 'Brush Script MT', cursive";
    ctx.fillText(typed, 20, 100);
    onComplete({ dataUrl: c.toDataURL("image/png"), typed });
  }

  return (
    <Tabs defaultValue="draw">
      <TabsList className="grid grid-cols-2">
        <TabsTrigger value="draw">Draw</TabsTrigger>
        <TabsTrigger value="type">Type</TabsTrigger>
      </TabsList>
      <TabsContent value="draw" className="mt-4 space-y-3">
        <div className="rounded-md border border-border bg-card">
          <SignatureCanvas ref={padRef} canvasProps={{ className: "w-full h-40 rounded-md" }} penColor="#0f1b3d" />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" type="button" onClick={() => padRef.current?.clear()}>Clear</Button>
          <Button type="button" onClick={submitDraw}>Apply signature</Button>
        </div>
      </TabsContent>
      <TabsContent value="type" className="mt-4 space-y-3">
        <Input placeholder="Type your full name" value={typed} onChange={(e) => setTyped(e.target.value)} />
        {typed && (
          <div className="rounded-md border border-border bg-card p-4 text-3xl" style={{ fontFamily: "'Brush Script MT', cursive", color: "var(--primary)" }}>
            {typed}
          </div>
        )}
        <Button type="button" onClick={submitTyped}>Apply signature</Button>
      </TabsContent>
    </Tabs>
  );
}