import * as React from 'react';
import { View } from 'react-native';
import { Button, Dialog, Portal, PaperProvider, Text, TextInput } from 'react-native-paper';

const AddDeviceDialog = ({ visible, setVisible, onSubmit }: AddDeviceDialogProps) => {
    const [deviceAddress, setDeviceAddress] = React.useState("");
    
    const showDialog = () => setVisible(true);
    const hideDialog = () => setVisible(false);

    return (
        <Dialog visible={visible} onDismiss={hideDialog}>
            <Dialog.Title>Send Connection Request</Dialog.Title>
            <Dialog.Content>
                <TextInput
                    label="Network Address"
                    value={deviceAddress}
                    onChangeText={text => setDeviceAddress(text)}
                />
            </Dialog.Content>
            <Dialog.Actions>
                <Button onPress={() => {
                    hideDialog();
                    onSubmit(deviceAddress);
                }}>Send</Button>
            </Dialog.Actions>
        </Dialog>
    );
};

interface AddDeviceDialogProps {
    visible: boolean,
    setVisible: React.Dispatch<React.SetStateAction<boolean>>
    onSubmit: (address : string) => void
}

export default AddDeviceDialog;