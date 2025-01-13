import Toast from "react-native-toast-message"

export const Clipboard = {
    setString(content: string) {
        navigator.clipboard.writeText(content)
        Toast.show({
            type: 'info',
            text1: "Copied to clipboard.",
            visibilityTime: 1000
        })
    }
}