import {
    DrawerContentScrollView,
    DrawerItem,
    DrawerContentComponentProps
} from '@react-navigation/drawer';
import React from 'react'
import { allChatChannelsDetailsData } from '../ChatData';
import { Divider } from 'react-native-paper';
import { Text } from 'react-native-gesture-handler';

export function DevicesDrawerContent({ setDialogVisible_addDevice, ...props }: CustomDrawerContentProps) {
    function showDialog_addDevice() {
        setDialogVisible_addDevice(true)
    }

    const predefined_names = ['Home', 'Settings']
    let knownChannelNames = allChatChannelsDetailsData.map(data => data.name)

    let descriptorSections: Record<string, any> = []
    for (let i = 0; i < 3; i++) descriptorSections[i] = {}
    Object.entries(props.descriptors).forEach(([key, value]) => {
        const name = value.route.name
        if (predefined_names.includes(name)) {
            descriptorSections[0][key] = value
        }
        else if (knownChannelNames.includes(name)) {
            descriptorSections[1][key] = value
        }
        else {
            descriptorSections[2][key] = value
        }
    })

    /*let props_modified = []
    for (let i = 0; i < descriptorSections.length; i++) {
        props_modified[i] = {
            ...props,
            descriptors: descriptorSections[i]
        }
    }*/

    function DrawerItemList(descriptors: Record<string, any>, precedeWithDivider: boolean) {
        const length = Object.keys(descriptors).length
        if (length > 0) {
            return (
                <React.Fragment>
                    {precedeWithDivider && <Divider />}
                    {Object.entries(descriptors).map(([key, descriptor]) => {
                        const name = descriptor.route.name
                        const labelFn = descriptor.options.drawerLabel ? (props: { focused: boolean, color: string }) => descriptor.options.drawerLabel(props) : undefined
                        return <DrawerItem
                            label={labelFn || name}
                            onPress={() => props.navigation.navigate(name)} />
                    })}
                </React.Fragment>
            )
        }
        else {
            return null
        }
    }

    return (
        <DrawerContentScrollView {...props}>
            {DrawerItemList(descriptorSections[0], false)}
            <DrawerItem
                label="Connect to new Device"
                onPress={() => showDialog_addDevice()}
            />
            {DrawerItemList(descriptorSections[1], true)}
            {DrawerItemList(descriptorSections[2], true)}
        </DrawerContentScrollView>
    );
}

interface CustomDrawerContentProps extends DrawerContentComponentProps {
    setDialogVisible_addDevice: React.Dispatch<React.SetStateAction<boolean>>,
}