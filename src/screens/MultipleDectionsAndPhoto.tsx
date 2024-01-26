import { Skia, Canvas, Image, useImage } from "@shopify/react-native-skia";
import { useEffect, useRef, useState } from "react";
import {
  Button,
  Dimensions,
  Pressable,
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
import * as ImageManipulator from "expo-image-manipulator";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { Worklets } from "react-native-worklets-core";
import { ReText } from "../components/ReText";
import { useRouter } from "expo-router";
import { BackButton } from "../components/Back";

const paint = Skia.Paint();
paint.setColor(Skia.Color("blue"));

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

const currentModel: "efficient" | "ssd_mobilenet_v1" = "efficient";

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

export function MultipleDetectionsAndPhotoScreen() {
  const { hasPermission, requestPermission } = useCameraPermission();
  const [guess, setGuess] = useState("");
  const device = useCameraDevice("back");
  const camera = useRef<Camera>(null);
  const [photoPath, setPhotoPath] = useState<string>();
  const image = useImage(`file://${photoPath}`);
  const { back } = useRouter();

  const boxLocation = useSharedValue([0, 0, 100, 100]);

  const [detections, setDetections] = useState<BoundingBox[]>([]);

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

  const onGetFaceDetectorResponse = Worklets.createRunInJsFn(
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

  const guessPicture = async () => {
    const imageBytes = image.readPixels();
    const rgbData = new Uint8Array(
      selectedModel.input.shape.width * selectedModel.input.shape.height * 3
    );

    for (let i = 0, j = 0; i < imageBytes.length; i += 4, j += 3) {
      rgbData[j] = imageBytes[i]; // Red
      rgbData[j + 1] = imageBytes[i + 1]; // Green
      rgbData[j + 2] = imageBytes[i + 2]; // Blue
    }

    console.log(rgbData.length);

    if (model) {
      try {
        const outputs = model.runSync([rgbData]);

        const topDetections: DetectionLocation[] = [];

        // 3. Interpret outputs accordingly
        const detection_boxes = outputs[0];
        const detection_classes = outputs[1];
        const detection_scores = outputs[2];
        const num_detections = outputs[3];
        console.log(`Detected ${num_detections[0]} objects!`);

        for (
          let i = 0;
          i < detection_boxes.length && topDetections.length < 3;
          i += 4
        ) {
          const confidence = detection_scores[i / 4];
          const class_label = detection_classes[i / 4];
          if (confidence > 0.4) {
            // 4. Draw a red box around the detected object!
            const top = detection_boxes[i];
            const left = detection_boxes[i + 1];
            const bottom = detection_boxes[i + 2];
            const right = detection_boxes[i + 3];

            topDetections.push({
              top,
              left,
              bottom,
              right,
              label:
                currentModel === "ssd_mobilenet_v1" ? labels[class_label] : "",
            });
          }
        }
        onGetFaceDetectorResponse(topDetections);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const frameProcessor = useFrameProcessor(
    (frame) => {
      "worklet";

      if (model) {
        const data = resize(frame, {
          size: {
            width: selectedModel.input.shape.width,
            height: selectedModel.input.shape.height,
          },
          //pixelFormat: "rgb",
          //dataType: "uint8",
          pixelFormat: "rgb-uint8",
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

          onGetFaceDetectorResponse(topDetections);
        });
      }
    },
    [model]
  );

  const takePhoto = async () => {
    const { width, height } = selectedModel.input.shape;
    const photo = await camera.current.takePhoto();

    ImageManipulator.manipulateAsync(
      photo.path,
      [{ resize: { width: width, height: height } }],
      { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
    ).then((res) => {
      setPhotoPath(res.uri);
    });
  };

  useEffect(() => {
    if (photoPath) {
      setTimeout(() => {
        setDetections([]);
      }, 0);
    }
  }, [photoPath]);

  const onBack = () => {
    setPhotoPath(null);
    setGuess("");
    setDetections([]);
  };

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
      {photoPath && (
        <Canvas style={{ flex: 1 }}>
          <Image
            image={image}
            fit="fill"
            x={0}
            y={0}
            width={Dimensions.get("window").width}
            height={Dimensions.get("window").height}
          />
        </Canvas>
      )}

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

      {!photoPath && (
        <Camera
          ref={camera}
          style={StyleSheet.absoluteFill}
          device={device}
          photo={true}
          isActive={!photoPath}
          pixelFormat="rgb"
          frameProcessor={frameProcessor}
        />
      )}

      {photoPath && (
        <View
          style={{ position: "absolute", bottom: 64, left: 100, zIndex: 10000 }}
        >
          <Text>{guess}</Text>
          <Button title="Guess" onPress={guessPicture} />
          <Button title="Back" onPress={onBack} />
        </View>
      )}

      {!photoPath && (
        <Pressable
          style={{
            position: "absolute",
            bottom: 50,
            left: "50%",
            marginLeft: -50,
            backgroundColor: "red",
            width: 100,
            height: 100,
            borderRadius: 50,
            zIndex: 10000,
          }}
          onPress={takePhoto}
        ></Pressable>
      )}

      {Object.entries(modelsInput).map(([key, value]) => (
        <View
          key={key}
          style={{ position: "absolute", right: 16, top: 64, gap: 8 }}
        >
          <Text>{JSON.stringify(value, undefined, 4)}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    //paddingBottom: 64,
  },
});