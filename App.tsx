import { Skia } from "@shopify/react-native-skia";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTensorflowModel } from "react-native-fast-tflite";
import {
  Camera,
  runAtTargetFps,
  useCameraDevice,
  useCameraPermission,
  useFrameProcessor,
} from "react-native-vision-camera";
import { useResizePlugin } from "vision-camera-resize-plugin";

export default function App() {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice("back");

  const paint = Skia.Paint();
  paint.setColor(Skia.Color("red"));

  const objectDetection = useTensorflowModel(
    require("./assets/pose-detection-fast.tflite")
  );
  const model =
    objectDetection.state === "loaded" ? objectDetection.model : undefined;

  console.log(model);

  const { resize } = useResizePlugin();

  const frameProcessor = useFrameProcessor(
    (frame) => {
      "worklet";

      // console.log(`Received a ${frame.width} x ${frame.height} Frame!`);

      // const data = resize(frame, {
      //   size: {
      //     width: 320,
      //     height: 320,
      //   },
      //   pixelFormat: "rgb-uint8",
      // });
      // const array = new Uint8Array(data);

      // if (model) {
      //   const output = model.runSync([array]);

      //   const numDetections = output[0];
      //   //console.log(`Detected ${output[1]} objects!`);
      // }

      if (model) {
        // const data = resize(frame, {
        //   size: {
        //     width: 192,
        //     height: 192,
        //   },
        //   pixelFormat: "rgb-uint8",
        // });
        // const array = new Uint8Array(data);

        // const outputs = model.runSync([array]);
        // console.log(`Received ${outputs[0]} outputs!`);

        // //As we will not need to process every frame, let's by now just run it at 2 fps. Worklets make this configuration easier for us.

        // const rect = Skia.XYWHRect(150, 150, 50, 50)

        runAtTargetFps(2, () => {
          "worklet";
          console.log(
            `Frame data is: ${frame.width}x${frame.height} (${frame.pixelFormat})`
          );
        });
      }
    },
    [model]
  );

  useEffect(() => {
    if (!hasPermission) {
      requestPermission().then((permission) => {
        if (!permission) {
          console.log("Permission not granted");
        }
      });
    }
  }, [hasPermission]);

  if (!hasPermission) {
    return <Text>No Camera Permission</Text>;
  }

  if (device == null) return <Text>No Camera Device</Text>;

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        frameProcessor={frameProcessor}
        // pixelFormat="rgb"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
});
