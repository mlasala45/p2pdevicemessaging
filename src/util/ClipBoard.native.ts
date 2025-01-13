import ClipboardNative from "@react-native-clipboard/clipboard";

export const Clipboard = {
    setString(content: string) {
        ClipboardNative.setString(content)
    }
}