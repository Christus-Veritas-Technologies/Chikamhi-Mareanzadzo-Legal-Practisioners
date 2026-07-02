import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Stack } from "expo-router";
import { useThemeColor } from "heroui-native";
import { useState } from "react";
import { Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { AlertDialog } from "@/components/confirm-dialog";
import { RouteError } from "@/components/route-error";
import { useAuth } from "@/contexts/auth-context";
import { apiFetch } from "@/lib/api";
import { formatStatus } from "@/lib/format-status";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export default function SettingsScreen() {
  const { user, token, refreshUser } = useAuth();
  const mutedForeground = useThemeColor("muted-foreground");

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const [notifications, setNotifications] = useState(
    user?.notifications ?? { caseUpload: true, ocrComplete: true, weeklyDigest: false },
  );

  const [alertInfo, setAlertInfo] = useState<{ title: string; description?: string } | null>(null);

  async function saveProfile() {
    if (!name.trim() || !email.trim()) return;
    setIsSavingProfile(true);
    try {
      await apiFetch("/auth/me", {
        method: "PATCH",
        body: { name: name.trim(), email: email.trim() },
        token,
      });
      await refreshUser();
      setAlertInfo({ title: "Saved", description: "Profile updated." });
    } catch (err) {
      setAlertInfo({
        title: "Couldn't update profile",
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function pickPhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setAlertInfo({ title: "Permission needed", description: "Allow photo library access to set a profile photo." });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const ext = asset.uri.split(".").pop()?.toLowerCase() ?? "jpg";
    const contentType = asset.mimeType ?? `image/${ext === "jpg" ? "jpeg" : ext}`;

    setIsUploadingPhoto(true);
    try {
      const { uploadUrl } = await apiFetch<{ uploadUrl: string }>("/auth/avatar-upload-url", {
        method: "POST",
        body: { contentType, fileExt: ext },
        token,
      });

      const fileBlob = await (await fetch(asset.uri)).blob();
      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": contentType },
        body: fileBlob,
      });
      if (!putRes.ok) throw new Error("Photo upload failed.");

      await refreshUser();
    } catch (err) {
      setAlertInfo({
        title: "Couldn't upload photo",
        description: err instanceof Error ? err.message : "Is file storage configured?",
      });
    } finally {
      setIsUploadingPhoto(false);
    }
  }

  async function savePassword() {
    if (newPassword !== confirmPassword) {
      setAlertInfo({ title: "Passwords don't match", description: "New password and confirmation must match." });
      return;
    }
    setIsSavingPassword(true);
    try {
      await apiFetch("/auth/change-password", {
        method: "POST",
        body: { currentPassword, newPassword },
        token,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setAlertInfo({ title: "Password changed" });
    } catch (err) {
      setAlertInfo({
        title: "Couldn't change password",
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setIsSavingPassword(false);
    }
  }

  async function toggleNotification(key: keyof typeof notifications) {
    const next = { ...notifications, [key]: !notifications[key] };
    setNotifications(next);
    try {
      await apiFetch("/auth/notifications", { method: "PATCH", body: { [key]: next[key] }, token });
    } catch (err) {
      setNotifications(notifications);
      setAlertInfo({ title: "Couldn't update", description: err instanceof Error ? err.message : "Please try again." });
    }
  }

  const NOTIF_ITEMS: { key: keyof typeof notifications; title: string; description: string }[] = [
    { key: "caseUpload", title: "Document uploaded to my cases", description: "Notify when a colleague files to a case I lead." },
    { key: "ocrComplete", title: "OCR processing complete", description: "Notify when scanned documents finish text extraction." },
    { key: "weeklyDigest", title: "Weekly activity digest", description: "A Monday summary of filings across the firm." },
  ];

  if (!user) {
    return null;
  }

  return (
    <ScrollView className="flex-1 bg-background px-5 pt-3" contentContainerStyle={{ paddingBottom: 40 }}>
      <Stack.Screen options={{ title: "Settings" }} />

      <View className="flex-row items-center gap-4">
        {user.avatarUrl ? (
          <Image source={{ uri: user.avatarUrl }} className="h-16 w-16 rounded-full" />
        ) : (
          <View className="h-16 w-16 items-center justify-center rounded-full bg-brand-muted">
            <Text className="text-lg font-semibold text-brand-foreground">{initials(user.name)}</Text>
          </View>
        )}
        <Pressable onPress={pickPhoto} disabled={isUploadingPhoto}>
          <Text className="text-sm font-semibold text-brand">
            {isUploadingPhoto ? "Uploading…" : "Change photo"}
          </Text>
          <Text className="text-[11px] text-muted-foreground">JPG or PNG</Text>
        </Pressable>
      </View>

      <Text className="mt-6 mb-2 text-sm font-semibold text-foreground">Profile</Text>
      <Text className="mb-1 text-xs font-medium text-foreground">Full name</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        className="rounded-xl border border-border px-3 py-2.5 text-sm text-foreground"
      />
      <Text className="mt-3 mb-1 text-xs font-medium text-foreground">Email</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        className="rounded-xl border border-border px-3 py-2.5 text-sm text-foreground"
      />
      <View className="mt-3 flex-row items-center gap-2">
        <Ionicons name="at-outline" size={14} color={mutedForeground} />
        <Text className="text-xs text-muted-foreground">
          @{user.username} · {formatStatus(user.role)}
        </Text>
      </View>
      <Pressable
        onPress={saveProfile}
        disabled={isSavingProfile}
        className="mt-4 items-center rounded-xl bg-primary py-2.5"
      >
        <Text className="text-sm font-semibold text-primary-foreground">
          {isSavingProfile ? "Saving…" : "Save changes"}
        </Text>
      </Pressable>

      <Text className="mt-8 mb-2 text-sm font-semibold text-foreground">Change password</Text>
      <TextInput
        value={currentPassword}
        onChangeText={setCurrentPassword}
        secureTextEntry
        placeholder="Current password"
        placeholderTextColor="#8A8378"
        className="rounded-xl border border-border px-3 py-2.5 text-sm text-foreground"
      />
      <TextInput
        value={newPassword}
        onChangeText={setNewPassword}
        secureTextEntry
        placeholder="New password"
        placeholderTextColor="#8A8378"
        className="mt-3 rounded-xl border border-border px-3 py-2.5 text-sm text-foreground"
      />
      <TextInput
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        placeholder="Confirm new password"
        placeholderTextColor="#8A8378"
        className="mt-3 rounded-xl border border-border px-3 py-2.5 text-sm text-foreground"
      />
      <Pressable
        onPress={savePassword}
        disabled={isSavingPassword || !currentPassword || newPassword.length < 8}
        className="mt-4 items-center rounded-xl bg-primary py-2.5"
        style={{ opacity: isSavingPassword || !currentPassword || newPassword.length < 8 ? 0.5 : 1 }}
      >
        <Text className="text-sm font-semibold text-primary-foreground">
          {isSavingPassword ? "Updating…" : "Update password"}
        </Text>
      </Pressable>

      <Text className="mt-8 mb-2 text-sm font-semibold text-foreground">Notifications</Text>
      <View className="gap-4">
        {NOTIF_ITEMS.map((item) => (
          <View key={item.key} className="flex-row items-center justify-between gap-4">
            <View className="flex-1">
              <Text className="text-sm font-medium text-foreground">{item.title}</Text>
              <Text className="text-xs text-muted-foreground">{item.description}</Text>
            </View>
            <Pressable onPress={() => toggleNotification(item.key)}>
              <View
                className={`h-5 w-9 items-center rounded-full px-0.5 ${notifications[item.key] ? "items-end bg-success" : "items-start bg-muted"}`}
              >
                <View className="h-4 w-4 rounded-full bg-white" />
              </View>
            </Pressable>
          </View>
        ))}
      </View>

      <AlertDialog
        visible={Boolean(alertInfo)}
        onOpenChange={(open) => !open && setAlertInfo(null)}
        title={alertInfo?.title ?? ""}
        description={alertInfo?.description}
      />
    </ScrollView>
  );
}

export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return <RouteError error={error} retry={retry} title="Couldn't load settings" />;
}
