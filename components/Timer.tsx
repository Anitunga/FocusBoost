import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, Alert, FlatList, Image, Platform, ActivityIndicator } from 'react-native';
import { Audio } from 'expo-av';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Progress from 'react-native-progress'; // For the circular progress
import { doc, updateDoc, increment, getDoc, collection, getDocs, query, where, writeBatch, setDoc } from 'firebase/firestore';
import { db, auth } from '@/app/firebase';
import * as Notifications from 'expo-notifications';
import Slider from '@react-native-community/slider';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LottieView from 'lottie-react-native';
import { updateProfile } from 'firebase/auth';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { BlurView } from 'expo-blur';

interface User {
  id: string;
  displayName: string;
  photoURL: string;
  hasLotteryTicket: boolean;
}

interface PomodoroTimerProps {
  initialPomodoroDuration: number; // In seconds (default 25 minutes)
  initialBreakDuration: number; // In seconds (default 5 minutes)
}

interface UserStats {
  completedSessions: number;
  lastSessionDate: Date;
}

interface TimerSettings {
  pomodoroDuration: number;
  breakDuration: number;
  lastUpdated: Date;
}

interface UserData {
  points: number;
  completedSessions: number;
  currentStreak: number;
  rank: string;
  createdAt: Date;
  timerSettings?: TimerSettings;
  hasLotteryTicket?: boolean;
  receivedTicketFrom?: string;
  ticketViewed?: boolean;
  notifications?: number;
}

// Fonction utilitaire pour gérer les notifications de manière sécurisée
const sendNotification = async (title: string, body: string) => {
  if (Platform.OS !== 'web') {
    // Notifications natives pour mobile
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
        },
        trigger: null,
      });
    } catch (error) {
      console.log('Notification error:', error);
    }
  } else {
    // Notifications web natives si disponibles
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body });
    } else if ('Notification' in window && Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification(title, { body });
        }
      });
    }
    // Fallback si les notifications ne sont pas disponibles
    console.log(`${title}: ${body}`);
  }
};

const calculateRank = (points: number): string => {
  if (points < 100) return 'Beginner';
  if (points < 500) return 'Intermediate';
  if (points < 1000) return 'Advanced';
  return 'Expert';
};

// En haut du fichier, ajoutez le type pour la navigation
type RootStackParamList = {
  Social: { showTicket: boolean };
  // ... autres routes si nécessaire
};

const PomodoroTimer: React.FC<PomodoroTimerProps> = ({ initialPomodoroDuration, initialBreakDuration }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPomodoro, setIsPomodoro] = useState(true); // Track if it's a Pomodoro or Break session
  const [seconds, setSeconds] = useState(initialPomodoroDuration);
  const [modalVisible, setModalVisible] = useState(false);
  const [lotteryModalVisible, setLotteryModalVisible] = useState(false);
  const [pomodoroDuration, setPomodoroDuration] = useState(initialPomodoroDuration);
  const [breakDuration, setBreakDuration] = useState(initialBreakDuration);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [completedSessions, setCompletedSessions] = useState(0);
  const SESSIONS_FOR_TICKET = 3; // Nombre de sessions nécessaires pour avoir une chance d'obtenir un ticket
  const [isLoading, setIsLoading] = useState(true);
  const [showConfig, setShowConfig] = useState(false);
  const [ticketProgress, setTicketProgress] = useState(0);
  const [sessionsUntilTicket, setSessionsUntilTicket] = useState(3);
  const [showShareModal, setShowShareModal] = useState(false);
  const [userPoints, setUserPoints] = useState(0);

  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  // Charger les statistiques de l'utilisateur au démarrage
  useEffect(() => {
    loadUserStats();
  }, []);

  const loadUserStats = async () => {
    if (auth.currentUser) {
      try {
        setIsLoading(true);
        const userRef = doc(db, 'users', auth.currentUser.uid);
        const userDoc = await getDoc(userRef);
        const userData = userDoc.data();
        
        if (userData) {
          setCompletedSessions(userData.completedSessions || 0);
        }
      } catch (error) {
        console.error('Error loading user stats:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const updateUserStats = async (newCompletedSessions: number) => {
    if (auth.currentUser) {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      try {
        await updateDoc(userRef, {
          completedSessions: newCompletedSessions,
          lastSessionDate: new Date(),
        });
      } catch (error) {
        console.error('Error updating user stats:', error);
      }
    }
  };

  // Charger les utilisateurs pour le modal de ticket de loterie
  const loadUsers = async () => {
    const usersCollection = collection(db, 'users');
    const querySnapshot = await getDocs(usersCollection);
    const usersList = querySnapshot.docs
      .map(doc => ({
        id: doc.id,
        displayName: doc.data().displayName || doc.data().email.split('@')[0],
        photoURL: doc.data().photoURL || require('../assets/images/user.png'),  // Modification ici
        hasLotteryTicket: doc.data().hasLotteryTicket || false
      }))
      .filter(user => user.id !== auth.currentUser?.uid);
    setUsers(usersList);
  };

  const sendTicket = async (recipientId: string, recipientName: string) => {
    if (!auth.currentUser) {
      Alert.alert('Error', 'You must be logged in to send tickets');
      return;
    }
    
    try {
      const batch = writeBatch(db);
      const senderRef = doc(db, 'users', auth.currentUser.uid);
      const recipientRef = doc(db, 'users', recipientId);
      
      // Verify recipient exists
      const recipientDoc = await getDoc(recipientRef);
      if (!recipientDoc.exists()) {
        throw new Error('Recipient not found');
      }
      
      // Create a new notification document reference
      const notificationRef = doc(collection(db, 'notifications'));
      
      batch.update(senderRef, {
        hasLotteryTicket: false
      });
      
      batch.update(recipientRef, {
        hasLotteryTicket: true,
        receivedTicketFrom: auth.currentUser.displayName || 'a friend',
        ticketViewed: false,
        ticketReceiveDate: new Date(),
        notifications: increment(1)
      });
      
      batch.set(notificationRef, {
        type: 'LOTTERY_TICKET',
        recipientId,
        senderId: auth.currentUser.uid,
        senderName: auth.currentUser.displayName || 'Someone',
        status: 'unread',
        createdAt: new Date(),
        message: `${auth.currentUser.displayName || 'Someone'} sent you a lottery ticket!`
      });
      
      await batch.commit();
      
      await sendNotification(
        "New lottery ticket!",
        `You received a lottery ticket from ${auth.currentUser.displayName || 'a friend'}!`
      );
      
      setLotteryModalVisible(false);
      Alert.alert('Success', `Ticket sent to ${recipientName}`);
      
    } catch (error) {
      console.error('Error sending ticket:', error);
      Alert.alert('Error', 'Failed to send ticket');
    }
  };

  const handleSessionEnd = useCallback(async () => {
    setIsPlaying(false);
    
    if (!isPomodoro || !auth.currentUser) return;
    
    const userRef = doc(db, 'users', auth.currentUser.uid);
    
    try {
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data();
      
      const newCompletedSessions = (userData?.completedSessions || 0) + 1;
      const newPoints = (userData?.points || 0) + 25;
      
      const updates = {
        points: newPoints,
        completedSessions: newCompletedSessions,
        currentStreak: increment(1),
        lastSessionDate: new Date(),
        lastPointsUpdate: new Date()
      };
      
      await updateDoc(userRef, updates);
      
      // Update local state first for better UX
      setCompletedSessions(newCompletedSessions);
      setUserPoints(newPoints);
      
      // Check for lottery ticket
      if (newCompletedSessions % SESSIONS_FOR_TICKET === 0) {
        await updateDoc(userRef, {
          hasLotteryTicket: true,
          lastTicketWonDate: new Date()
        });
        setLotteryModalVisible(true);
      }
      
      // Update ticket progress
      const progress = newCompletedSessions % SESSIONS_FOR_TICKET;
      setTicketProgress(progress);
      await saveProgress(progress);
      
    } catch (error) {
      console.error('Error updating session data:', error);
      Alert.alert('Error', 'Failed to save session progress');
    }
  }, [isPomodoro, SESSIONS_FOR_TICKET]);

  // Timer management
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;

    if (isPlaying && seconds > 0) {
      interval = setInterval(() => {
        setSeconds(prev => {
          if (prev === 1) {
            handleSessionEnd(); // Appeler handleSessionEnd quand le timer atteint 0
            switchSession(); // Basculer entre Pomodoro et pause
          }
          return Math.max(prev - 1, 0);
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isPlaying, seconds]);

  const switchSession = () => {
    if (isPomodoro) {
      setSeconds(breakDuration);
      setIsPomodoro(false);
    } else {
      setSeconds(pomodoroDuration);
      setIsPomodoro(true);
    }
  };

  const formatTime = (sec: number) => {
    if (typeof sec !== 'number' || isNaN(sec)) {
      return '0:00';
    }
    const minutes = Math.floor(Math.max(0, sec) / 60);
    const remainingSeconds = Math.max(0, sec) % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  const handleDurationChange = (type: 'work' | 'break', value: string | number) => {
    const numValue = typeof value === 'string' ? parseInt(value, 10) : value;
    
    if (isNaN(numValue)) {
      return;
    }
    
    if (type === 'work') {
      const limitedValue = Math.min(Math.max(numValue, 1), 120);
      setPomodoroDuration(limitedValue * 60);
      if (!isPlaying) {
        setSeconds(limitedValue * 60);
      }
    } else {
      const breakValues = [0, 1, 2, 3, 5, 10];
      const closestValue = breakValues.reduce((prev, curr) => 
        Math.abs(curr - numValue) < Math.abs(prev - numValue) ? curr : prev
      );
      setBreakDuration(closestValue * 60);
      if (!isPlaying && !isPomodoro) {
        setSeconds(closestValue * 60);
      }
    }
  };

  // Formater l'affichage du temps pour les heures
  const formatDurationDisplay = (minutes: number) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours}h${mins > 0 ? ` ${mins}m` : ''}`;
    }
    return `${minutes}m`;
  };

  const saveDurations = () => {
    setPomodoroDuration(pomodoroDuration);
    setBreakDuration(breakDuration);
    setSeconds(isPomodoro ? pomodoroDuration : breakDuration); // Reset timer to the correct duration
    setModalVisible(false);
  };

  useEffect(() => {
    if (seconds === 0 && !isPomodoro) {
      handleSessionEnd();
    }
  }, [seconds, isPomodoro, handleSessionEnd]);

  // Pour réinitialiser manuellement le statut du ticket si nécessaire
  const resetLotteryTicket = async () => {
    if (auth.currentUser) {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, {
        hasLotteryTicket: false
      });
    }
  };

  const applySettings = () => {
    try {
      // Sauvegarder les préférences dans AsyncStorage
      AsyncStorage.setItem('userTimerSettings', JSON.stringify({
        pomodoroDuration,
        breakDuration,
        lastUpdated: new Date().toISOString()
      }));

      // Mettre à jour le timer actuel
      setSeconds(isPomodoro ? pomodoroDuration : breakDuration);
      
      // Sauvegarder dans Firebase si l'utilisateur est connecté
      if (auth.currentUser) {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        updateDoc(userRef, {
          timerSettings: {
            pomodoroDuration,
            breakDuration,
            lastUpdated: new Date()
          }
        });
      }

      setShowConfig(false);
      Alert.alert('Succès', 'Paramètres mis à jour avec succès');
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder les paramètres');
    }
  };

  // Fonction pour sauvegarder la progression
  const saveProgress = async (progress: number) => {
    if (auth.currentUser) {
      try {
        await AsyncStorage.setItem(
          `ticketProgress_${auth.currentUser.uid}`,
          JSON.stringify({
            progress,
            timestamp: new Date().toISOString()
          })
        );
      } catch (error) {
        console.error('Error saving progress:', error);
      }
    }
  };

  // Fonction pour charger la progression
  const loadProgress = async () => {
    if (auth.currentUser) {
      try {
        const savedProgress = await AsyncStorage.getItem(`ticketProgress_${auth.currentUser.uid}`);
        if (savedProgress) {
          const { progress, timestamp } = JSON.parse(savedProgress);
          const savedDate = new Date(timestamp);
          const today = new Date();
          
          // Vérifier si la progression est du même jour
          if (savedDate.toDateString() === today.toDateString()) {
            setTicketProgress(progress);
          }
        }
      } catch (error) {
        console.error('Error loading progress:', error);
      }
    }
  };

  // Ajouter le chargement de la progression au démarrage
  useEffect(() => {
    loadProgress();
  }, []);

  // Fonction pour partager le ticket
  const handleShareTicket = async (recipientId: string, recipientName: string) => {
    try {
      await sendTicket(recipientId, recipientName);
      await sendNotification(
        "Ticket Shared!",
        `You've successfully shared your ticket with ${recipientName}`
      );
      setShowShareModal(false);
    } catch (error) {
      Alert.alert('Error', "Failed to share ticket");
    }
  };

  // Ajouter cette fonction pour vérifier les tickets reçus au démarrage
  useEffect(() => {
    checkReceivedTickets();
  }, []);

  const checkReceivedTickets = async () => {
    if (auth.currentUser) {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data();

      if (userData?.hasLotteryTicket && userData?.receivedTicketFrom && !userData?.ticketViewed) {
        Alert.alert(
          "New Lottery Ticket!",
          `You received a ticket from ${userData.receivedTicketFrom}`,
          [
            {
              text: "View Ticket",
              onPress: () => {
                navigation.navigate('Social', { showTicket: true });
                updateDoc(userRef, { ticketViewed: true });
              }
            },
            {
              text: "Later",
              style: "cancel"
            }
          ]
        );
      }
    }
  };

  // Ajouter cette fonction pour vérifier les notifications
  const checkNotifications = async () => {
    if (!auth.currentUser) return;
    
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data() as UserData | undefined;

      if (userData?.notifications && userData.notifications > 0) {
        const notificationsQuery = query(
          collection(db, 'notifications'),
          where('recipientId', '==', auth.currentUser.uid),
          where('status', '==', 'unread')
        );

        const notifications = await getDocs(notificationsQuery);
        
        notifications.forEach(async (notif) => {
          const notifData = notif.data();
          
          if (notifData.type === 'LOTTERY_TICKET') {
            Alert.alert(
              "New Lottery Ticket!",
              notifData.message,
              [
                {
                  text: "View",
                  onPress: async () => {
                    navigation.navigate('Social', { showTicket: true });
                    await updateDoc(doc(db, 'notifications', notif.id), { 
                      status: 'read' 
                    });
                    // Update user's notification count
                    await updateDoc(userRef, {
                      notifications: increment(-1)
                    });
                  }
                },
                {
                  text: "Later",
                  style: "cancel"
                }
              ]
            );
          }
        });
      }
    } catch (error) {
      console.error('Error checking notifications:', error);
    }
  };

  // Ajouter l'effet pour vérifier les notifications
  useEffect(() => {
    const interval = setInterval(checkNotifications, 30000); // Vérifier toutes les 30 secondes
    return () => clearInterval(interval);
  }, []);

  // Initialize user data on first login
  const initializeUserData = async () => {
    if (!auth.currentUser) return;
    
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        await setDoc(userRef, {
          points: 0,
          completedSessions: 0,
          currentStreak: 0,
          rank: 'Beginner',
          createdAt: new Date(),
          timerSettings: {
            pomodoroDuration: 25 * 60,
            breakDuration: 5 * 60,
            lastUpdated: new Date()
          }
        });
      }
      
      // Load existing data
      const userData = userDoc.data();
      if (userData) {
        setUserPoints(userData.points || 0);
        setCompletedSessions(userData.completedSessions || 0);
        if (userData.timerSettings) {
          setPomodoroDuration(userData.timerSettings.pomodoroDuration);
          setBreakDuration(userData.timerSettings.breakDuration);
        }
      }
    } catch (error) {
      console.error('Error initializing user data:', error);
    }
  };

  useEffect(() => {
    if (auth.currentUser) {
      initializeUserData();
    }
  }, [auth.currentUser]);

  // Save settings to both AsyncStorage and Firebase
  const saveSettings = async () => {
    try {
      // Local storage
      await AsyncStorage.setItem('userTimerSettings', JSON.stringify({
        pomodoroDuration,
        breakDuration,
        lastUpdated: new Date().toISOString()
      }));

      // Firebase if user is logged in
      if (auth.currentUser) {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        await updateDoc(userRef, {
          timerSettings: {
            pomodoroDuration,
            breakDuration,
            lastUpdated: new Date()
          }
        });
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  // Load settings on component mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedSettings = await AsyncStorage.getItem('userTimerSettings');
        if (savedSettings) {
          const { pomodoroDuration: savedPomoDuration, breakDuration: savedBreakDuration } = JSON.parse(savedSettings);
          setPomodoroDuration(savedPomoDuration);
          setBreakDuration(savedBreakDuration);
          setSeconds(savedPomoDuration); // Reset current timer
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };
    
    loadSettings();
  }, []);

  return (
    <View style={styles.container}>
      {/* Bouton paramètres avec badge si des modifications sont en attente */}
      <TouchableOpacity 
        style={styles.settingsButton}
        onPress={() => setShowConfig(!showConfig)}
      >
        <MaterialIcons name="settings" size={24} color="#4CAF50" />
      </TouchableOpacity>

      {/* Panel de configuration */}
      {showConfig && (
        <View style={styles.configOverlay}>
          <View style={styles.configPanel}>
            <View style={styles.configHeader}>
              <Text style={styles.configTitle}>Timer Settings</Text>
              <TouchableOpacity 
                style={styles.closeConfigButton}
                onPress={() => setShowConfig(false)}
              >
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Work Duration */}
            <View style={styles.settingSection}>
              <Text style={styles.sectionTitle}>Work Duration</Text>
              <View style={styles.presetButtonsContainer}>
                {[1, 25, 30, 45, 60].map((duration) => (
                  <TouchableOpacity
                    key={duration}
                    style={[
                      styles.presetButton,
                      pomodoroDuration === duration * 60 && styles.presetButtonActive
                    ]}
                    onPress={() => handleDurationChange('work', duration)}
                  >
                    <Text style={[
                      styles.presetButtonText,
                      pomodoroDuration === duration * 60 && styles.presetButtonTextActive
                    ]}>{duration}m</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Break Duration */}
            <View style={styles.settingSection}>
              <Text style={styles.sectionTitle}>Break Duration</Text>
              <View style={styles.presetButtonsContainer}>
                {[5, 10, 15, 20].map((duration) => (
                  <TouchableOpacity
                    key={duration}
                    style={[
                      styles.presetButton,
                      breakDuration === duration * 60 && styles.presetButtonActive
                    ]}
                    onPress={() => handleDurationChange('break', duration)}
                  >
                    <Text style={[
                      styles.presetButtonText,
                      breakDuration === duration * 60 && styles.presetButtonTextActive
                    ]}>{duration}m</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity 
              style={styles.applyButton}
              onPress={applySettings}
            >
              <Text style={styles.applyButtonText}>Apply Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Timer et contrôles */}
      <View style={styles.timerContainer}>
        <Progress.Circle
          size={250}
          thickness={15}
          color="#4CAF50"
          unfilledColor="#f0f0f0"
          progress={seconds / (isPomodoro ? pomodoroDuration : breakDuration)}
          borderWidth={0}
          formatText={() => formatTime(seconds)}
          showsText
          textStyle={styles.timerText}
        />
      </View>

      <View style={styles.controlsContainer}>
        <TouchableOpacity onPress={() => setIsPlaying(!isPlaying)}>
          <Ionicons name={isPlaying ? 'pause' : 'play'} size={50} color="#1E90FF" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { setIsPlaying(false); setSeconds(isPomodoro ? pomodoroDuration : breakDuration); setSessionCompleted(false); }}>
          <Ionicons name="stop" size={50} color="#FF6347" />
        </TouchableOpacity>
      </View>

      {/* Progression du ticket */}
      <View style={styles.ticketProgressContainer}>
        <Text style={styles.ticketProgressTitle}>
          Progression vers le prochain ticket
        </Text>
        <Progress.Bar 
          progress={ticketProgress / sessionsUntilTicket}
          width={200}
          color="#FFD700"
          borderColor="#DDD"
          height={10}
          borderRadius={5}
        />
        <Text style={styles.ticketProgressText}>
          {`${ticketProgress}/${sessionsUntilTicket} sessions`}
        </Text>
      </View>

      {/* Modal du ticket gagné */}
      <Modal
        visible={lotteryModalVisible}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalContainer}>
          <View style={styles.ticketModalContent}>
            <View style={styles.ticket}>
              <View style={styles.ticketHeader}>
                <Text style={styles.ticketTitle}>🎉 LOTTERY TICKET 🎉</Text>
              </View>
              <View style={styles.ticketBody}>
                <Text style={styles.ticketNumber}>#{ Math.floor(Math.random() * 10000).toString().padStart(4, '0') }</Text>
                <Text style={styles.ticketDate}>{new Date().toLocaleDateString()}</Text>
              </View>
            </View>
            <Text style={styles.congratsText}>Congratulations!</Text>
            <Text style={styles.ticketText}>You've won a lottery ticket!</Text>
            <TouchableOpacity 
              style={styles.shareTicketButton}
              onPress={() => setShowShareModal(true)}
            >
              <Ionicons name="share-social" size={20} color="#FFF" />
              <Text style={styles.shareButtonText}>Share Ticket</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setLotteryModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#333',
    position: Platform.OS === 'web' ? 'absolute' : 'relative',
    zIndex: Platform.OS === 'web' ? 1 : 0,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    width: '50%',
  },
  settingsButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 10,
    zIndex: 1,
  },
  settingsText: {
    fontSize: 18,
    color: '#1E90FF',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 15,
  },
  username: {
    fontSize: 16,
  },
  closeButton: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f44336',
    borderRadius: 5,
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 15,
    width: '80%',
    paddingHorizontal: 10,
  },
  saveButton: {
    backgroundColor: '#1E90FF',
    padding: 10,
    borderRadius: 5,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 18,
  },
  webProgressContainer: {
    position: 'relative',
    width: 250,
    height: 250,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionCount: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
  ticketProgress: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  configOverlay: {
    position: 'absolute',
    top: 60,
    right: 10,
    zIndex: 1000,
    width: 300,  // Fixed width for settings panel
  },
  configPanel: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  configHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingBottom: 10,
  },
  closeConfigButton: {
    padding: 8,
  },
  configTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  settingSection: {
    marginBottom: 20,
    backgroundColor: '#F8F9FA',
    padding: 15,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  presetButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 15,
  },
  presetButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  presetButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  presetButtonText: {
    fontSize: 14,
    color: '#333',
  },
  presetButtonTextActive: {
    color: '#fff',
  },
  timerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 30,
  },
  //timerText: {
  //  fontSize: 40,
  //  fontWeight: 'bold',
  //  color: '#333',
  //},
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  durationInput: {
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    paddingHorizontal: 10,
    fontSize: 16,
    width: 80,
    textAlign: 'center',
  },
  durationUnit: {
    marginLeft: 10,
    fontSize: 16,
    color: '#666',
  },
  ticketProgressContainer: {
    marginTop: 20,
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ticketProgressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  ticketProgressText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  ticketModalContent: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    width: '80%',
    maxWidth: 300,
  },
  ticketAnimation: {
    width: 150,
    height: 150,
  },
  congratsText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700',
    marginTop: 15,
  },
  ticketText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  shareTicketButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  shareButtonText: {
    color: '#FFF',
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  friendAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  friendName: {
    fontSize: 16,
    color: '#333',
  },
  closeModalButton: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    alignItems: 'center',
  },
  closeModalText: {
    fontSize: 16,
    color: '#666',
  },
  ticket: {
    backgroundColor: '#FFD700',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  ticketHeader: {
    borderBottomWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#FFF',
    paddingBottom: 10,
    marginBottom: 10,
  },
  ticketTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
  },
  ticketBody: {
    alignItems: 'center',
  },
  ticketNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 5,
  },
  ticketDate: {
    fontSize: 14,
    color: '#666',
  },
  applyButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  applyButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PomodoroTimer;
