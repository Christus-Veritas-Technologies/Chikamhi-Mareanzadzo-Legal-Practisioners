// Dynamic config (replaces the old static app.json) so the aggressive,
// production-only native build tweaks below can be gated behind the EAS
// build profile. Development/preview builds keep full ABI support (so
// Android-emulator testing on x86_64 keeps working) and unminified code
// (for readable crashes); only the "production" profile — the one that
// actually gets installed by end users — picks up the size-reduction
// settings. eas.json sets APK_SIZE_OPTIMIZED=1 on that profile only.
// (Pattern copied from the vva/apps/reception project's app.config.js.)
const isProductionBuild = process.env.APK_SIZE_OPTIMIZED === "1";

// Keep rules for native modules that talk to JS over JNI/reflection rather
// than plain method calls — R8 can't see those call sites statically and
// will strip the classes/methods they need unless pinned down explicitly.
// Package names below match this project's actual native dependencies
// (react-native-reanimated, gesture-handler, screens, svg,
// keyboard-controller, safe-area-context), not a generic guess.
const extraProguardRules = `
# React Native / Hermes / New Architecture core
-keep class com.facebook.hermes.unicode.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.react.bridge.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }
-keep class com.facebook.react.uimanager.** { *; }
-keepclassmembers class * { @com.facebook.proguard.annotations.DoNotStrip *; }
-keepclassmembers class * { @com.facebook.common.internal.DoNotStrip *; }
-keepattributes *Annotation*
-keepattributes SourceFile,LineNumberTable
-dontwarn com.facebook.react.**

# Expo modules — bridged via JSI/reflection (see expo/expo#43567)
-keep class expo.modules.** { *; }
-keep class expo.core.** { *; }

# Reanimated / Worklets
-keep class com.swmansion.reanimated.** { *; }
-keep class com.swmansion.common.** { *; }
-keep class com.swmansion.worklets.** { *; }

# Gesture handler / screens / svg
-keep class com.swmansion.gesturehandler.** { *; }
-keep class com.swmansion.rnscreens.** { *; }
-keep class com.horcrux.svg.** { *; }

# Keyboard controller
-keep class com.reactnativekeyboardcontroller.** { *; }

# Safe area context — used by components/container.tsx, which wraps nearly every
# screen in the app. Omitting this was the likely cause of the "works in dev, crashes
# immediately on launch in production" bug: R8 only strips in release builds, and this
# module's JNI bridge is invoked on first render of almost any screen.
-keep class com.th3rdwave.safeareacontext.** { *; }
`;

module.exports = {
  expo: {
    scheme: "CMLP",
    userInterfaceStyle: "automatic",
    orientation: "default",
    web: {
      bundler: "metro",
    },
    name: "CMLP",
    slug: "CMLP",
    icon: "./assets/images/icon.png",
    plugins: [
      "expo-font",
      [
        "expo-splash-screen",
        {
          backgroundColor: "#FFFFFF",
          image: "./assets/images/splash-icon.png",
          dark: {
            image: "./assets/images/splash-icon-dark.png",
            backgroundColor: "#000000",
          },
          imageWidth: 300,
        },
      ],
      [
        "expo-camera",
        {
          cameraPermission: "C&M DMS uses the camera to scan and file physical documents.",
        },
      ],
      [
        "expo-image-picker",
        {
          photosPermission: "C&M DMS uses your photo library to set a profile photo and to upload documents.",
        },
      ],
      [
        "expo-build-properties",
        {
          android: {
            ...(isProductionBuild
              ? {
                  // Real phones are always arm; x86/x86_64 only exist for
                  // emulators. Dropping them roughly halves the duplicated
                  // native-library weight a universal APK otherwise ships.
                  buildArchs: ["armeabi-v7a", "arm64-v8a"],
                  // Re-compress native .so files inside the APK. Modern AGP
                  // stores them uncompressed by default for faster app
                  // start, which makes the .apk file itself bigger — worth
                  // trading away for a distributable file.
                  useLegacyPackaging: true,
                  // R8 code shrinking + unused-resource removal.
                  enableMinifyInReleaseBuilds: true,
                  enableShrinkResourcesInReleaseBuilds: true,
                  // Compresses the JS bundle inside the APK too. Slightly
                  // slower cold start in exchange for a smaller file.
                  enableBundleCompression: true,
                  extraProguardRules,
                }
              : {}),
          },
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      eas: {
        projectId: "14cba22e-aa89-4a8e-9811-358c0ad658c5",
      },
    },
    android: {
      package: "com.chikamhimareanadzolegalpractitioners.legalmanagementsystem",
    },
  },
};
