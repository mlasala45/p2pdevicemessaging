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
      <Text
        style={[
          styles.sectionDescription,
          {
            color: isDarkMode ? Colors.light : Colors.dark,
          },
        ]}>
        {children}
      </Text>
    </View>
  );
}

function HomeScreen(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';

  const [publicAddress, setPublicAddress] = useState({ ipv4: '', port: 0 })
  const [privateAddress, setPrivateAddress] = useState('')
  const publicAddressFound = publicAddress.ipv4 != ''
  const privateAddressFound = privateAddress != ''

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };

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
      NetworkInfo.getIPV4Address().then(ipv4Address => {
        setPrivateAddress(ipv4Address as string)
      });
    }
  })

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
  },
  highlight: {
    fontWeight: '700',
  },
});

export default HomeScreen;
