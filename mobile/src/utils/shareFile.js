import { Alert, Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

export async function shareFile(uri, mimeType, dialogTitle) {
  if (!(await Sharing.isAvailableAsync())) {
    Alert.alert("Partilha indisponível", "Este dispositivo não permite partilhar ficheiros.");
    return;
  }

  let shareUri = uri;
  if (Platform.OS === "android") {
    if (!FileSystem.documentDirectory) {
      throw new Error("Não foi possível preparar o ficheiro para partilha neste dispositivo.");
    }
    const sourceName = uri.split("/").pop()?.replace(/[^a-zA-Z0-9._-]/g, "_") || "documento";
    shareUri = `${FileSystem.documentDirectory}partilha-${Date.now()}-${sourceName}`;
    await FileSystem.copyAsync({ from: uri, to: shareUri });
  }

  await Sharing.shareAsync(shareUri, { mimeType, dialogTitle });
}
