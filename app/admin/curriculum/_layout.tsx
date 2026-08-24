import React from 'react';
import { Stack, useRouter } from 'expo-router';
import { TouchableOpacity, Platform, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants/theme';
import { useUser } from '@/context/UserContext';

export default function CurriculumAdminLayout() {
  const { isAdmin, loading } = useUser();
  const router = useRouter();

  if (!loading && !isAdmin) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Unauthorized access</Text>
      </View>
    );
  }
  
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.primary,
        },
        headerTintColor: COLORS.white,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        headerLeft: () => (
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={{ 
              marginRight: Platform.OS === 'ios' ? 0 : 16,
              padding: 4 
            }}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
        ),
      }}
    >
      <Stack.Screen 
        name="index" 
        options={{ 
          title: 'Curriculum & Content',
          // Override back button for the root to go back to Profile
          headerLeft: () => (
            <TouchableOpacity 
              onPress={() => router.push('/(tabs)/profile')} 
              style={{ 
                marginRight: Platform.OS === 'ios' ? 0 : 16,
                padding: 4 
              }}
            >
              <Ionicons name="arrow-back" size={24} color={COLORS.white} />
            </TouchableOpacity>
          ),
        }} 
      />

      <Stack.Screen 
        name="subject/[id]" 
        options={{ title: 'Manage Sections & Topics' }} 
      />
      <Stack.Screen 
        name="topic/[id]" 
        options={{ title: 'Content Editor' }} 
      />
    </Stack>
  );
}
