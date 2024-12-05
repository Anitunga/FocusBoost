import React, { useState, useEffect } from 'react';
import { View, Button, Modal, StyleSheet, Text, Image } from 'react-native';
import PomodoroTimer from '@/components/Timer';
import Profile from '@/components/Profile';
import Statistics from '@/components/statistics';
import Social from '@/components/social';
import Icon from 'react-native-vector-icons/Ionicons';
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { router } from 'expo-router';
import LoginScreen from '@/components/login';

interface LotteryTicket {
  id: string;
  purchaseDate: Date;
  drawDate: Date;
  numbers: number[];
  status: 'active' | 'drawn' | 'won' | 'expired';
  prize?: number;
}

interface NotificationSystem {
  types: {
    LOTTERY_DRAW: 'Tirage imminent';
    TICKET_WIN: 'Ticket gagnant';
    FRIEND_ACTIVITY: 'Activité sociale';
    DAILY_REMINDER: 'Rappel quotidien';
  };
  preferences: {
    pushEnabled: boolean;
    emailEnabled: boolean;
    notificationTypes: string[];
  };
}

const HomeScreen = () => {
  const [modalVisible, setModalVisible] = useState({
    timer: false,
    profile: false,
    statistics: false,
    social: false,
  });

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        //router.replace('/login');
        return <LoginScreen />;
      }
    });

    return () => unsubscribe();
  }, []);

  const openModal = (component: string) => {
    setModalVisible({ ...modalVisible, [component]: true });
  };

  const closeModal = () => {
    setModalVisible({
      timer: false,
      profile: false,
      statistics: false,
      social: false,
    });
  };

  return (
    <View style={styles.container}>
      <Image
        source={require('@/assets/images/app.png')}
        style={styles.backgroundLogo}
        resizeMode="cover"
      />
      <View style={styles.buttonContainer}>
        {/* Timer Section */}
        <Button title="Open Timer" onPress={() => openModal('timer')} color="#4CAF50" />
        <Modal visible={modalVisible.timer} animationType="slide" onRequestClose={closeModal}>
          <View style={styles.modalContent}>
            <PomodoroTimer initialPomodoroDuration={1500} initialBreakDuration={300} />
            <Icon.Button
              name="close-circle"
              size={30}
              backgroundColor="transparent"
              color="#F44336"
              onPress={closeModal}
              style={styles.closeButton}
            >
              Close
            </Icon.Button>
          </View>
        </Modal>

        {/* Profile Section */}
        <Button title="Open Profile" onPress={() => openModal('profile')} color="#3F51B5" />
        <Modal visible={modalVisible.profile} animationType="slide" onRequestClose={closeModal}>
          <View style={styles.modalContent}>
            <Profile />
            <Icon.Button
              name="close-circle"
              size={30}
              backgroundColor="transparent"
              color="#F44336"
              onPress={closeModal}
              style={styles.closeButton}
            >
              Close
            </Icon.Button>
          </View>
        </Modal>

        {/* Statistics Section */}
        <Button title="Open Statistics" onPress={() => openModal('statistics')} color="#FF9800" />
        <Modal visible={modalVisible.statistics} animationType="slide" onRequestClose={closeModal}>
          <View style={styles.modalContent}>
            <Statistics />
            <Icon.Button
              name="close-circle"
              size={30}
              backgroundColor="transparent"
              color="#F44336"
              onPress={closeModal}
              style={styles.closeButton}
            >
              Close
            </Icon.Button>
          </View>
        </Modal>

        {/* Social Section */}
        <Button title="Open Social" onPress={() => openModal('social')} color="#E91E63" />
        <Modal visible={modalVisible.social} animationType="slide" onRequestClose={closeModal}>
          <View style={styles.modalContent}>
            <Social route={{ params: {} }} />
            <Icon.Button
              name="close-circle"
              size={30}
              backgroundColor="transparent"
              color="#F44336"
              onPress={closeModal}
              style={styles.closeButton}
            >
              Close
            </Icon.Button>
          </View>
        </Modal>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    position: 'relative', // This allows positioning of the background logo
  },
  backgroundLogo: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.2, // Adjust opacity to make the logo less intrusive
  },
  buttonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20, // Ajoute un espacement entre les boutons
  },
  modalContent: {
    flex: 1,
    padding: 20,
    justifyContent: 'flex-start',
    backgroundColor: '#fff',
  },
  closeButton: {
    marginTop: 20, // Add some spacing above the button
    alignSelf: 'center', // Center the button horizontally
  },
});

export default HomeScreen;
