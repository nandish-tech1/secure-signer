import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export type SignerInput = {
  email: string;
  name?: string;
  role?: "signer" | "validator" | "witness";
  orderIndex?: number;
};

interface AddSignersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (signers: SignerInput[], signingMode: "ordered" | "parallel", expirationDays: number) => void;
}

export function AddSignersModal({ open, onOpenChange, onApply }: AddSignersModalProps) {
  const [signers, setSigners] = useState<SignerInput[]>([{ email: "", name: "", role: "signer" }]);
  const [setOrder, setSetOrder] = useState(false);
  const [expirationDays, setExpirationDays] = useState(15);

  function addSigner() {
    setSigners([...signers, { email: "", name: "", role: "signer" }]);
  }

  function removeSigner(index: number) {
    if (signers.length === 1) {
      toast.error("At least one signer is required");
      return;
    }
    setSigners(signers.filter((_, i) => i !== index));
  }

  function updateSigner(index: number, field: keyof SignerInput, value: any) {
    const updated = [...signers];
    updated[index] = { ...updated[index], [field]: value };
    setSigners(updated);
  }

  function moveSigner(index: number, direction: "up" | "down") {
    const newSigners = [...signers];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newSigners.length) return;
    [newSigners[index], newSigners[swapIndex]] = [newSigners[swapIndex], newSigners[index]];
    setSigners(newSigners);
  }

  function handleApply() {
    const valid = signers.every((s) => s.email.trim() && s.email.includes("@"));
    if (!valid) {
      toast.error("Please fill all email addresses");
      return;
    }
    if (expirationDays < 1 || expirationDays > 365) {
      toast.error("Expiration must be between 1 and 365 days");
      return;
    }

    const finalSigners = signers.map((s, i) => ({
      ...s,
      orderIndex: setOrder ? i : undefined,
    }));

    onApply(finalSigners, setOrder ? "ordered" : "parallel", expirationDays);
    onOpenChange(false);
  }

  function handleCancel() {
    setSigners([{ email: "", name: "", role: "signer" }]);
    setSetOrder(false);
    setExpirationDays(15);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create your signature request</DialogTitle>
          <DialogDescription>Who will receive your document?</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Signers list */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Recipients</Label>
            {signers.map((signer, index) => (
              <Card key={index} className="p-4 space-y-3">
                <div className="grid sm:grid-cols-[1fr_1fr_120px] gap-3 items-end">
                  <div>
                    <Label className="text-xs text-muted-foreground">Name</Label>
                    <Input
                      placeholder="Recipient name"
                      value={signer.name || ""}
                      onChange={(e) => updateSigner(index, "name", e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Email</Label>
                    <Input
                      type="email"
                      placeholder="recipient@email.com"
                      value={signer.email}
                      onChange={(e) => updateSigner(index, "email", e.target.value)}
                      className="mt-1"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Role</Label>
                    <Select value={signer.role || "signer"} onValueChange={(v) => updateSigner(index, "role", v as any)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="signer">Signer</SelectItem>
                        <SelectItem value="validator">Validator</SelectItem>
                        <SelectItem value="witness">Witness</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {/* Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <div className="flex gap-1">
                    {setOrder && signers.length > 1 && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => moveSigner(index, "up")}
                          disabled={index === 0}
                          className="text-xs h-7"
                        >
                          ↑
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => moveSigner(index, "down")}
                          disabled={index === signers.length - 1}
                          className="text-xs h-7"
                        >
                          ↓
                        </Button>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {setOrder && signers.length > 1 && (
                      <Badge variant="outline" className="text-xs">
                        #{index + 1}
                      </Badge>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeSigner(index)}
                      disabled={signers.length === 1}
                      className="h-7 w-7 p-0"
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={addSigner}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" /> Add Recipient
            </Button>
          </div>

          {/* Settings */}
          <Card className="p-4 space-y-4">
            <h3 className="font-semibold text-sm">Settings</h3>

            {/* Set order */}
            <div className="flex items-start gap-3">
              <Checkbox
                id="set-order"
                checked={setOrder}
                onCheckedChange={(checked) => {
                  setSetOrder(checked as boolean);
                }}
                className="mt-1"
              />
              <div className="flex-1">
                <Label htmlFor="set-order" className="text-sm font-medium cursor-pointer">
                  Set the order of receivers
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  A signer won't receive a request until the previous person has completed their document.
                </p>
              </div>
            </div>

            {/* Expiration */}
            <div className="flex items-start gap-3 pt-3 border-t border-border">
              <Checkbox id="change-expiration" defaultChecked className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="change-expiration" className="text-sm font-medium cursor-pointer">
                  Change expiration date
                </Label>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-muted-foreground">The document will expire in</span>
                  <Input
                    type="number"
                    min={1}
                    max={365}
                    value={expirationDays}
                    onChange={(e) => setExpirationDays(Math.max(1, Math.min(365, parseInt(e.target.value) || 1)))}
                    className="w-16 h-8 text-sm"
                  />
                  <span className="text-xs text-muted-foreground">days.</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleApply}>
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
