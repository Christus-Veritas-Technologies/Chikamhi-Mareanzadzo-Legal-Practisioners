"use client";

import { Button } from "@CMLP/ui/components/button";
import { Input } from "@CMLP/ui/components/input";
import { Label } from "@CMLP/ui/components/label";
import { cn } from "@CMLP/ui/lib/utils";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useCurrentUser } from "@/contexts/current-user-context";
import { apiFetch } from "@/hooks/use-api";
import { formatStatus } from "@/lib/format-status";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export default function SettingsPage() {
  const user = useCurrentUser();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const [notifications, setNotifications] = useState(
    user.notifications ?? { caseUpload: true, ocrComplete: true, weeklyDigest: false },
  );

  async function saveProfile() {
    setIsSavingProfile(true);
    try {
      await apiFetch("/auth/me", { method: "PATCH", body: JSON.stringify({ name: name.trim(), email: email.trim() }) });
      toast.success("Profile updated.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't update profile.");
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handlePhotoSelected(file: File | undefined) {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Photo must be under 2 MB.");
      return;
    }
    setIsUploadingPhoto(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const { uploadUrl } = await apiFetch<{ uploadUrl: string }>("/auth/avatar-upload-url", {
        method: "POST",
        body: JSON.stringify({ contentType: file.type, fileExt: ext }),
      });
      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!putRes.ok) throw new Error("Photo upload failed.");
      toast.success("Photo updated.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't upload photo — is file storage configured?");
    } finally {
      setIsUploadingPhoto(false);
    }
  }

  async function savePassword() {
    if (newPassword !== confirmPassword) {
      toast.error("New password and confirmation don't match.");
      return;
    }
    setIsSavingPassword(true);
    try {
      await apiFetch("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      toast.success("Password changed.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't change password.");
    } finally {
      setIsSavingPassword(false);
    }
  }

  async function toggleNotification(key: keyof typeof notifications) {
    const next = { ...notifications, [key]: !notifications[key] };
    setNotifications(next);
    try {
      await apiFetch("/auth/notifications", { method: "PATCH", body: JSON.stringify({ [key]: next[key] }) });
    } catch (err) {
      setNotifications(notifications);
      toast.error(err instanceof Error ? err.message : "Couldn't update notification setting.");
    }
  }

  const NOTIF_ITEMS: { key: keyof typeof notifications; title: string; description: string }[] = [
    {
      key: "caseUpload",
      title: "Document uploaded to my cases",
      description: "Email me when a colleague files to a case I lead.",
    },
    {
      key: "ocrComplete",
      title: "OCR processing complete",
      description: "Notify when scanned documents finish text extraction.",
    },
    {
      key: "weeklyDigest",
      title: "Weekly activity digest",
      description: "A Monday summary of filings across the firm.",
    },
  ];

  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your profile, password, and notifications.</p>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-4">
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatarUrl} alt={user.name} className="size-14 rounded-full object-cover" />
          ) : (
            <div className="flex size-14 items-center justify-center rounded-full bg-brand-muted text-lg font-semibold text-brand-foreground">
              {initials(user.name)}
            </div>
          )}
          <div>
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploadingPhoto}>
              {isUploadingPhoto ? "Uploading…" : "Change photo"}
            </Button>
            <p className="mt-1 text-[11px] text-muted-foreground">JPG or PNG, up to 2 MB</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              className="hidden"
              onChange={(e) => handlePhotoSelected(e.target.files?.[0])}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="settings-name">Full name</Label>
            <Input id="settings-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="settings-email">Email</Label>
            <Input id="settings-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="settings-username">Username</Label>
            <Input id="settings-username" value={user.username} disabled />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="settings-role">Role</Label>
            <Input id="settings-role" value={`${formatStatus(user.role)} · Admin (managed by firm)`} disabled />
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={saveProfile} disabled={isSavingProfile || !name.trim() || !email.trim()}>
            {isSavingProfile ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
        <p className="font-serif text-sm font-semibold text-foreground">Change password</p>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="settings-current-password">Current password</Label>
          <Input
            id="settings-current-password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="settings-new-password">New password</Label>
            <Input
              id="settings-new-password"
              type="password"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="settings-confirm-password">Confirm</Label>
            <Input
              id="settings-confirm-password"
              type="password"
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button
            onClick={savePassword}
            disabled={isSavingPassword || !currentPassword || newPassword.length < 8}
          >
            {isSavingPassword ? "Updating…" : "Update password"}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
        <p className="font-serif text-sm font-semibold text-foreground">Notifications</p>
        {NOTIF_ITEMS.map((item) => (
          <div key={item.key} className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">{item.title}</p>
              <p className="text-xs text-muted-foreground">{item.description}</p>
            </div>
            <button type="button" onClick={() => toggleNotification(item.key)} aria-label={`Toggle ${item.title}`}>
              <span
                className={cn(
                  "flex h-5 w-9 shrink-0 items-center rounded-full px-0.5 transition-colors",
                  notifications[item.key] ? "justify-end bg-success" : "justify-start bg-muted",
                )}
              >
                <span className="size-4 rounded-full bg-white" />
              </span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
