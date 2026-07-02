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
import { useState } from "react";

// The shared replacement for window.confirm()/alert() across the web app — every destructive
// or "are you sure" action should render one of these instead of a native browser dialog.
// Two modes: plain confirm (no cascadeLabel) and confirm-with-cascade-checkbox (folders,
// cases, clients — "also delete the N things inside?", default unchecked).
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  cascadeLabel,
  destructive = false,
  isLoading = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** If set, shows a checkbox (default unchecked) and passes its value to onConfirm. */
  cascadeLabel?: string;
  destructive?: boolean;
  isLoading?: boolean;
  onConfirm: (cascade: boolean) => void | Promise<void>;
}) {
  const [cascade, setCascade] = useState(false);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setCascade(false);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>

        {cascadeLabel ? (
          <label className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-xs">
            <Checkbox checked={cascade} onCheckedChange={(checked) => setCascade(checked === true)} className="mt-0.5" />
            <span className="text-foreground">{cascadeLabel}</span>
          </label>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            onClick={() => onConfirm(cascade)}
            disabled={isLoading}
          >
            {isLoading ? "Working…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Single-button info dialog — the replacement for window.alert().
export function AlertDialog({
  open,
  onOpenChange,
  title,
  description,
  buttonLabel = "OK",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  buttonLabel?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>{buttonLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
