import React, { useState } from 'react';
import { View, TextInput, StyleSheet, Text, Alert, TouchableOpacity } from 'react-native';
import { auth, db } from '@/app/firebase'; // Assurez-vous que ce chemin est correct
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { router } from 'expo-router';
import * as Animatable from 'react-native-animatable';

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);

  const saveUserToFirestore = async (user: { uid: string; email: string }) => {
    const displayName = user.email.split('@')[0]; // Regex pour extraire le nom
    await setDoc(doc(db, 'users', user.uid), {
      email: user.email,
      displayName,
      photoURL: null,
      points: 0,
      hasLotteryTicket: false,
      rank: null,
    }, { merge: true });
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Required Fields", "Please fill in all required fields.", [{ text: "OK" }]);
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userRef = doc(db, 'users', userCredential.user.uid);
      
      // Vérifier si l'utilisateur existe déjà dans Firestore
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        // Créer un nouveau document utilisateur si c'est la première connexion
        await setDoc(userRef, {
          email: userCredential.user.email,
          points: 0,
          completedSessions: 0,
          currentStreak: 0,
          rank: 'Beginner',
          createdAt: new Date()
        }, { merge: true });
      }
      
      router.replace('/home');
    } catch (error: any) {
      Alert.alert('Login Failed', error.message);
    }
  };

  const handleSignUp = async () => {
    if (!email || !password) {
      Alert.alert("Required Fields", "Please fill in all required fields.", [{ text: "OK" }]);
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await saveUserToFirestore({
        uid: userCredential.user.uid,
        email: userCredential.user.email || '',
      });
      router.replace('/home');
    } catch (error: any) {
      Alert.alert('Sign Up Failed', error.message);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
  };

  const handleAuth = () => {
    if (isLogin) {
      handleLogin();
    } else {
      handleSignUp();
    }
  };

  return (
    <View style={styles.container}>
      <Animatable.View 
        animation={isLogin ? "fadeInLeft" : "fadeInRight"}
        duration={500}
        style={styles.container}
      >
        <Text style={styles.title}>
          {isLogin ? 'Login' : 'Sign Up'}
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Enter your email address"
          placeholderTextColor="#ccc" // Couleur du texte de l'espace réservé
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />

        <TextInput
          style={styles.input}
          placeholder="Enter your password"
          placeholderTextColor="#ccc" // Couleur du texte de l'espace réservé
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
        />

        <TouchableOpacity 
          style={[
            styles.authButton,
            { backgroundColor: isLogin ? '#1E90FF' : '#4CAF50' } // Couleurs pour le bouton
          ]} 
          onPress={handleAuth}
        >
          <Text style={styles.buttonText}>
            {isLogin ? 'Sign In' : 'Create Account'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.switchMode}
          onPress={toggleMode}
        >
          <Text style={styles.switchText}>
            {isLogin 
              ? "Don't have an account? Sign Up" 
              : "Already have an account? Sign In"}
          </Text>
        </TouchableOpacity>
      </Animatable.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#121212', // Couleur de fond sombre
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#fff', // Couleur du texte
  },
  input: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    marginBottom: 15,
    paddingHorizontal: 10,
    borderRadius: 5,
    backgroundColor: '#1E1E1E', // Couleur de fond des champs
    color: '#fff', // Couleur du texte
  },
  authButton: {
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: '#fff', // Couleur du texte du bouton
    fontSize: 16,
    fontWeight: '600',
  },
  switchMode: {
    marginTop: 20,
    alignItems: 'center',
  },
  switchText: {
    color: '#ccc', // Couleur du texte pour le changement de mode
    fontSize: 14,
    textDecorationLine: 'underline',
  }
});

export default LoginScreen;
