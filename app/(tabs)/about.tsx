import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, Button, TextInput, Switch, TouchableOpacity, Platform, ImageBackground, Alert } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import * as Notifications from 'expo-notifications';
import { WebView } from 'react-native-webview';

const PomodoroTimer: React.FC = () => {
  const [timeLeft, setTimeLeft] = useState<number>(1500); // 25 mins in seconds
  const [isActive, setIsActive] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false); // New state to track pause
  const [sessionDuration, setSessionDuration] = useState<string>('25'); // Input for session duration
  const [breakDuration, setBreakDuration] = useState<string>('5'); // Input for break duration
  const [skipBreaks, setSkipBreaks] = useState<boolean>(false); // Toggle skip breaks
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [completedSessions, setCompletedSessions] = useState<number>(0); // Statistics: completed sessions
  const [lottoTickets, setLottoTickets] = useState<number>(0); // New state to track lotto tickets

  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (isActive && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    }

    if (timeLeft === 0) {
      setIsActive(false);
      triggerNotification('Session complete!', 'Time to take a break!');
      setCompletedSessions((prev) => prev + 1); // Increment completed sessions
      handleLottoChance(); // Check if user gets a lotto ticket
    }

    return () => clearInterval(timer);
  }, [isActive, timeLeft]);

  const triggerNotification = async (title: string, body: string) => {
    if (Platform.OS !== 'web') {
      await Notifications.scheduleNotificationAsync({
        content: { title, body },
        trigger: null,
      });
    } else {
      console.log(`Notification: ${title} - ${body}`);
    }
  };

  // Function to handle lotto ticket chance
  const handleLottoChance = () => {
    const chance = Math.random();
    if (chance < 0.33) { // 1/3 chance to get a lotto ticket
      setLottoTickets((prev) => prev + 1);
      Alert.alert('Congratulations!', 'You won a lotto ticket!');
    } else {
      Alert.alert('Session Complete', 'Keep going for more chances to win a lotto ticket!');
    }
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  };

  const handleStart = () => {
    if (!isActive && !isPaused) { // If not active and not paused, reset time to session duration
      setTimeLeft(parseInt(sessionDuration) * 60);
    }
    setIsActive(true);
    setIsPaused(false);
    triggerNotification('Focus started!', 'Let’s get to work!');
  };

  const handlePause = () => {
    setIsActive(false); // Pause the timer
    setIsPaused(true); // Mark as paused
  };

  const handleContinue = () => {
    setIsActive(true); // Resume the timer
    setIsPaused(false); // Mark as resumed
    triggerNotification('Focus continued!', 'Let’s get back to work!');
  };

  const handleReset = () => {
    setIsActive(false);
    setIsPaused(false); // Reset paused state
    setTimeLeft(parseInt(sessionDuration) * 60); // Reset time to session duration
  };

  const radius = 60;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (timeLeft / (parseInt(sessionDuration) * 60)) * circumference;

  return (
    <View style={styles.container}>
      <ImageBackground 
        source={require('@/assets/images/app.png')} // Path to your background logo
        style={styles.backgroundImage} // Style for the background
        imageStyle={styles.logoImage} // Additional styling for the image itself
      >
        <View style={styles.timerContainer}>
          {showSettings ? (
            <View style={styles.settingsContainer}>
              <Text style={styles.label}>Session Duration (minutes):</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={sessionDuration}
                onChangeText={setSessionDuration}
              />
              <Text style={styles.label}>Break Duration (minutes):</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={breakDuration}
                onChangeText={setBreakDuration}
              />
              <View style={styles.switchContainer}>
                <Text>Skip Breaks:</Text>
                <Switch value={skipBreaks} onValueChange={setSkipBreaks} />
              </View>
              <Button title="Save Settings" onPress={() => setShowSettings(false)} />
            </View>
          ) : (
            <>
              <Svg height="140" width="140">
                <Circle
                  stroke="#e6e6e6"
                  fill="none"
                  cx="70"
                  cy="70"
                  r={radius}
                  strokeWidth={strokeWidth}
                />
                <Circle
                  stroke="#1E90FF"
                  fill="none"
                  cx="70"
                  cy="70"
                  r={radius}
                  strokeWidth={strokeWidth}
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  rotation="-90"
                  originX="70"
                  originY="70"
                />
              </Svg>
              <Text style={styles.timer}>{formatTime(timeLeft)}</Text>
              <View style={styles.buttonContainer}>
                {isActive ? (
                  <TouchableOpacity style={styles.startButton} onPress={handlePause}>
                    <Text style={styles.buttonText}>Pause</Text>
                  </TouchableOpacity>
                ) : isPaused ? (
                  <TouchableOpacity style={styles.startButton} onPress={handleContinue}>
                    <Text style={styles.buttonText}>Continue</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.startButton} onPress={handleStart}>
                    <Text style={styles.buttonText}>Start Focus</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
                  <Text style={styles.buttonText}>Reset</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowSettings(true)}>
                  <Text style={styles.settingsLink}>Settings</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          <View style={styles.statsContainer}>
            <Text style={styles.statsTitle}>Pomodoro Statistics</Text>
            <Text style={styles.statsText}>Completed Sessions: {completedSessions}</Text>
            <Text style={styles.statsText}>Lotto Tickets Collected: {lottoTickets}</Text> {/* Display lotto tickets */}
          </View>
        </View>
      </ImageBackground>

      <View style={styles.calendarContainer}>
        <Text style={styles.calendarTitle}>Google Calendar</Text>
        {Platform.OS === 'web' ? (
          <iframe
            src="https://calendar.google.com/calendar/embed?src=alainmichaelinitunga232@gmail.com&ctz=America%2FNew_York"
            style={styles.calendar}
            frameBorder="0"
            scrolling="no"
          ></iframe>
        ) : (
          <WebView
            source={{ uri: 'https://calendar.google.com/calendar/embed?src=alainmichaelinitunga232@gmail.com&ctz=America%2FNew_York' }}
            style={styles.calendar}
          />
        )}
      </View>
    </View>
  );
};

export default PomodoroTimer;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f4f4',
    justifyContent: 'flex-start',
    padding: 20,
    flexDirection: 'row',
  },
  backgroundImage: {
    flex: 0.6,
    paddingRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    opacity: 0.1,
    resizeMode: 'cover',
  },
  timerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarContainer: {
    flex: 0.4,
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    elevation: 5,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  calendar: {
    width: '100%',
    height: 300,
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  settingsContainer: {
    padding: 20,
    backgroundColor: '#444',
    borderRadius: 10,
    elevation: 5,
  },
  label: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 10,
  },
  input: {
    height: 40,
    backgroundColor: '#555',
    color: '#fff',
    paddingHorizontal: 10,
    marginBottom: 10,
    width: '80%',
    textAlign: 'center',
    borderRadius: 5,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  timer: {
    fontSize: 48,
    color: '#000',
    marginVertical: 20,
  },
  buttonContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#1E90FF',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 5,
  },
  resetButton: {
    backgroundColor: '#555',
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 5,
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
  },
  settingsLink: {
    color: '#1E90FF',
    marginTop: 20,
    textDecorationLine: 'underline',
  },
  statsContainer: {
    marginTop: 20,
  },
  statsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  statsText: {
    fontSize: 16,
  },
});
