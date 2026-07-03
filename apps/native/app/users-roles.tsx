import { Ionicons } from "@expo/vector-icons";
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
import { apiFetch, ApiError } from "@/lib/api";
import { formatStatus } from "@/lib/format-status";
import { relativeTime } from "@/lib/format-time";

type Pagination = { total: number; limit: number; offset: number; hasMore: boolean };

type StaffMember = {
  id: string;
  name: string;
  email: string;
  username: string;
  role: "ATTORNEY" | "PARALEGAL";
  isActive: boolean;
  lastActive: string | null;
};

const ROLES: StaffMember["role"][] = ["ATTORNEY", "PARALEGAL"];

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

const PAGE_SIZE = 25;

export default function UsersRolesScreen() {
  const { token, user: currentUser } = useAuth();

  // Users & Roles is attorney-only.
  if (currentUser?.role !== "ATTORNEY") {
    return (
      <Container isScrollable={false} className="items-center justify-center px-8">
        <Stack.Screen options={{ title: "Users & Roles" }} />
        <EmptyState icon="lock-closed-outline" title="Attorneys only" description="This page is only available to attorneys." />
      </Container>
    );
  }

  return <UsersRolesContent token={token} currentUserId={currentUser.id} />;
}

function UsersRolesContent({ token, currentUserId }: { token: string | null; currentUserId: string }) {
  const [limit, setLimit] = useState(PAGE_SIZE);
  const { data, isLoading, error, refetch } = useApi<{ users: StaffMember[]; pagination: Pagination }>(
    `/users?limit=${limit}`,
    [limit],
  );
  const staff = data?.users ?? [];
  const activeCount = staff.filter((s) => s.isActive).length;

  const [rolePickerFor, setRolePickerFor] = useState<StaffMember | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createRole, setCreateRole] = useState<StaffMember["role"]>("PARALEGAL");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [resetFor, setResetFor] = useState<StaffMember | null>(null);
  const [resetTempPassword, setResetTempPassword] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);

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
    try {
      await apiFetch(`/users/${id}`, { method: "PATCH", body: { role }, token });
      refetch();
    } catch (err) {
      setBlockedMessage(err instanceof Error ? err.message : "Couldn't change role.");
    }
  }

  async function toggleActive(member: StaffMember) {
    try {
      await apiFetch(`/users/${member.id}`, { method: "PATCH", body: { isActive: !member.isActive }, token });
      refetch();
    } catch (err) {
      // Same case that used to lock people out silently: an attorney suspending themselves
      // or a fellow attorney. The backend now blocks it — surface why instead of a bare error.
      setBlockedMessage(err instanceof Error ? err.message : "Couldn't update this account.");
    }
  }

  async function createUser() {
    if (!createName.trim() || !createEmail.trim() || createPassword.length < 8) return;
    setIsCreating(true);
    setCreateError(null);
    try {
      await apiFetch("/users", {
        method: "POST",
        body: { name: createName.trim(), email: createEmail.trim(), password: createPassword, role: createRole },
        token,
      });
      setShowCreate(false);
      setCreateName("");
      setCreateEmail("");
      setCreatePassword("");
      setCreateRole("PARALEGAL");
      refetch();
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : "Couldn't create user.");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <Container className="px-5 pt-9">
      <Stack.Screen options={{ title: "Users & Roles" }} />

      <View className="flex-row items-center justify-between">
        <Text className="text-xs text-muted-foreground">
          {data?.pagination.total ?? staff.length} staff accounts · {activeCount} active
        </Text>
        <Pressable onPress={() => setShowCreate(true)}>
          <Text className="text-xs font-semibold text-brand">+ Create user</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <LoadingState label="Loading users…" />
      ) : error ? (
        <InlineError message={error} onRetry={refetch} />
      ) : staff.length === 0 ? (
        <EmptyState icon="people-outline" title="No staff accounts" />
      ) : (
        <View className="mt-3 gap-2 pb-6">
          {staff.map((member) => {
            const suspendLocked = member.role === "ATTORNEY";
            return (
              <View key={member.id} className="rounded-xl border border-border px-3 py-3">
                <View className="flex-row items-center gap-2.5">
                  <View className="h-8 w-8 items-center justify-center rounded-full bg-brand-muted">
                    <Text className="text-[10px] font-semibold text-brand-foreground">{initials(member.name)}</Text>
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text numberOfLines={1} className="text-sm font-medium text-foreground">
                      {member.name}
                      {member.id === currentUserId ? <Text className="text-muted-foreground"> (you)</Text> : null}
                    </Text>
                    <Text numberOfLines={1} className="text-[11px] text-muted-foreground">
                      {member.email}
                    </Text>
                  </View>
                </View>

                <View className="mt-2.5 flex-row items-center justify-between">
                  <Pressable
                    onPress={() => setRolePickerFor(member)}
                    className="rounded-full border border-border px-2.5 py-1"
                  >
                    <Text className="text-[11px] text-foreground">{formatStatus(member.role)}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => !suspendLocked && toggleActive(member)}
                    disabled={suspendLocked}
                    className={`flex-row items-center gap-1.5 ${suspendLocked ? "opacity-40" : ""}`}
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
                  <Text className="text-[11px] text-muted-foreground">
                    {member.lastActive ? relativeTime(member.lastActive) : "Never"}
                  </Text>
                </View>

                <Pressable onPress={() => setResetFor(member)} className="mt-2 self-start">
                  <Text className="text-[11px] font-medium text-muted-foreground">Reset password</Text>
                </Pressable>
              </View>
            );
          })}
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

      <Modal visible={showCreate} transparent animationType="fade">
        <View className="flex-1 items-center justify-center bg-black/40 px-8">
          <View className="w-full gap-3 rounded-xl bg-background p-4">
            <Text className="text-sm font-semibold text-foreground">Create user</Text>
            <Text className="text-xs text-muted-foreground">
              They become part of the firm immediately — no invite step. Set the password they'll actually sign in
              with.
            </Text>
            {createError ? <Text className="text-xs text-destructive">{createError}</Text> : null}
            <TextInput
              value={createName}
              onChangeText={setCreateName}
              placeholder="Full name"
              placeholderTextColor="#8A8378"
              className="rounded-xl border border-border px-3 py-2.5 text-sm text-foreground"
            />
            <TextInput
              value={createEmail}
              onChangeText={setCreateEmail}
              placeholder="Email address"
              placeholderTextColor="#8A8378"
              autoCapitalize="none"
              keyboardType="email-address"
              className="rounded-xl border border-border px-3 py-2.5 text-sm text-foreground"
            />
            <TextInput
              value={createPassword}
              onChangeText={setCreatePassword}
              placeholder="Password (min. 8 characters)"
              placeholderTextColor="#8A8378"
              secureTextEntry
              className="rounded-xl border border-border px-3 py-2.5 text-sm text-foreground"
            />
            <View className="flex-row gap-2">
              {ROLES.map((role) => (
                <Pressable
                  key={role}
                  onPress={() => setCreateRole(role)}
                  className={`flex-1 items-center rounded-xl border py-2 ${createRole === role ? "border-brand bg-brand/10" : "border-border"}`}
                >
                  <Text className="text-xs text-foreground">{formatStatus(role)}</Text>
                </Pressable>
              ))}
            </View>
            {createRole === "ATTORNEY" ? (
              <Text className="text-[11px] text-muted-foreground">
                Attorneys can't suspend or reactivate other attorneys — including each other — once created.
              </Text>
            ) : null}
            <View className="flex-row justify-end gap-3">
              <Pressable onPress={() => setShowCreate(false)} className="px-3 py-2">
                <Text className="text-sm text-muted-foreground">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={createUser}
                disabled={isCreating || !createName.trim() || !createEmail.trim() || createPassword.length < 8}
                className="rounded-xl bg-primary px-4 py-2"
              >
                <Text className="text-sm font-semibold text-primary-foreground">
                  {isCreating ? "Creating…" : "Create user"}
                </Text>
              </Pressable>
            </View>
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

      <Modal visible={Boolean(blockedMessage)} transparent animationType="fade">
        <View className="flex-1 items-center justify-center bg-black/40 px-8">
          <View className="w-full gap-3 rounded-xl bg-background p-4">
            <Text className="text-sm font-semibold text-foreground">Can't do that</Text>
            <Text className="text-xs text-muted-foreground">{blockedMessage}</Text>
            <Pressable onPress={() => setBlockedMessage(null)} className="mt-1 items-center rounded-xl bg-primary py-2.5">
              <Text className="text-sm font-semibold text-primary-foreground">OK</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </Container>
  );
}

export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return <RouteError error={error} retry={retry} title="Couldn't load users & roles" />;
}
