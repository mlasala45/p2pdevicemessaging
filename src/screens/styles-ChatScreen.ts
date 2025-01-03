import { StyleSheet } from 'react-native'

import { rem, em } from '../util/style'
const max = Math.max

const styles = StyleSheet.create({
    chatScreen: {
        backgroundColor: '#002133',
        height: '100%',
        justifyContent: 'flex-end'
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
        maxWidth: '70%',
    },
    chatBubbleLeft: {
        alignSelf: 'flex-start',
        justifyContent: 'flex-start'
    },
    chatBubbleRight: {
        alignSelf: 'flex-end',
        justifyContent: 'flex-end'
    },
    chatBubbleText: {
        textAlign: 'left',
        color: 'white',
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

export default styles;