import { Ionicons } from "@expo/vector-icons";
import { CameraType, CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { RouteError } from "@/components/route-error";
import { setGalleryItems } from "@/lib/gallery-session";
import { setPages } from "@/lib/scan-session";

export default function ScanScreen() {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>("back");
  const [pages, setLocalPages] = useState<string[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isPickingGallery, setIsPickingGallery] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  async function capture() {
    if (!cameraRef.current || isCapturing) return;
    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
      if (photo?.uri) {
        setLocalPages((p) => [...p, photo.uri]);
      }
    } catch {
      // Camera hiccup — let the user just try the shutter again.
    } finally {
      setIsCapturing(false);
    }
  }

  // Gallery picks upload as independent documents (multi-select), unlike camera pages
  // which combine into a single multi-page scan — so this routes to its own assign screen.
  async function pickFromGallery() {
    if (isPickingGallery) return;
    setIsPickingGallery(true);
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) return;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        quality: 0.8,
      });
      if (result.canceled || result.assets.length === 0) return;

      setGalleryItems(
        result.assets.map((asset, i) => ({
          uri: asset.uri,
          name: asset.fileName ?? `photo-${i + 1}.jpg`,
          mimeType: asset.mimeType ?? "image/jpeg",
          sizeBytes: asset.fileSize,
        })),
      );
      router.push({ pathname: "/gallery-assign", params: { count: String(result.assets.length) } });
    } finally {
      setIsPickingGallery(false);
    }
  }

  function removePage(index: number) {
    setLocalPages((p) => p.filter((_, i) => i !== index));
  }

  function done() {
    if (pages.length === 0) return;
    setPages(pages);
    router.push({ pathname: "/scan-review", params: { count: String(pages.length) } });
    setLocalPages([]);
  }

  if (!permission) {
    return <View className="flex-1 bg-ink" />;
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-ink px-8" style={{ paddingTop: insets.top }}>
        <Ionicons name="camera-outline" size={36} color="#C89A54" />
        <Text className="text-center text-sm text-ink-foreground/80">
          C&M DMS needs camera access to scan documents.
        </Text>
        <Pressable onPress={requestPermission} className="rounded-full bg-brand px-5 py-2.5">
          <Text className="text-sm font-semibold text-ink">Allow camera access</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-ink" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center justify-between px-4 py-2">
        <Text className="text-xs font-medium text-ink-foreground/70">
          {pages.length > 0 ? `${pages.length} page${pages.length > 1 ? "s" : ""} captured` : "Ready to scan"}
        </Text>
        <View className="flex-row items-center gap-4">
          <Pressable onPress={() => setFacing((f) => (f === "back" ? "front" : "back"))} hitSlop={8}>
            <Ionicons name="camera-reverse-outline" size={20} color="#F5F0E6" />
          </Pressable>
          {pages.length > 0 ? (
            <Pressable onPress={done}>
              <Text className="text-xs font-semibold text-brand">Continue</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <View className="flex-1 items-center justify-center px-8">
        <View className="aspect-[3/4] w-full overflow-hidden rounded-2xl border-2 border-dashed border-brand/50">
          <CameraView ref={cameraRef} style={{ flex: 1 }} facing={facing} />
        </View>
      </View>

      {pages.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4 pb-2">
          {pages.map((uri, i) => (
            <Pressable key={uri} onPress={() => removePage(i)} className="mr-2 items-center">
              <Image source={{ uri }} className="h-16 w-12 rounded-md" resizeMode="cover" />
              <Text className="mt-0.5 text-[9px] text-ink-foreground/60">{i + 1}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      <View
        className="flex-row items-center justify-between px-8 pt-2"
        style={{ paddingBottom: insets.bottom + 24 }}
      >
        <Pressable
          onPress={pickFromGallery}
          disabled={isPickingGallery}
          className="h-11 w-11 items-center justify-center rounded-full bg-ink-foreground/10"
          style={{ opacity: isPickingGallery ? 0.6 : 1 }}
        >
          <Ionicons name="images-outline" size={20} color="#F5F0E6" />
        </Pressable>

        <Pressable
          onPress={capture}
          disabled={isCapturing}
          className="h-16 w-16 items-center justify-center rounded-full border-4 border-ink-foreground/30 bg-ink-foreground"
          style={{ opacity: isCapturing ? 0.6 : 1 }}
        >
          <View className="h-12 w-12 rounded-full bg-brand" />
        </Pressable>

        <View className="h-11 w-11" />
      </View>
    </View>
  );
}

export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return <RouteError error={error} retry={retry} title="Scanner hit a snag" />;
}
