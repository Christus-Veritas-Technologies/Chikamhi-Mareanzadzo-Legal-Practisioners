import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import {
  Button,
  Checkbox,
  Input,
  Label,
  LinkButton,
  TextField,
} from "heroui-native";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/contexts/auth-context";

const BRAND = {
  brand: "#C89A54",
  muted: "#8A8378",
};

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const { signIn, isSigningIn, error, clearError } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(true);

  async function handleSignIn() {
    if (!username || !password) return;
    await signIn(username.trim().toLowerCase(), password);
    // On success, RootNavigator's Stack.Protected guard swaps to (app) automatically.
  }

  return (
    <View className="flex-1 bg-ink">
      <StatusBar style="light" />

      {/* Brand panel */}
      <View
        className="items-center justify-end gap-3 px-8 pb-10"
        style={{ paddingTop: insets.top + 48, flex: 0.62 }}
      >
        <View className="h-16 w-16 items-center justify-center rounded-2xl bg-brand">
          <Text className="font-serif text-xl font-bold text-brand-foreground">C&M</Text>
        </View>
        <Text className="text-center font-serif text-xl font-semibold text-ink-foreground">
          Chikamhi & Mareanadzo
        </Text>
        <Text
          className="text-center text-[11px] font-medium text-brand uppercase"
          style={{ letterSpacing: 3 }}
        >
          Document System
        </Text>
      </View>

      {/* Sign-in sheet */}
      <View className="flex-1 rounded-t-[28px] bg-background">
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: insets.bottom + 24 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text className="font-serif text-2xl font-semibold text-foreground">Sign in</Text>
        <Text className="mt-1 mb-6 text-sm text-muted-foreground">
          Firm staff credentials only.
        </Text>

        {error ? (
          <View className="mb-4 flex-row items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5">
            <Ionicons name="warning-outline" size={14} color="#B3413A" style={{ marginTop: 1 }} />
            <Text className="flex-1 text-xs text-destructive">{error}</Text>
          </View>
        ) : null}

        <TextField className="mb-4" isInvalid={Boolean(error)}>
          <Label>
            <Label.Text>Username</Label.Text>
          </Label>
          <Input
            placeholder="e.g. r.mareanadzo"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isSigningIn}
            value={username}
            onChangeText={(text) => {
              setUsername(text);
              if (error) clearError();
            }}
          />
        </TextField>

        <TextField className="mb-1" isInvalid={Boolean(error)}>
          <Label>
            <Label.Text>Password</Label.Text>
          </Label>
          <View className="relative justify-center">
            <Input
              placeholder="••••••••"
              secureTextEntry={!showPassword}
              editable={!isSigningIn}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (error) clearError();
              }}
              className="pr-10"
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={showPassword ? "Hide password" : "Show password"}
              onPress={() => setShowPassword((s) => !s)}
              className="absolute right-3"
              hitSlop={8}
            >
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={18}
                color={BRAND.muted}
              />
            </Pressable>
          </View>
        </TextField>

        <View className="my-4 flex-row items-center justify-between">
          <Pressable
            className="flex-row items-center gap-2"
            onPress={() => setKeepSignedIn((v) => !v)}
          >
            <Checkbox isSelected={keepSignedIn} onSelectedChange={setKeepSignedIn} />
            <Text className="text-xs text-muted-foreground">Keep me signed in</Text>
          </Pressable>
          <LinkButton size="sm">
            <LinkButton.Label className="text-xs text-brand">Forgot password?</LinkButton.Label>
          </LinkButton>
        </View>

        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onPress={handleSignIn}
          isDisabled={isSigningIn || !username || !password}
        >
          {isSigningIn ? <ActivityIndicator color="#fff" /> : null}
          <Button.Label>{isSigningIn ? "Signing in…" : "Sign in"}</Button.Label>
        </Button>

        <Text className="mt-6 text-center text-[10px] text-muted-foreground">
          Access restricted to firm staff · v1.0
        </Text>
      </ScrollView>
      </View>
    </View>
  );
}
