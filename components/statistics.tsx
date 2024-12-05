import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image } from 'react-native';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db, auth } from '@/app/firebase';

interface UserStats {
  id: string;
  displayName: string;
  points: number;
  photoURL: string;
  rank: number;
}

const Statistics = () => {
  const [topUsers, setTopUsers] = useState<UserStats[]>([]);
  const [bestScorer, setBestScorer] = useState<UserStats | null>(null);

  useEffect(() => {
    loadTopScorers();
  }, []);

  const loadTopScorers = async () => {
    try {
      const usersCollection = collection(db, 'users');
      // Get only top 3 users ordered by points
      const q = query(
        usersCollection, 
        orderBy('points', 'desc'), 
        limit(3)
      );
      const querySnapshot = await getDocs(q);
      
      const users: UserStats[] = querySnapshot.docs.map((doc, index) => ({
        id: doc.id,
        displayName: doc.data().displayName || doc.data().email.split('@')[0],
        points: doc.data().points || 0,
        photoURL: doc.data().photoURL || require('../assets/images/user.png'),
        rank: index + 1
      }));

      setTopUsers(users);
      if (users.length > 0) {
        setBestScorer(users[0]);
      }
    } catch (error) {
      console.error('Error loading top scorers:', error);
    }
  };

  const renderUserItem = ({ item, index }: { item: UserStats; index: number }) => {
    const isCurrentUser = item.id === auth.currentUser?.uid;
    const medals = ['🥇', '🥈', '🥉'];
    
    return (
      <View style={[
        styles.userItem,
        index === 0 && styles.goldBackground,
        index === 1 && styles.silverBackground,
        index === 2 && styles.bronzeBackground,
      ]}>
        <Text style={styles.medal}>{medals[index]}</Text>
        <Image 
          source={{ uri: item.photoURL }} 
          style={styles.avatar} 
        />
        <View style={styles.userInfo}>
          <Text style={styles.username}>
            {isCurrentUser ? 'Me' : item.displayName}
          </Text>
          <Text style={styles.points}>{item.points} pts</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {bestScorer && (
        <View style={styles.bestScorerContainer}>
          <Text style={styles.title}>Best Scorer</Text>
          <Image 
            source={{ uri: bestScorer.photoURL }} 
            style={styles.bestScorerAvatar} 
          />
          <Text style={styles.bestScorerName}>
            {bestScorer.id === auth.currentUser?.uid ? 'Me' : bestScorer.displayName}
          </Text>
          <Text style={styles.bestScorerPoints}>{bestScorer.points} points</Text>
          <View style={styles.crown}>
            <Text style={styles.crownText}>👑</Text>
          </View>
        </View>
      )}
      
      <Text style={styles.podiumTitle}>Top 3 Players</Text>
      <FlatList
        data={topUsers}
        renderItem={renderUserItem}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  bestScorerContainer: {
    alignItems: 'center',
    backgroundColor: '#FFD700',
    borderRadius: 15,
    padding: 20,
    marginBottom: 30,
    position: 'relative',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#000',
  },
  bestScorerAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#fff',
    marginBottom: 10,
  },
  bestScorerName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 5,
  },
  bestScorerPoints: {
    fontSize: 18,
    color: '#000',
    fontWeight: '500',
  },
  crown: {
    position: 'absolute',
    top: -15,
    right: -15,
  },
  crownText: {
    fontSize: 30,
  },
  podiumTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: '#f5f5f5',
  },
  goldBackground: {
    backgroundColor: '#FFD70022',
  },
  silverBackground: {
    backgroundColor: '#C0C0C022',
  },
  bronzeBackground: {
    backgroundColor: '#CD7F3222',
  },
  medal: {
    fontSize: 24,
    marginRight: 10,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  username: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  points: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
});

export default Statistics;
