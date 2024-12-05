import React from 'react';
import { StyleSheet, View } from 'react-native';
import Video from 'react-native-video';

const VideoBackground = () => {
  return (
    <View style={styles.container}>
      <Video
        source={require('../assets/images/background.mp4')} // Utilisation de la vidéo locale
        style={styles.video}
        repeat // Pour faire boucler la vidéo
        resizeMode="cover"
        muted // Pour couper le son
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: -1, // Assurez-vous que la vidéo est derrière le contenu
  },
  video: {
    width: '100%',
    height: '100%',
  },
});

export default VideoBackground; 