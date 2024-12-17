import {
    DrawerContentScrollView,
    DrawerItemList,
    DrawerItem,
    DrawerContentComponentProps
} from '@react-navigation/drawer';
import { Linking } from 'react-native'
import { ToastAndroid } from 'react-native';

export function DevicesDrawerContent({ setDialogVisible_addDevice, allDeviceConnections, ...props }: CustomDrawerContentProps) {
    return (
        <DrawerContentScrollView {...props}>
            <DrawerItemList {...props} />
            {
                /*allDeviceConnections.map((value, index) => {
                    return <DrawerItem
                        label={value}
                        onPress={() => {}}
                        key={index}
                    />;
                })*/
            }
            <DrawerItem
                label="Connect to new Device"
                onPress={() => setDialogVisible_addDevice(true)}
            />
        </DrawerContentScrollView>
    );
}

interface CustomDrawerContentProps extends DrawerContentComponentProps {
    setDialogVisible_addDevice: React.Dispatch<React.SetStateAction<boolean>>,
    allDeviceConnections: string[]
}