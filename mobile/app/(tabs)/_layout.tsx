import { Tabs } from 'expo-router'
import { View, Text } from 'react-native'
import { colors, fontSize } from '@/constants/theme'

function TabIcon({ focused, label, emoji }: { focused: boolean; label: string; emoji: string }) {
  return (
    <View style={{ alignItems: 'center', gap: 2 }}>
      <Text style={{ fontSize: 20 }}>{emoji}</Text>
      <Text style={{
        fontSize:   fontSize.xs,
        fontWeight: focused ? '600' : '400',
        color:      focused ? colors.accent : colors.textMuted,
      }}>
        {label}
      </Text>
    </View>
  )
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor:  colors.surface,
          borderTopColor:   colors.border,
          borderTopWidth:   1,
          height:           72,
          paddingBottom:    12,
          paddingTop:       8,
        },
        tabBarShowLabel:    false,
        tabBarActiveTintColor:   colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} label="Accueil" emoji="🏠" />,
        }}
      />
      <Tabs.Screen
        name="portfolio"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} label="Portfolio" emoji="📈" />,
        }}
      />
      <Tabs.Screen
        name="budget"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} label="Budget" emoji="💰" />,
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} label="Transactions" emoji="🔄" />,
        }}
      />
      <Tabs.Screen
        name="assistant"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} label="Assistant" emoji="🤖" />,
        }}
      />
    </Tabs>
  )
}
