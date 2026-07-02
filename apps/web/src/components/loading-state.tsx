import { Loader2 } from "lucide-react";

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      <Loader2 className="size-5 animate-spin text-muted-foreground" />
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export function InlineError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      <p className="text-sm font-medium text-destructive">Couldn't load this</p>
      <p className="max-w-xs text-xs text-muted-foreground">{message}</p>
      {onRetry ? (
        <button type="button" onClick={onRetry} className="mt-1 text-xs font-medium text-brand hover:underline">
          Try again
        </button>
      ) : null}
    </div>
  );
}
