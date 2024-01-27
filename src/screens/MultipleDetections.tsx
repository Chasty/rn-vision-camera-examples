import { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTensorflowModel } from "react-native-fast-tflite";
import {
  Camera,
  runAtTargetFps,
  useCameraDevice,
  useCameraPermission,
  useFrameProcessor,
} from "react-native-vision-camera";
import { useResizePlugin } from "vision-camera-resize-plugin";
import { labels } from "./utils/labels";
import { Worklets } from "react-native-worklets-core";
import { BackButton } from "../components/Back";

const colors = ["red", "green", "blue"] as const;

type BoundingBox = {
  left: number;
  top: number;
  width: number;
  height: number;
  color: string;
  label: string;
};

type DetectionLocation = {
  top: number;
  left: number;
  bottom: number;
  right: number;
  label: string;
};

const modelsInput = {
  ssd_mobilenet_v1: {
    input: {
      shape: {
        width: 300,
        height: 300,
      },
    },
    modelAsset: require("../../assets/ssd_mobilenet_v1.tflite") as number,
  },
  efficient: {
    input: {
      shape: {
        width: 320,
        height: 320,
      },
    },
    modelAsset: require("../../assets/efficient.tflite") as number,
  },
};

type TFLiteModel = keyof typeof modelsInput;

const tfLiteModels = Object.keys(modelsInput) as TFLiteModel[];

export function MultipleDetectionsScreen() {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice("back");
  const camera = useRef<Camera>(null);

  const [detections, setDetections] = useState<BoundingBox[]>([]);

  const [currentModel, setCurrentModel] = useState<TFLiteModel>("efficient");

  const selectedModel = modelsInput[currentModel];

  const objectDetection = useTensorflowModel(selectedModel.modelAsset);
  const { resize } = useResizePlugin();

  const model =
    objectDetection.state === "loaded" ? objectDetection.model : undefined;

  const getBoundingBoxFromLocation = (location: DetectionLocation) => {
    const frameWidth = Dimensions.get("window").width;
    const frameHeight = Dimensions.get("window").height;

    const { top, left, bottom, right, label } = location;

    // Convert normalized coordinates to absolute pixel values
    const absoluteTop = top * frameHeight;
    const absoluteLeft = left * frameWidth;
    const absoluteBottom = bottom * frameHeight;
    const absoluteRight = right * frameWidth;

    // Calculate width and height from top-left and bottom-right points
    const absoluteWidth = absoluteRight - absoluteLeft;
    const absoluteHeight = absoluteBottom - absoluteTop;

    return {
      absoluteLeft,
      absoluteTop,
      absoluteWidth,
      absoluteHeight,
    };
  };

  const onGetObjectDetectorResponse = Worklets.createRunInJsFn(
    async (detectionLocations: DetectionLocation[]) => {
      const locationsToDraw = [];

      detectionLocations.forEach((location) => {
        const { label } = location;

        const { absoluteLeft, absoluteTop, absoluteWidth, absoluteHeight } =
          getBoundingBoxFromLocation(location);

        const locationToDraw = {
          label,
          absoluteLeft,
          absoluteTop,
          absoluteWidth,
          absoluteHeight,
        };

        locationsToDraw.push(locationToDraw);
      });

      setDetections(
        locationsToDraw.map((location, idx) => ({
          left: location.absoluteLeft,
          top: location.absoluteTop,
          width: location.absoluteWidth,
          height: location.absoluteHeight,
          color: colors[idx],
          label: location.label,
        }))
      );
    }
  );

  const frameProcessor = useFrameProcessor(
    (frame) => {
      "worklet";

      if (model) {
        const data = resize(frame, {
          size: {
            width: selectedModel.input.shape.width,
            height: selectedModel.input.shape.height,
          },
          pixelFormat: "rgb",
          dataType: "uint8",
          //pixelFormat: "rgb-uint8",
        });
        const rgbData = new Uint8Array(data);

        runAtTargetFps(10, () => {
          "worklet";

          const outputs = model.runSync([rgbData]);

          const topDetections: DetectionLocation[] = [];

          // 3. Interpret outputs accordingly
          const detection_boxes = outputs[0];
          const detection_classes = outputs[1];
          const detection_scores = outputs[2];
          const num_detections = outputs[3];
          console.log(`Detected ${num_detections[0]} objects!`);
          console.log(detection_classes);
          console.log(detection_scores);

          for (let i = 0; i < detection_boxes.length; i += 4) {
            if (topDetections.length >= 3) {
              break;
            }

            const confidence = detection_scores[i / 4];
            const class_label = detection_classes[i / 4];
            //if (confidence > 0.4) {
            // 4. Draw a red box around the detected object!
            const top = detection_boxes[i];
            const left = detection_boxes[i + 1];
            const bottom = detection_boxes[i + 2];
            const right = detection_boxes[i + 3];

            // const left = detection_boxes[i];
            // const top = detection_boxes[i + 1];
            // const right = detection_boxes[i + 2];
            // const bottom = detection_boxes[i + 3];

            topDetections.push({
              top,
              left,
              bottom,
              right,
              label: labels[class_label],
            });
            // }
          }

          //const [top, left, bottom, right, ...rest] = locations; used
          //const [left, top, right, bottom, ...rest] = locations;

          onGetObjectDetectorResponse(topDetections);
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
      <BackButton />

      <View
        style={{
          position: "absolute",
          right: 20,
          top: 64,
          gap: 8,
          zIndex: 10001,
        }}
      >
        {tfLiteModels.map((m) => (
          <TouchableOpacity
            key={m}
            onPress={() => setCurrentModel(m)}
            style={{
              borderRadius: 16,
              paddingVertical: 16,
              paddingHorizontal: 8,
              backgroundColor:
                currentModel === m ? "skyblue" : "rgba(33, 33, 33, 0.2)",
            }}
          >
            <Text style={{ color: "white" }}>{m}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {detections.map((d, idx) => (
        <View
          key={"detection" + idx + d.left}
          style={[
            {
              position: "absolute",
              backgroundColor: "transparent",
              borderWidth: 2,
              borderColor: d.color,
              zIndex: 1000,
            },
            { ...d },
          ]}
        >
          <Text
            style={{ backgroundColor: "rgba(33,33,33, .5)", color: "white" }}
          >
            {d.label}
          </Text>
        </View>
      ))}

      <Camera
        ref={camera}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        pixelFormat="rgb"
        frameProcessor={frameProcessor}
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
