import React, { useState, useEffect } from 'react';
import { View, TextInput, FlatList, Alert, StyleSheet, TouchableOpacity, Image, Text, ActivityIndicator, Modal, Platform } from 'react-native';
import { db, auth } from '@/app/firebase';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { MaterialIcons } from '@expo/vector-icons';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { runTransaction } from 'firebase/firestore';

interface UserData {
  id: string;
  displayName: string;
  photoURL: string;
  points: number;
  hasLotteryTicket: boolean;
  tickets: number;
  rank?: string;
  completedSessions?: number;
}

const sendNotification = async (title: string, body: string) => {
  if (Platform.OS !== 'web') {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') {
          return;
        }
      }
      await Notifications.scheduleNotificationAsync({
        content: { title, body },
        trigger: null,
      });
    } catch (error) {
      console.log('Notification error:', error);
    }
  } else {
    console.log(`Notification: ${title} - ${body}`);
  }
};

const SocialScreen = ({ route }: { route: { params?: { showTicket?: boolean, sharing?: boolean } } }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<UserData[]>([]);
  const [allUsers, setAllUsers] = useState<UserData[]>([]);
  const [lotteryWinner, setLotteryWinner] = useState<UserData | null>(null);
  const [topUsers, setTopUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);

  const navigation = useNavigation();
  const handleShareTicket = async (recipientId: string, recipientName: string) => {
    if (!auth.currentUser?.uid) {
      Alert.alert('Error', 'You must be logged in to share tickets');
      return;
    }

    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data();

      if (!userData?.hasLotteryTicket) {
        Alert.alert('Error', 'You don\'t have a ticket to share');
        return;
      }

      const recipientRef = doc(db, 'users', recipientId);

      await runTransaction(db, async (transaction) => {
        transaction.update(userRef, { 
          hasLotteryTicket: false 
        });

        const recipientDoc = await transaction.get(recipientRef);
        const recipientData = recipientDoc.data();
        const currentTickets = recipientData?.tickets || 0;

        transaction.update(recipientRef, { 
          hasLotteryTicket: true,
          tickets: currentTickets + 1,
          lastTicketReceivedDate: new Date(),
          ticketSender: auth.currentUser?.displayName || 'Unknown'
        });
      });

      await sendNotification(
        "Ticket Shared!",
        `You've successfully shared your ticket with ${recipientName}`
      );

      setShowShareModal(false);
      await loadInitialData();
      
      Alert.alert('Success', `Ticket sent to ${recipientName}`);
      
      navigation.navigate('Home' as never);

    } catch (error) {
      console.error('Error sharing ticket:', error);
      Alert.alert('Error', "Failed to share ticket. Please try again.");
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (route.params?.showTicket) {
      showReceivedTicket();
    }
  }, [route.params?.showTicket]);

  useEffect(() => {
    if (route.params?.sharing) {
      setShowShareModal(true);
    }
  }, [route.params?.sharing]);

  const calculateRank = (points: number): string => {
    if (points >= 1000) return "🏆 Master";
    if (points >= 500) return "💫 Expert";
    if (points >= 250) return "⭐ Advanced";
    if (points >= 100) return "🌟 Intermediate";
    return "🌱 Beginner";
  };

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadLotteryWinner(),
        loadTopUsers(),
        loadAllUsers()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadLotteryWinner = async () => {
    try {
      const usersCollection = collection(db, 'users');
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const q = query(
        usersCollection,
        where('hasLotteryTicket', '==', true),
        where('lastTicketWonDate', '>=', today)
      );
      
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const currentUserDoc = snapshot.docs.find(doc => doc.id === auth.currentUser?.uid);
        
        if (currentUserDoc) {
          const userData = currentUserDoc.data();
          setLotteryWinner({
            id: currentUserDoc.id,
            displayName: userData.displayName || 'Unknown User',
            photoURL: userData.photoURL || require('../assets/images/user.png'),
            points: userData.points || 0,
            hasLotteryTicket: true,
            tickets: userData.tickets || 0,
            rank: calculateRank(userData.points || 0),
            completedSessions: userData.completedSessions || 0
          });
        } else {
          const winnerData = snapshot.docs[0].data();
          setLotteryWinner({
            id: snapshot.docs[0].id,
            displayName: winnerData.displayName || 'Unknown User',
            photoURL: winnerData.photoURL || require('../assets/images/user.png'),
            points: winnerData.points || 0,
            hasLotteryTicket: true,
            tickets: winnerData.tickets || 0,
            rank: calculateRank(winnerData.points || 0),
            completedSessions: winnerData.completedSessions || 0
          });
        }
      } else {
        setLotteryWinner(null);
      }
    } catch (error) {
      console.error('Error loading lottery winner:', error);
      Alert.alert('Erreur', 'Impossible de charger le gagnant de la loterie');
    }
  };

  const loadTopUsers = async () => {
    try {
      const usersCollection = collection(db, 'users');
      const q = query(
        usersCollection,
        orderBy('points', 'desc'),
        limit(3)
      );
      const snapshot = await getDocs(q);
      const users = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        rank: calculateRank(doc.data().points || 0)
      })) as UserData[];
      setTopUsers(users);
    } catch (error) {
      console.error('Error loading top users:', error);
    }
  };

  const loadAllUsers = async () => {
    try {
      const usersCollection = collection(db, 'users');
      const q = query(usersCollection, orderBy('points', 'desc'));
      const snapshot = await getDocs(q);
      const users = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          rank: calculateRank(doc.data().points || 0)
        })) as UserData[];
      setAllUsers(users);
    } catch (error) {
      console.error('Error loading all users:', error);
    }
  };

  const searchUsers = async () => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }
    const filtered = allUsers.filter(user => 
      user.displayName.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setSearchResults(filtered);
  };

  const renderLotteryWinner = () => {
    if (!lotteryWinner) {
      return (
        <View style={styles.noWinnerContainer}>
          <Text style={styles.noWinnerText}>No lottery winner today</Text>
        </View>
      );
    }

    const isCurrentUser = lotteryWinner.id === auth.currentUser?.uid;

    return (
      <View style={[styles.lotteryWinnerContainer, isCurrentUser && styles.currentUserWinner]}>
        <Text style={styles.sectionTitle}>
          {isCurrentUser ? '🎟️ Your Winning Ticket' : '🎟️ Today\'s Winner'}
        </Text>
        <View style={styles.winnerContent}>
          <Image 
            source={
              typeof lotteryWinner.photoURL === 'string' 
                ? { uri: lotteryWinner.photoURL }
                : lotteryWinner.photoURL
            } 
            style={styles.winnerAvatar} 
          />
          <View style={styles.winnerInfo}>
            <Text style={styles.winnerName}>
              {isCurrentUser ? 'You' : lotteryWinner.displayName}
            </Text>
            <Text style={styles.winnerPoints}>{lotteryWinner.points} points</Text>
            <Text style={styles.winnerRank}>{lotteryWinner.rank}</Text>
            <Text style={styles.winnerTickets}>
              🎟️ {lotteryWinner.tickets} tickets
            </Text>
            <Text style={styles.winnerSessions}>
              {lotteryWinner.completedSessions} sessions completed
            </Text>
          </View>
        </View>
        
        {isCurrentUser && (
          <TouchableOpacity 
            style={styles.shareTicketButton}
            onPress={() => setShowShareModal(true)}
          >
            <MaterialIcons name="share" size={24} color="#FFF" />
            <Text style={styles.shareButtonText}>Share Ticket</Text>
          </TouchableOpacity>
        )}

        <Modal
          visible={showShareModal}
          transparent={true}
          animationType="slide"
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Share Your Ticket</Text>
              <Text style={styles.modalSubtitle}>Choose a friend to send your ticket to:</Text>
              
              <FlatList
                data={allUsers.filter(user => user.id !== auth.currentUser?.uid)}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={styles.friendItem}
                    onPress={() => handleShareTicket(item.id, item.displayName)}
                  >
                    <Image 
                      source={typeof item.photoURL === 'string' ? { uri: item.photoURL } : item.photoURL} 
                      style={styles.friendAvatar}
                    />
                    <Text style={styles.friendName}>{item.displayName}</Text>
                  </TouchableOpacity>
                )}
              />
              
              <TouchableOpacity 
                style={styles.closeModalButton}
                onPress={() => setShowShareModal(false)}
              >
                <Text style={styles.closeModalText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    );
  };

  const renderTopUsers = () => (
    <View style={styles.topUsersContainer}>
      <Text style={styles.sectionTitle}>🏆 Top 3</Text>
      {topUsers.map((user, index) => (
        <View key={user.id} style={styles.topUserItem}>
          <Text style={styles.rankNumber}>{index + 1}</Text>
          <Image 
            source={
              typeof user.photoURL === 'string' 
                ? { uri: user.photoURL }
                : user.photoURL
            } 
            style={styles.topUserAvatar} 
          />
          <View style={styles.topUserInfo}>
            <Text style={styles.topUserName}>{user.displayName}</Text>
            <Text style={styles.topUserPoints}>{user.points} points</Text>
            <Text style={styles.topUserRank}>{user.rank}</Text>
          </View>
        </View>
      ))}
    </View>
  );

  const renderUserItem = ({ item }: { item: UserData }) => (
    <View style={styles.userItem}>
      <Image 
        source={
          typeof item.photoURL === 'string' 
            ? { uri: item.photoURL }
            : item.photoURL
        } 
        style={styles.avatar} 
      />
      <View style={styles.userInfo}>
        <View>
          <Text style={styles.userName}>{item.displayName}</Text>
          <Text style={styles.userPoints}>{item.points} points</Text>
          <Text style={styles.userRank}>{item.rank}</Text>
          <Text style={styles.userTickets}>🎟️ {item.tickets} tickets</Text>
        </View>
      </View>
    </View>
  );

  const showReceivedTicket = async () => {
    if (auth.currentUser) {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data();

      if (userData?.hasLotteryTicket) {
        setShowTicketModal(true);
      }
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        ListHeaderComponent={
          <>
            {renderLotteryWinner()}
            {renderTopUsers()}
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Rechercher des utilisateurs..."
                value={searchTerm}
                onChangeText={(text) => {
                  setSearchTerm(text);
                  if (!text.trim()) {
                    setSearchResults([]);
                  }
                }}
                onSubmitEditing={searchUsers}
                returnKeyType="search"
              />
            </View>
          </>
        }
        data={searchResults.length > 0 ? searchResults : allUsers}
        keyExtractor={(item) => item.id}
        renderItem={renderUserItem}
        refreshing={isRefreshing}
        onRefresh={async () => {
          setIsRefreshing(true);
          await loadInitialData();
          setIsRefreshing(false);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    margin: 10,
    paddingHorizontal: 10,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  userPoints: {
    fontSize: 14,
    color: '#4CAF50',
    marginTop: 2,
  },
  userRank: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  userTickets: {
    fontSize: 12,
    color: '#FF9800',
    marginTop: 2,
    fontWeight: '500',
  },
  lotteryWinnerContainer: {
    backgroundColor: '#FFD700',
    margin: 10,
    padding: 15,
    borderRadius: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  winnerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 10,
    padding: 10,
  },
  winnerInfo: {
    flex: 1,
    marginLeft: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: '#333',
  },
  winnerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  winnerPoints: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '500',
    marginTop: 4,
  },
  winnerRank: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  winnerTickets: {
    fontSize: 14,
    color: '#FF9800',
    marginTop: 4,
    fontWeight: '500',
  },
  winnerSessions: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  winnerAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#fff',
  },
  topUsersContainer: {
    backgroundColor: '#fff',
    margin: 10,
    padding: 15,
    borderRadius: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  topUserItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    backgroundColor: '#f8f8f8',
    padding: 10,
    borderRadius: 10,
  },
  rankNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    marginRight: 15,
    width: 30,
    color: '#4CAF50',
  },
  topUserAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  topUserInfo: {
    flex: 1,
  },
  topUserName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  topUserPoints: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
    marginTop: 2,
  },
  topUserRank: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  noWinnerContainer: {
    backgroundColor: '#f0f0f0',
    margin: 10,
    padding: 15,
    borderRadius: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  noWinnerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },
  currentUserWinner: {
    backgroundColor: '#4CAF50',
  },
  shareTicketButton: {
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
    alignItems: 'center',
  },
  shareButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 10,
    width: '80%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  friendAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  closeModalButton: {
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
    alignItems: 'center',
  },
  closeModalText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default SocialScreen;
