import { Ionicons } from "@expo/vector-icons";
import { Text } from "react-native";

import { Container } from "@/components/container";

export default function CasesScreen() {
  return (
    <Container isScrollable={false} className="items-center justify-center px-8">
      <Ionicons name="briefcase-outline" size={28} className="text-muted-foreground" />
      <Text className="mt-3 text-center font-serif text-lg font-semibold text-foreground">
        Cases
      </Text>
      <Text className="mt-1 text-center text-sm text-muted-foreground">
        Clients and matters browsing is next up on the build list.
      </Text>
    </Container>
  );
}
