import * as React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createStaticNavigation } from '@react-navigation/native';
import HomeScreen from './screens/HomeScreen'

const DrawerNavigator = createDrawerNavigator({
  screens: {
    Home: HomeScreen,
  },
});

const Navigation = createStaticNavigation(DrawerNavigator);

export default function App() {
    return <Navigation />;
}