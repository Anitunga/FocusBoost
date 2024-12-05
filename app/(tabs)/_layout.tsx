import { Tabs } from 'expo-router';
import { Image } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { auth } from '@/app/firebase';
import { User } from 'firebase/auth';
import { router } from 'expo-router';
import LoginScreen from '@/components/login'; // Assurez-vous que le chemin est correct

export default function TabLayout() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      if (!user) {
        //router.replace('/login');
        //router.push('./login');
        return <LoginScreen />;
      }
    });

    return () => unsubscribe();
  }, []);

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#1E90FF',
        headerStyle: {
          backgroundColor: '#fff',
        },
        headerShadowVisible: false,
        headerTintColor: '#fff',
        headerTitle: () => (
          <Image
            source={require('@/assets/images/app.png')}
            style={{ width: 60, height: 40 }}
            resizeMode="contain"
          />
        ),
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home-sharp' : 'home-outline'} color={color} size={24} />
          ),
        }}
      />
    </Tabs>
  );
}
