import { Tabs } from 'expo-router';
import { Image } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';


export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#1E90FF',
        headerStyle: {
          backgroundColor: '#fff',//'#25292e',
        },
        headerShadowVisible: false,
        headerTintColor: '#fff',
        headerTitle: () => (
          <Image
            source={require('@/assets/images/app.png')} // Path to your logo
            style={{ width: 60, height: 40 }} // Adjust logo size as needed
            resizeMode="contain"
          />
        ),
        tabBarStyle: {
        backgroundColor: '#fff',
        },
      }}
    >
      
      <Tabs.Screen
        name="index"
        options={{
          title: 'Login',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'globe-sharp' : 'globe-outline'} color={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="about"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home-sharp' : 'home-outline'} color={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'User',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person-sharp' : 'person-outline'} color={color} size={24} />
          ),
        }}
      />
    </Tabs>
  );
}
