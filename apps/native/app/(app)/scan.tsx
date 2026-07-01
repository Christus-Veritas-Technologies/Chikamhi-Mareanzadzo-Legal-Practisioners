import { Ionicons } from "@expo/vector-icons";
import { Text } from "react-native";

import { Container } from "@/components/container";

export default function ScanScreen() {
  return (
    <Container isScrollable={false} className="items-center justify-center px-8">
      <Ionicons name="scan-outline" size={28} className="text-muted-foreground" />
      <Text className="mt-3 text-center font-serif text-lg font-semibold text-foreground">
        Scan
      </Text>
      <Text className="mt-1 text-center text-sm text-muted-foreground">
        Camera capture with edge detection is next up on the build list.
      </Text>
    </Container>
  );
}
