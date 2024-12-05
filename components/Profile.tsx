import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, TextInput, ScrollView, Alert, Modal } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { getAuth, signOut, updateProfile } from 'firebase/auth';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, getStorage } from 'firebase/storage';
import { db } from '@/app/firebase';
import { router } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import LoginScreen from './login';

interface LotteryTicket {
  id: string;
  date: Date;
  message?: string;
}

const Profile = () => {
  const auth = getAuth();
  const storage = getStorage();
  const user = auth.currentUser;
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [profilePicture, setProfilePicture] = useState(
    user?.photoURL || require('../assets/images/user.png')
  );
  const [userRank, setUserRank] = useState<string | null>(null);
  const [userPoints, setUserPoints] = useState(0);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [hasLotteryTicket, setHasLotteryTicket] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [ticketMessage, setTicketMessage] = useState('');

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  useEffect(() => {
    checkLotteryTicket();
  }, [user]);

  const calculateRank = (points: number): string => {
    if (points >= 1000) return "🏆 Master";
    if (points >= 500) return "💫 Expert";
    if (points >= 250) return "⭐ Advanced";
    if (points >= 100) return "🌟 Intermediate";
    return "🌱 Beginner";
  };

  const fetchUserData = async () => {
    if (!user) return;
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();
      if (userData) {
        const points = userData.points || 0;
        setUserPoints(points);
        setUserRank(calculateRank(points));
        setCompletedSessions(userData.completedSessions || 0);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      Alert.alert('Erreur', 'Impossible de charger les données utilisateur');
    }
  };

  const checkLotteryTicket = async () => {
    if (!user) return;
    
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();
      setHasLotteryTicket(userData?.hasLotteryTicket || false);
    } catch (error) {
      console.error('Error checking lottery ticket:', error);
    }
  };

  const handleImagePicker = async () => {
    try {
      // Demander la permission
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert("Permission denied", "We need your permission to access your photos");
        return;
      }

      // Sélectionner l'image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled) {
        const imageUri = result.assets[0].uri;
        await uploadImage(imageUri);
      }
    } catch (error) {
      console.error('Erreur lors de la sélection de l\'image:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner l\'image');
    }
  };

  const uploadImage = async (uri: string) => {
    if (!user) return;

    try {
      // Convertir l'URI en blob
      const response = await fetch(uri);
      const blob = await response.blob();

      // Créer une référence unique pour l'image
      const imageRef = ref(storage, `profilePictures/${user.uid}/${Date.now()}.jpg`);

      // Upload l'image
      const uploadResult = await uploadBytes(imageRef, blob);

      // Obtenir l'URL de l'image
      const downloadURL = await getDownloadURL(uploadResult.ref);

      // Mettre à jour l'URL dans le state
      setProfilePicture(downloadURL);
      // Nettoyer le blob
      URL.revokeObjectURL(uri);

      return downloadURL;
    } catch (error) {
      console.error('Erreur lors de l\'upload de l\'image:', error);
      Alert.alert('Erreur', 'Impossible d\'uploader l\'image');
      throw error;
    }
  };

  const handleUpdateProfile = async () => {
    if (!user) return;

    try {
      // Mettre à jour le profil Firebase Auth
      await updateProfile(user, {
        displayName: displayName,
        photoURL: profilePicture
      });

      // Mettre à jour Firestore
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        displayName: displayName,
        photoURL: profilePicture
      });

      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      console.error('Erreur lors de la mise à jour du profil:', error);
      Alert.alert('Error', 'Unable to update profile');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      //router.replace('/login');
      return <LoginScreen />;
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      Alert.alert('Erreur', 'Impossible de se déconnecter');
    }
  };

  const handleShareTicket = () => {
    router.push({
      pathname: "./social",
      params: { sharing: "true" }
    });
    setShowTicketModal(false);
  };

  if (!user) {
    return <Text>No user logged in.</Text>;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Image 
          source={{ uri: profilePicture || 'https://via.placeholder.com/150' }} 
          style={styles.profilePicture} 
        />
        <TouchableOpacity style={styles.editPictureButton} onPress={handleImagePicker}>
          <Ionicons name="camera" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.label}>Username</Text>
        <TextInput
          style={styles.input}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Enter your username"
        />
        
        <Text style={styles.label}>Email</Text>
        <Text style={styles.emailText}>{user?.email}</Text>

        <Text style={styles.label}>Ranking</Text>
        <Text style={styles.rankText}>{userRank || 'Not ranked'}</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Rang</Text>
          <Text style={styles.statValue}>{userRank || 'Non classé'}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Points</Text>
          <Text style={styles.statValue}>{userPoints}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Sessions</Text>
          <Text style={styles.statValue}>{completedSessions}</Text>
        </View>
      </View>

      {hasLotteryTicket && (
        <TouchableOpacity 
          style={styles.ticketContainer}
          onPress={() => setShowTicketModal(true)}
        >
          <MaterialIcons name="confirmation-number" size={24} color="#000000" />
          <Text style={styles.ticketText}>You have a lottery ticket!</Text>
        </TouchableOpacity>
      )}

      <Modal
        visible={showTicketModal}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalContainer}>
          <View style={styles.ticketModalContent}>
            <View style={styles.ticket}>
              <View style={styles.ticketHeader}>
                <Text style={styles.ticketTitle}>🎉 LOTTERY TICKET 🎉</Text>
              </View>
              <View style={styles.ticketBody}>
                <Text style={styles.ticketNumber}>
                  #{Math.floor(Math.random() * 10000).toString().padStart(4, '0')}
                </Text>
                <Text style={styles.ticketDate}>{new Date().toLocaleDateString()}</Text>
              </View>
            </View>

            <TextInput
              style={styles.messageInput}
              placeholder="Add a message for the recipient..."
              value={ticketMessage}
              onChangeText={setTicketMessage}
              multiline
              maxLength={100}
            />

            <TouchableOpacity 
              style={styles.shareButton}
              onPress={handleShareTicket}
            >
              <MaterialIcons name="share" size={24} color="#FFF" />
              <Text style={styles.shareButtonText}>Share Ticket</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowTicketModal(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <TouchableOpacity style={styles.updateButton} onPress={handleUpdateProfile}>
        <Text style={styles.updateButtonText}>Update Profile</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  profilePicture: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 3,
    borderColor: '#fff',
  },
  editPictureButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#4CAF50',
    borderRadius: 20,
    padding: 10,
  },
  infoContainer: {
    width: '100%',
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  input: {
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 20,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  emailText: {
    fontSize: 16,
    marginBottom: 20,
    color: '#666',
  },
  rankText: {
    fontSize: 16,
    marginBottom: 20,
    color: '#666',
  },
  updateButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    marginBottom: 20,
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: '#f44336',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginVertical: 20,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    elevation: 2,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  noWinnerContainer: {
    backgroundColor: '#f5f5f5',
    margin: 10,
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
  },
  noWinnerText: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
  },
  ticketContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD700',
    padding: 15,
    borderRadius: 10,
    marginVertical: 10,
    gap: 10,
  },
  ticketText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  ticketModalContent: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 15,
    width: '90%',
    maxWidth: 400,
  },
  ticket: {
    backgroundColor: '#FFD700',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  ticketHeader: {
    borderBottomWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#FFF',
    paddingBottom: 10,
    marginBottom: 10,
  },
  ticketTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#000',
  },
  ticketBody: {
    alignItems: 'center',
  },
  ticketNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  ticketDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  messageInput: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 10,
    marginVertical: 15,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    gap: 10,
  },
  shareButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f44336',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    gap: 10,
  },
  closeButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default Profile;
