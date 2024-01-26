import { useRouter } from "expo-router";
import { Text, TouchableOpacity } from "react-native";

export const BackButton = () => {
  const { back } = useRouter();

  return (
    <TouchableOpacity
      onPress={() => back()}
      style={{
        backgroundColor: "rgba(33,33,33,.2)",
        position: "absolute",
        left: 32,
        top: 48,
        zIndex: 100001,
        padding: 16,
      }}
    >
      <Text style={{ fontSize: 20, color: "white" }}>{"<"}</Text>
    </TouchableOpacity>
  );
};
