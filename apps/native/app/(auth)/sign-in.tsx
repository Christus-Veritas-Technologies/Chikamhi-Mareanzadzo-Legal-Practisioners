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
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Self-contained brand tokens for this app (values only — mirrors packages/ui/src/styles/globals.css).
const BRAND = {
  ink: "#211D17",
  brand: "#C89A54",
  mutedOnDark: "#B49164",
};

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(true);

  function handleSignIn() {
    // TODO: wire up to the auth endpoint once it exists on the server.
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
      <View
        className="flex-1 rounded-t-[28px] bg-background px-6 pt-8"
        style={{ paddingBottom: insets.bottom + 24 }}
      >
        <Text className="font-serif text-2xl font-semibold text-foreground">Sign in</Text>
        <Text className="mt-1 mb-6 text-sm text-muted-foreground">
          Firm staff credentials only.
        </Text>

        <TextField className="mb-4">
          <Label>
            <Label.Text>Username</Label.Text>
          </Label>
          <Input
            placeholder="e.g. r.mareanadzo"
            autoCapitalize="none"
            autoCorrect={false}
            value={username}
            onChangeText={setUsername}
          />
        </TextField>

        <TextField className="mb-1">
          <Label>
            <Label.Text>Password</Label.Text>
          </Label>
          <View className="relative justify-center">
            <Input
              placeholder="••••••••"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
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
                color="#8A8378"
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

        <Button variant="primary" size="lg" className="w-full" onPress={handleSignIn}>
          <Button.Label>Sign in</Button.Label>
        </Button>

        <Pressable className="mt-5 flex-row items-center justify-center gap-1.5">
          <Ionicons name="shield-checkmark-outline" size={14} color={BRAND.brand} />
          <Text className="text-xs font-medium text-brand">Unlock with biometrics</Text>
        </Pressable>

        <Text className="mt-6 text-center text-[10px] text-muted-foreground">
          Access restricted to firm staff · v1.0
        </Text>
      </View>
    </View>
  );
}
