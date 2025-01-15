import React, { useEffect, useState } from 'react';
import type { PropsWithChildren } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
  Platform
} from 'react-native';

import { NetworkInfo } from '../util/network-info';

import { getPublicAddress } from '../networking/P2PNetworking';
import { encodeIpv4 } from '../util/ipaddrcode'
import { IconButton, TextInput } from 'react-native-paper';
import { Clipboard } from '../util/ClipBoard';

type SectionProps = PropsWithChildren<{
  title: string;
}>;

const Colors = {
  white: 'white',
  black: 'black',
  light: 'white',
  dark: 'black',
  darker: 'black',
  lighter: 'white'
}

function Section({ children, title }: SectionProps): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';
  return (
    <View style={styles.sectionContainer}>
      <Text
        style={[
          styles.sectionTitle,
          {
            color: isDarkMode ? Colors.white : Colors.black,
          },
        ]}>
        {title}
      </Text>
      {children &&
        <Text
          style={[
            styles.sectionDescription,
            {
              color: isDarkMode ? Colors.light : Colors.dark,
            },
          ]}>
          {children}
        </Text>}
    </View>
  );
}

function HomeScreen(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';

  const [publicAddress, setPublicAddress] = useState({ ipv4: '', port: 0 })
  const [privateAddress, setPrivateAddress] = useState('')
  const publicAddressFound = publicAddress.ipv4 != ''
  const privateAddressFound = privateAddress != ''

  const calculatorInvalidAddressMsg = 'INVALID'
  const [calculatorIPAddressStr, setCalculatorIPAddressStr] = useState('')
  const [calculatorAddressCode, setCalculatorAddressCode] = useState(calculatorInvalidAddressMsg)

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };
  const textColor = isDarkMode ? Colors.white : Colors.black

  useEffect(() => {
    if (!publicAddressFound) {
      getPublicAddress().then(data => {
        setPublicAddress(data)
      }).catch(err => {
        console.warn("Error getting public address")
        console.warn(err.message)
      })
    }

    if (!privateAddressFound) {
      NetworkInfo.getIPV4Address().then((ipv4Address: string) => {
        setPrivateAddress(ipv4Address as string)
      });
    }
  })

  function onChangeText_addressCodeCalculator(text: string) {
    setCalculatorIPAddressStr(text)

    try {
      setCalculatorAddressCode(encodeIpv4(text))
    }
    catch (e) {
      setCalculatorAddressCode(calculatorInvalidAddressMsg)
    }
  }

  const calculatorAddressCodeValid = calculatorAddressCode != calculatorInvalidAddressMsg
  function onPress_calculatorCopy() {
    if(calculatorAddressCodeValid) {
      Clipboard.setString(calculatorAddressCode)
    }
  }

  let publicAddressReadout, privateAddressReadout;
  if (publicAddressFound) {
    publicAddressReadout = <React.Fragment>
      <Text>{`${publicAddress.ipv4}:${publicAddress.port}\n`}</Text>
      <Text>Code: </Text>
      <Text style={{ fontWeight: 'bold' }}>{encodeIpv4(publicAddress.ipv4)}</Text>
      <Text>{"\nPort: "}</Text>
      <Text style={{ fontWeight: 'bold' }}>{publicAddress.port}</Text>
    </React.Fragment>
  }
  if (privateAddressFound) {
    privateAddressReadout = <React.Fragment>
      <Text>{`${privateAddress}\n`}</Text>
      <Text>Code: </Text>
      <Text style={{ fontWeight: 'bold' }}>{encodeIpv4(privateAddress)}</Text>
    </React.Fragment>
  }
  return (
    <SafeAreaView style={backgroundStyle}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={backgroundStyle.backgroundColor}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={backgroundStyle}>
        <View
          style={{
            backgroundColor: isDarkMode ? Colors.black : Colors.white,
          }}>
          <Section title="Public Address">
            {publicAddressFound
              ? publicAddressReadout
              : "[Fetching address...]"}
          </Section>
          <Section title="Private Address">
            { }
            {Platform.OS == 'web'
              ? "Cannot fetch your local IPV4 from a web client. Use command prompt (or equivalent)."
              : (privateAddressFound
                ? privateAddressReadout
                : "[Fetching address...]")
            }
          </Section>
          <Section title="Address Code Generator" />
          <View style={{ padding: 20 }}>
            <TextInput
              label="IPv4 Address"
              value={calculatorIPAddressStr}
              onChangeText={onChangeText_addressCodeCalculator}
              style={{
                marginBottom: 10,
                maxWidth:300
              }}
            />
            <View style={{flexDirection:'row', alignItems: 'center'}}>
              <Text style={{ fontSize: 18, padding: 5, color: textColor, flex: 1 }}>
                Code:
                <Text style={{ fontWeight: 'bold' }}> {calculatorAddressCode}</Text>
              </Text>
              <IconButton icon='content-copy' size={20} onPress={onPress_calculatorCopy} disabled={!calculatorAddressCodeValid}></IconButton>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sectionContainer: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
  },
  sectionDescription: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '400',
    flexDirection: 'column'
  },
  highlight: {
    fontWeight: '700',
  },
});

export default HomeScreen;
