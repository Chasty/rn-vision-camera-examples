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

export const ObjectDetectionMenuItems = () => {
  const { navigate } = useRouter();

  const goToScreen = (route: string) => {
    navigate(route);
  };

  return (
    <View>
      <Text
        style={{
          fontSize: 16,
          marginBottom: 12,
          fontWeight: "700",
          fontStyle: "italic",
        }}
      >
        1. Object Detection
      </Text>
      <View style={{ gap: 32 }}>
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
        <MenuItem
          onPress={goToScreen}
          item="Take Photo and Detect"
          route="take_photo_and_detect"
        />
      </View>
    </View>
  );
};

const Menu = () => {
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

      <ObjectDetectionMenuItems />
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
