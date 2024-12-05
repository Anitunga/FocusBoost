import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, Image, ActivityIndicator } from 'react-native';
import { doc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { db, auth } from '@/app/firebase';
import * as Notifications from 'expo-notifications';

interface User {
  id: string;
  displayName: string;
  photoURL: string;
  hasLotteryTicket: boolean;
}

const sendNotification = async (title: string, body: string) => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
      },
      trigger: null, // Notification immédiate
    });
  } catch (error) {
    console.error('Error sending notification:', error);
  }
};

const LotteryTicket = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const usersCollection = collection(db, 'users');
      const querySnapshot = await getDocs(usersCollection);
      const usersList = querySnapshot.docs
        .map(doc => ({
          id: doc.id,
          displayName: doc.data().displayName || doc.data().email?.split('@')[0],
          photoURL: doc.data().photoURL || require('../assets/images/default-avatar.png'),
          hasLotteryTicket: doc.data().hasLotteryTicket || false,
        }))
        .filter(user => user.id !== auth.currentUser?.uid);
      setUsers(usersList);
    } catch (error) {
      console.error('Error loading users:', error);
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const sendTicket = async (recipientId: string, recipientName: string) => {
    try {
      const senderRef = doc(db, 'users', auth.currentUser!.uid);
      const recipientRef = doc(db, 'users', recipientId);

      await updateDoc(senderRef, {
        hasLotteryTicket: false
      });

      await updateDoc(recipientRef, {
        hasLotteryTicket: true
      });

      await sendNotification(
        "New lottery ticket!",
        `You have received a lottery ticket from ${auth.currentUser?.displayName || 'a friend'}!`
      );

      Alert.alert('Success', `Ticket sent to ${recipientName}`);
      loadUsers();
    } catch (error) {
      Alert.alert('Error', "Unable to send ticket");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Send Lottery Ticket</Text>
      {isLoading ? (
        <ActivityIndicator size="large" color="#1E90FF" />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.userItem}
              onPress={() => sendTicket(item.id, item.displayName)}
            >
              <Image 
                source={typeof item.photoURL === 'string' ? { uri: item.photoURL } : item.photoURL} 
                style={styles.avatar}
              />
              <Text style={styles.username}>{item.displayName}</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={() => (
            <Text style={styles.emptyText}>No users available</Text>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  username: {
    fontSize: 18,
    color: '#333',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#666',
    fontSize: 16,
  },
});

export default LotteryTicket;

