import { Stack } from "expo-router";
import { useState } from "react";
import { Modal, Pressable, Text, TextInput, View } from "react-native";

import { Container } from "@/components/container";
import { EmptyState } from "@/components/empty-state";
import { LoadMoreButton } from "@/components/load-more-button";
import { InlineError, LoadingState } from "@/components/loading-state";
import { RouteError } from "@/components/route-error";
import { useAuth } from "@/contexts/auth-context";
import { useApi } from "@/hooks/use-api";
import { apiFetch } from "@/lib/api";
import { formatStatus } from "@/lib/format-status";
import { relativeTime } from "@/lib/format-time";

type Pagination = { total: number; limit: number; offset: number; hasMore: boolean };

type StaffMember = {
  id: string;
  name: string;
  email: string;
  username: string;
  role: "ADMIN" | "ATTORNEY" | "PARALEGAL";
  isActive: boolean;
  lastActive: string | null;
};

const ROLES: StaffMember["role"][] = ["ADMIN", "ATTORNEY", "PARALEGAL"];

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

const PAGE_SIZE = 25;

export default function UsersRolesScreen() {
  const { token, user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === "ADMIN";
  const [limit, setLimit] = useState(PAGE_SIZE);
  const { data, isLoading, error, refetch } = useApi<{ users: StaffMember[]; pagination: Pagination }>(
    `/users?limit=${limit}`,
    [limit],
  );
  const staff = data?.users ?? [];
  const activeCount = staff.filter((s) => s.isActive).length;

  const [rolePickerFor, setRolePickerFor] = useState<StaffMember | null>(null);

  const [showInvite, setShowInvite] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  const [resetFor, setResetFor] = useState<StaffMember | null>(null);
  const [resetTempPassword, setResetTempPassword] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  async function resetPassword() {
    if (!resetFor) return;
    setIsResetting(true);
    try {
      const { tempPassword: temp } = await apiFetch<{ tempPassword: string }>(
        `/users/${resetFor.id}/reset-password`,
        { method: "POST", token },
      );
      setResetTempPassword(temp);
    } finally {
      setIsResetting(false);
    }
  }

  async function setRole(id: string, role: StaffMember["role"]) {
    setRolePickerFor(null);
    await apiFetch(`/users/${id}`, { method: "PATCH", body: { role }, token });
    refetch();
  }

  async function toggleActive(id: string, current: boolean) {
    await apiFetch(`/users/${id}`, { method: "PATCH", body: { isActive: !current }, token });
    refetch();
  }

  async function invite() {
    if (!inviteName.trim() || !inviteEmail.trim()) return;
    setIsInviting(true);
    try {
      const { tempPassword: temp } = await apiFetch<{ tempPassword: string }>("/users", {
        method: "POST",
        body: { name: inviteName.trim(), email: inviteEmail.trim() },
        token,
      });
      setTempPassword(temp);
      setInviteName("");
      setInviteEmail("");
      refetch();
    } finally {
      setIsInviting(false);
    }
  }

  return (
    <Container className="px-5 pt-3">
      <Stack.Screen options={{ title: "Users & Roles" }} />

      <View className="flex-row items-center justify-between">
        <Text className="text-xs text-muted-foreground">
          {data?.pagination.total ?? staff.length} staff accounts · {activeCount} active
        </Text>
        {isAdmin ? (
          <Pressable onPress={() => setShowInvite(true)}>
            <Text className="text-xs font-semibold text-brand">+ Invite</Text>
          </Pressable>
        ) : null}
      </View>

      {isLoading ? (
        <LoadingState label="Loading users…" />
      ) : error ? (
        <InlineError message={error} onRetry={refetch} />
      ) : staff.length === 0 ? (
        <EmptyState icon="people-outline" title="No staff accounts" />
      ) : (
        <View className="mt-3 gap-2 pb-6">
          {staff.map((member) => (
            <View key={member.id} className="rounded-xl border border-border px-3 py-3">
              <View className="flex-row items-center gap-2.5">
                <View className="h-8 w-8 items-center justify-center rounded-full bg-brand-muted">
                  <Text className="text-[10px] font-semibold text-brand-foreground">
                    {initials(member.name)}
                  </Text>
                </View>
                <View className="min-w-0 flex-1">
                  <Text numberOfLines={1} className="text-sm font-medium text-foreground">
                    {member.name}
                  </Text>
                  <Text numberOfLines={1} className="text-[11px] text-muted-foreground">
                    {member.email}
                  </Text>
                </View>
              </View>

              <View className="mt-2.5 flex-row items-center justify-between">
                {isAdmin ? (
                  <Pressable
                    onPress={() => setRolePickerFor(member)}
                    className="rounded-full border border-border px-2.5 py-1"
                  >
                    <Text className="text-[11px] text-foreground">{formatStatus(member.role)}</Text>
                  </Pressable>
                ) : (
                  <Text className="text-[11px] text-foreground">{formatStatus(member.role)}</Text>
                )}
                {isAdmin ? (
                  <Pressable
                    onPress={() => toggleActive(member.id, member.isActive)}
                    className="flex-row items-center gap-1.5"
                  >
                    <View
                      className={`h-4 w-7 items-center rounded-full px-0.5 ${member.isActive ? "items-end bg-success" : "items-start bg-muted"}`}
                    >
                      <View className="h-3 w-3 rounded-full bg-white" />
                    </View>
                    <Text className={`text-[11px] ${member.isActive ? "text-success" : "text-muted-foreground"}`}>
                      {member.isActive ? "Active" : "Suspended"}
                    </Text>
                  </Pressable>
                ) : (
                  <Text className={`text-[11px] ${member.isActive ? "text-success" : "text-muted-foreground"}`}>
                    {member.isActive ? "Active" : "Suspended"}
                  </Text>
                )}
                <Text className="text-[11px] text-muted-foreground">
                  {member.lastActive ? relativeTime(member.lastActive) : "Never"}
                </Text>
              </View>

              {isAdmin ? (
                <Pressable onPress={() => setResetFor(member)} className="mt-2 self-start">
                  <Text className="text-[11px] font-medium text-muted-foreground">Reset password</Text>
                </Pressable>
              ) : null}
            </View>
          ))}
          {data?.pagination ? (
            <LoadMoreButton
              shown={staff.length}
              total={data.pagination.total}
              onPress={() => setLimit((l) => l + PAGE_SIZE)}
              loading={isLoading}
            />
          ) : null}
        </View>
      )}

      <Modal visible={Boolean(rolePickerFor)} transparent animationType="fade">
        <Pressable
          className="flex-1 items-center justify-center bg-black/40 px-8"
          onPress={() => setRolePickerFor(null)}
        >
          <View className="w-full rounded-xl bg-background p-2">
            {ROLES.map((role) => (
              <Pressable
                key={role}
                onPress={() => rolePickerFor && setRole(rolePickerFor.id, role)}
                className="rounded-lg px-3 py-3 active:bg-muted/30"
              >
                <Text className="text-sm text-foreground">{formatStatus(role)}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      <Modal visible={showInvite} transparent animationType="fade">
        <View className="flex-1 items-center justify-center bg-black/40 px-8">
          <View className="w-full gap-3 rounded-xl bg-background p-4">
            {tempPassword ? (
              <>
                <Text className="text-sm font-semibold text-foreground">Invite sent</Text>
                <Text className="text-xs text-muted-foreground">
                  Temporary password (share securely, shown once):
                </Text>
                <Text className="rounded-lg bg-muted px-3 py-2 text-sm font-medium text-foreground">
                  {tempPassword}
                </Text>
                <Pressable
                  onPress={() => {
                    setTempPassword(null);
                    setShowInvite(false);
                  }}
                  className="mt-1 items-center rounded-xl bg-primary py-2.5"
                >
                  <Text className="text-sm font-semibold text-primary-foreground">Done</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text className="text-sm font-semibold text-foreground">Invite a colleague</Text>
                <TextInput
                  value={inviteName}
                  onChangeText={setInviteName}
                  placeholder="Full name"
                  placeholderTextColor="#8A8378"
                  className="rounded-xl border border-border px-3 py-2.5 text-sm text-foreground"
                />
                <TextInput
                  value={inviteEmail}
                  onChangeText={setInviteEmail}
                  placeholder="Email address"
                  placeholderTextColor="#8A8378"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  className="rounded-xl border border-border px-3 py-2.5 text-sm text-foreground"
                />
                <View className="flex-row justify-end gap-3">
                  <Pressable onPress={() => setShowInvite(false)} className="px-3 py-2">
                    <Text className="text-sm text-muted-foreground">Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={invite}
                    disabled={isInviting || !inviteName.trim() || !inviteEmail.trim()}
                    className="rounded-xl bg-primary px-4 py-2"
                  >
                    <Text className="text-sm font-semibold text-primary-foreground">
                      {isInviting ? "Inviting…" : "Send invite"}
                    </Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={Boolean(resetFor)} transparent animationType="fade">
        <View className="flex-1 items-center justify-center bg-black/40 px-8">
          <View className="w-full gap-3 rounded-xl bg-background p-4">
            {resetTempPassword ? (
              <>
                <Text className="text-sm font-semibold text-foreground">Password reset</Text>
                <Text className="text-xs text-muted-foreground">
                  Share this temporary password with {resetFor?.name} directly (no email is configured yet).
                  Shown once.
                </Text>
                <Text className="rounded-lg bg-muted px-3 py-2 text-sm font-medium text-foreground">
                  {resetTempPassword}
                </Text>
                <Pressable
                  onPress={() => {
                    setResetFor(null);
                    setResetTempPassword(null);
                  }}
                  className="mt-1 items-center rounded-xl bg-primary py-2.5"
                >
                  <Text className="text-sm font-semibold text-primary-foreground">Done</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text className="text-sm font-semibold text-foreground">Reset password?</Text>
                <Text className="text-xs text-muted-foreground">
                  This immediately invalidates {resetFor?.name}'s current password and generates a new temporary
                  one for you to hand off to them.
                </Text>
                <View className="flex-row justify-end gap-3">
                  <Pressable onPress={() => setResetFor(null)} className="px-3 py-2">
                    <Text className="text-sm text-muted-foreground">Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={resetPassword}
                    disabled={isResetting}
                    className="rounded-xl bg-primary px-4 py-2"
                  >
                    <Text className="text-sm font-semibold text-primary-foreground">
                      {isResetting ? "Resetting…" : "Reset password"}
                    </Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </Container>
  );
}

export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return <RouteError error={error} retry={retry} title="Couldn't load users & roles" />;
}
