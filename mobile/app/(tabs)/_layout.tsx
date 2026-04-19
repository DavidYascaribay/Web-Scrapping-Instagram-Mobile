import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../../context/ThemeContext';

export default function TabLayout() {
  const { isDark } = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: isDark ? '#4f8cff' : '#2563eb',
        tabBarInactiveTintColor: isDark ? '#94a3b8' : '#64748b',
        tabBarShowLabel: true,
        tabBarHideOnKeyboard: true,
        sceneStyle: {
          backgroundColor: isDark ? '#0b1020' : '#f5f7fb'
        },
        tabBarStyle: {
          backgroundColor: isDark ? '#121a2b' : '#ffffff',
          borderTopColor: isDark ? '#22304a' : '#e2e8f0',
          borderTopWidth: 1,
          height: 64 + insets.bottom,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 10),
          paddingHorizontal: 12
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginBottom: 2
        },
        tabBarItemStyle: {
          borderRadius: 14
        }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={size}
              color={color}
            />
          )
        }}
      />
    </Tabs>
  );
}