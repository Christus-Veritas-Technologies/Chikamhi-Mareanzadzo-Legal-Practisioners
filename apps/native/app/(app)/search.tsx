import { Ionicons } from "@expo/vector-icons";
import { Text } from "react-native";

import { Container } from "@/components/container";

export default function SearchScreen() {
  return (
    <Container isScrollable={false} className="items-center justify-center px-8">
      <Ionicons name="search" size={28} className="text-muted-foreground" />
      <Text className="mt-3 text-center font-serif text-lg font-semibold text-foreground">
        Search
      </Text>
      <Text className="mt-1 text-center text-sm text-muted-foreground">
        Global document search is next up on the build list.
      </Text>
    </Container>
  );
}
