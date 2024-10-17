import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, Button, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { getAuth, signOut } from 'firebase/auth';
import { useNavigation } from '@react-navigation/native';

const ProfileScreen: React.FC = () => {
  const auth = getAuth();
  const user = auth.currentUser;
  const [profilePicture, setProfilePicture] = useState<string | null>(user?.photoURL || null);

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>No user logged in.</Text>
      </View>
    );
  }

  const handleImagePicker = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert('Permission to access camera roll is required!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    console.log(result); // Log the result to inspect its structure

    if (result.canceled) {
      return; // User canceled the picker
    }

    if (result.assets && result.assets.length > 0) {
      setProfilePicture(result.assets[0].uri); // Access uri from the first asset
    } else {
      Alert.alert('Failed to get image URI');
    }
  };

  const handleLogout = async () => {
    const navigation = useNavigation(); // Use navigation to redirect after logout
    try {
      await signOut(auth);
      Alert.alert('Logged out successfully');
      // Optionally, you can navigate back to the login screen here
      //navigation.navigate('index'); // Navigate back to the index page
    } catch (error: any) {
      Alert.alert('Logout failed', error.message);
    }
  };

  // Extract user name without @
  const displayName = user.email?.includes('@')
    ? user.email.split('@')[0]
    : user.email || 'User';

  return (
    <View style={styles.container}>
      <View style={styles.detailsContainer}>
        <Image 
          source={profilePicture || require('@/assets/images/user.png')}
          style={styles.profilePicture} 
        />
        <Text style={styles.title}>{displayName}</Text>
        <Text style={styles.email}>{user.email}</Text>
      </View>
      <View style={styles.buttonContainer}>
        <Button title="Edit" onPress={handleImagePicker} />
        <Button title="Logout" onPress={handleLogout} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  detailsContainer: {
    width: '90%',
    padding: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#f9f9f9',
  },
  profilePicture: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  email: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '90%',
  },
});

export default ProfileScreen;
