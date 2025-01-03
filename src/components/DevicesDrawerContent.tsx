import {
    DrawerContentScrollView,
    DrawerItemList,
    DrawerItem,
    DrawerContentComponentProps
} from '@react-navigation/drawer';
import React from 'react'

export function DevicesDrawerContent({ setDialogVisible_addDevice, ...props }: CustomDrawerContentProps) {
    function showDialog_addDevice() {
        setDialogVisible_addDevice(true)
    }

    return (
        <DrawerContentScrollView {...props}>
            <DrawerItemList {...props} />
            <DrawerItem
                label="Connect to new Device"
                onPress={() => showDialog_addDevice()}
            />
        </DrawerContentScrollView>
    );
}

interface CustomDrawerContentProps extends DrawerContentComponentProps {
    setDialogVisible_addDevice: React.Dispatch<React.SetStateAction<boolean>>,
}