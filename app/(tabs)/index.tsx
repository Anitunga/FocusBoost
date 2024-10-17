import React, { useState, useEffect } from 'react';
import { Text, View, StyleSheet, TextInput, Button, Alert, ActivityIndicator, TouchableOpacity } from 'react-native';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from '@/app/firebase';  // Ensure your Firebase config is correctly imported

export default function Index() {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false); // Track login status
  const [showRegister, setShowRegister] = useState<boolean>(false); // Track whether to show register button

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      setIsLoggedIn(!!user); // Set login status based on user's presence
      setShowRegister(false); // Hide register button when user is logged in
    });

    return () => unsubscribe(); // Clean up the listener
  }, []);

  // Sign-in function
  const signIn = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Email and password are required.');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      Alert.alert(`Hello, happy to see you again ${user.email}`);
      setShowRegister(false); // Hide register button on successful login
    } catch (error: any) {
      Alert.alert('Sign in failed', 'If you don\'t have an account, please register.');
      setShowRegister(true); // Show register button on sign-in failure
    } finally {
      setLoading(false);
    }
  };

  // Sign-up function
  const signUp = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Email and password are required.');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user; 
      Alert.alert(`Hello ${user.email}, welcome to FocusBoost!`);
      setShowRegister(false); // Hide register button after successful registration
    } catch (error: any) {
      Alert.alert('Registration failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Google Sign-In function
  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider); // Use signInWithRedirect for mobile
      const user = result.user;
      Alert.alert(`Welcome, ${user.displayName}!`);
    } catch (error: any) {
      Alert.alert('Google sign in failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const handleLogout = async () => {
    try {
      await signOut(auth);
      Alert.alert('Logged out successfully');
      setIsLoggedIn(false);
    } catch (error: any) {
      Alert.alert('Logout failed', error.message);
    }
  };

  if (loading) {
    return <ActivityIndicator size="large" color="#0000ff" />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.authBox}>
        <Text style={styles.title}>Authentication</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <View style={styles.buttonContainer}>
          {!isLoggedIn ? (
            showRegister ? (
              <Button title="Register" onPress={signUp} />
            ) : (
              <Button title="Login" onPress={signIn} />
            )
          ) : (
            <Button title="Logout" onPress={handleLogout} />
          )}
        </View>

        {/* Show Google Sign-In only when not showing the Register button */}
        {!showRegister && (
          <TouchableOpacity onPress={signInWithGoogle}>
            <Text style={styles.googleSignIn}>Sign in with Google</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f4f4f4', // Optional: Background color for the container
  },
  authBox: {
    width: '60%',
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 5, // For Android shadow
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
    fontWeight: 'bold',
  },
  input: {
    width: '100%',
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 12,
    paddingHorizontal: 10,
  },
  buttonContainer: {
    marginTop: 20,
    width: '100%',
  },
  googleSignIn: {
    marginTop: 15,
    color: '#4285F4', // Google color
    textDecorationLine: 'underline', // Make it look like a link
    textAlign: 'center', // Center align
  },
});
