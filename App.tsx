import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { initDB } from './src/db/db';
import { AppNavigator } from './src/navigation/AppNavigator';

export default function App() {
  useEffect(() => {
    console.log('[App] starting — platform:', Platform.OS, '| __DEV__:', __DEV__);
    try {
      initDB();
    } catch (e) {
      console.error('[App] initDB threw:', e);
    }
    console.log('[App] mount complete');
  }, []);

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <AppNavigator />
    </NavigationContainer>
  );
}
