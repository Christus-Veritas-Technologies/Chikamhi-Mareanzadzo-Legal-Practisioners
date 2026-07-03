"use client";

import { Button } from "@CMLP/ui/components/button";
import { Checkbox } from "@CMLP/ui/components/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@CMLP/ui/components/dialog";
import { Input } from "@CMLP/ui/components/input";
import { Label } from "@CMLP/ui/components/label";
import { useState } from "react";
import { toast } from "sonner";

import { apiFetch } from "@/hooks/use-api";

// Reusable typed-name electronic signature dialog — the same flow used by the document
// viewer, extracted so any "Sign" quick action (documents list, case documents tab, etc.)
// can trigger it without duplicating the form/consent/submit logic.
export function SignDocumentDialog({
  documentId,
  documentName,
  open,
  onOpenChange,
  onSigned,
}: {
  documentId: string;
  documentName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSigned?: () => void;
}) {
  const [signerName, setSignerName] = useState("");
  const [signerRole, setSignerRole] = useState("");
  const [consentChecked, setConsentChecked] = useState(false);
  const [isSigning, setIsSigning] = useState(false);

  function reset() {
    setSignerName("");
    setSignerRole("");
    setConsentChecked(false);
  }

  async function submitSignature() {
    if (!signerName.trim() || !consentChecked) return;
    setIsSigning(true);
    try {
      await apiFetch(`/documents/${documentId}/sign`, {
        method: "POST",
        body: JSON.stringify({ signerName: signerName.trim(), signerRole: signerRole.trim() || undefined, consent: true }),
      });
      toast.success("Signature recorded.");
      onOpenChange(false);
      reset();
      onSigned?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't record signature.");
    } finally {
      setIsSigning(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sign document{documentName ? ` — ${documentName}` : ""}</DialogTitle>
          <DialogDescription>
            Records a typed-name electronic signature — the full name, role, timestamp, and your
            account as witness are permanently attached to this document's audit trail.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="signer-name">Signer's full name</Label>
            <Input id="signer-name" value={signerName} onChange={(e) => setSignerName(e.target.value)} placeholder="e.g. Rutendo Mareanadzo" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="signer-role">Role (optional)</Label>
            <Input id="signer-role" value={signerRole} onChange={(e) => setSignerRole(e.target.value)} placeholder="e.g. Client, Witness, Attorney" />
          </div>
          <label htmlFor="signer-consent" className="flex items-start gap-2 text-xs">
            <Checkbox id="signer-consent" checked={consentChecked} onCheckedChange={(v) => setConsentChecked(v === true)} />
            <span>
              I confirm {signerName.trim() || "the signer"} has reviewed this document and intends this as their
              legally binding electronic signature.
            </span>
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submitSignature} disabled={isSigning || !signerName.trim() || !consentChecked}>
            {isSigning ? "Signing…" : "Confirm signature"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
