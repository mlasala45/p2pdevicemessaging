import { DrawerScreenProps } from '@react-navigation/drawer';
import React, { useEffect } from 'react';
import { StyleSheet, View, FlatList, Text } from 'react-native';
import { IconButton, TextInput, MD3Colors } from 'react-native-paper';

import { rem, em } from '../util/style'
const max = Math.max

const styles = StyleSheet.create({
    chatScreen: {
        backgroundColor: '#002133',
        height: '100%'
    },
    chatBubbleCommon: {
        borderStyle: 'solid',
        borderWidth: max(1, rem(0.0625)),
        borderRadius: rem(0.7),
        paddingStart: 8,//em(.12),
        paddingEnd: 8,// em(.5),
        paddingTop: 5,
        paddingBottom: 5,
        lineHeight: 18,
        marginBottom: 5,
        backgroundColor: '#6495ED',
    },
    chatBubbleLeft: {
        alignSelf: 'flex-start',
        justifyContent: 'flex-start'
    },
    chatBubbleRight: {
        alignSelf: 'flex-end',
        justifyContent: 'flex-end'
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginBottom: 10,
        marginTop: 10
    },
    textInputContainer: {
        flexDirection: 'row',
        borderRadius: 50,
        backgroundColor: '#273746',
        alignSelf: 'flex-end',
        justifyContent: 'flex-end',
        width: '80%',
    },
    textInput: {
        backgroundColor: 'clear',
        marginEnd: 0,
        paddingTop: 5,
        paddingBottom: 5,
        //left: 0
    },
})

function ChatBubble({ contentStr, local }: ChatDataEntry) {
    return (<View style={{
        ...styles.chatBubbleCommon,
        ...(local ? styles.chatBubbleRight : styles.chatBubbleLeft)
    }}>
        <Text style={{
            textAlign: 'left',
            maxWidth: '70%',
            color: 'white'
        }}>{contentStr}</Text>
    </View >)
}

const DATA = [] as ChatDataEntry[]

//TODO: Decide how to type 'route'
function ChatScreen({ route }): React.JSX.Element {
    const connection = route.params?.connection as string;

    useEffect(() => {
        [{
            id: '0',
            contentStr: `Hi! This is the chat for ${connection}!`,
            local: false
        },
        {
            id: '1',
            contentStr: `This is a second message!`,
            local: true
        },
        {
            id: '2',
            contentStr: `And this is a third!`,
            local: false
        },
        {
            id: '3',
            contentStr: `And this is a really really really really really really really really really really really really really really really really really really really long message!!!`,
            local: true
        },
        {
            id: '4',
            contentStr: `This message has a newline!\nAnd then more text!\nIsn't it fabulous?`,
            local: true
        }].forEach((msgData) => {
            DATA.push(msgData)
        })
    }, [])

    const [inputText, setInputText] = React.useState('')

    function sendMessage(contentStr: string) {
        DATA.unshift({
            id: Date.now().toString(),
            contentStr: contentStr,
            local: true
        })
        setInputText('')
    }

    return (
        <View style={styles.chatScreen}>
            <FlatList
                data={DATA}
                renderItem={({ item }) => <ChatBubble {...item} />}
                keyExtractor={item => item.id}
                inverted={true}
            />
            <View style={styles.footer}>
                <View style={styles.textInputContainer}>
                    <TextInput
                        value={inputText}
                        onChangeText={text => setInputText(text)}
                        style={styles.textInput}
                        dense
                    />
                    <IconButton
                        icon="send"
                        iconColor={'#5dade2'}
                        size={20}
                        onPress={() => sendMessage(inputText)}
                    />
                </View>
            </View>
        </View>
    )
}

interface ChatScreenProps {
    connection: string,
}

interface ChatDataEntry {
    id: string,
    contentStr: string,
    local: boolean
}

export default ChatScreen;