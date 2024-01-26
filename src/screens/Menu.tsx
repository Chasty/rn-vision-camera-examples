import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import React from "react";
import { useRouter } from "expo-router";

const MenuItem = ({
  item,
  route,
  onPress,
}: {
  item: string;
  route: string;
  onPress: (p: string) => void;
}) => {
  return (
    <TouchableOpacity style={styles.button} onPress={() => onPress(route)}>
      <Text style={styles.itemText}>{item}</Text>
    </TouchableOpacity>
  );
};

const Menu = () => {
  const { navigate } = useRouter();

  const goToScreen = (route: string) => {
    navigate(route);
  };

  return (
    <View style={styles.container}>
      <Text
        style={{
          textAlign: "center",
          fontSize: 32,
          marginTop: 8,
          marginBottom: 16,
        }}
      >
        {`Vision Camera\nExamples`}
      </Text>
      <MenuItem
        onPress={goToScreen}
        item="Multiple Detections"
        route="multiple_detections"
      />
      <MenuItem
        onPress={goToScreen}
        item="Single Detection with Reanimated"
        route="single_detection_reanimated"
      />
      <MenuItem
        onPress={goToScreen}
        item="Multiple Detections and Photo"
        route="mutliple_detections_and_photo"
      />
    </View>
  );
};

export default Menu;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 32,
    gap: 32,
    paddingTop: 64,
  },
  itemText: {
    fontSize: 16,
  },
  button: {
    backgroundColor: "skyblue",
    height: 80,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 36,
  },
});
