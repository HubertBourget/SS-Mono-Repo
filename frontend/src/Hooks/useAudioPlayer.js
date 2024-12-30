import { useState, useRef, useEffect, useCallback } from "react";

const playListData = {
  time: "",
  volume: "",
  muted: false,
  playing: false,
  filledHeart: false,
  loop: false,
  shuffle: false,
  albumCoverUrl: "",
  artistName: "",
  queue: [],
  song: [],
  currentSongIndex: 0,
  album: null,
};

const useAudioPlayer = () => {
  const [state, setState] = useState(playListData);
  const audioRef = useRef(null);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);


  const getCurrentTime = () => {
    if (audioRef.current) {
      let totalSeconds = Math.floor(audioRef.current.currentTime);
      let minutes = Math.floor(totalSeconds / 60);
      let leftSeconds = totalSeconds - 60 * minutes;
      return `${minutes}:${leftSeconds < 10 ? "0" : ""}${leftSeconds}`;
    }
    return "0:00";
  };
  const setSongs = (songs, index) => {
    setState((prevState) => {
      const rearrangedSongs = [
        ...songs.slice(index), // Songs from the selected index to the end
        ...songs.slice(0, index), // Songs from the start up to the selected index
      ];
  
      return {
        ...prevState,
        song: rearrangedSongs,
        currentSongIndex: 0, // Set the current song to the first in the rearranged list
      };
    });
  };
  

  const getCurrentSong = () => {
    return state.song[state.currentSongIndex]?.id;
  };

  const getCurrentRunningStatus = () => {
    return state.playing
  }
  const playNext = async () => {
    const nextIndex = (state.currentSongIndex + 1) % state.song.length;
    setState((prevState) => ({
      ...prevState,
      currentSongIndex: nextIndex,
    }));
    audioRef.current.src = state.song[nextIndex].songUrl;
    setTimeout(async () => {
      await audioRef?.current?.load();
      await audioRef?.current?.play();
    }, 400);
  };
  const togglePlay = () => {
    setState((prevState) => ({
      ...prevState,
      playing: !prevState.playing,
    }));

    if (state.playing) {
      // Pause if already playing
      audioRef?.current?.pause();
    } else {
      // Attempt to play the audio
      const playPromise = audioRef?.current?.play();

      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            // Playback started successfully, update state
            setState((prevState) => ({
              ...prevState,
              playing: true,
            }));
          })
          .catch((error) => {
            // Autoplay was prevented or playback failed, revert the playing state
            console.error("Autoplay blocked or playback failed:", error);

            // Reset the state to not playing if it fails
            setState((prevState) => ({
              ...prevState,
              playing: false,
            }));
          });
      }
    }
  };


  const toggleHeart = () => {
    setState((prevState) => ({
      ...prevState,
      filledHeart: !prevState.filledHeart,
    }));
  };

  const handleVolume = (e, mute) => {
    let newVolume = e.target.value < 1 ? 0 : e.target.value;
    setState((prevState) => ({
      ...prevState,
      volume: newVolume,
      muted: newVolume < 1,
    }));
    audioRef.current.volume = newVolume / 100;
  };

  const handleTimeline = (e) => {
    setState((prevState) => ({
      ...prevState,
      time: e.target.value,
    }));
    audioRef.current.currentTime = e.target.value;
  };

  const getSongDuration = () => {
    if (audioRef.current) {
      let totalSeconds = Math.floor(audioRef.current.duration);
      let minutes = Math.floor(totalSeconds / 60);
      let leftSeconds = totalSeconds - 60 * minutes;
      return `${minutes}:${leftSeconds < 10 ? "0" : ""}${leftSeconds}`;
    }
    return "0:00";
  };

  const handleLoop = () => {
    const newLoopState = !state.loop;
    setState((prevState) => ({
      ...prevState,
      loop: newLoopState,
    }));
    audioRef.current.loop = newLoopState;
  };

  const playPrev = async () => {
    const prevIndex =
      (state.currentSongIndex - 1 + state.song.length) % state.song.length;
    setState((prevState) => ({
      ...prevState,
      currentSongIndex: prevIndex,
    }));
    audioRef.current.src = state.song[prevIndex].songUrl;
    await audioRef?.current?.load();
    await audioRef?.current?.play();
  };

  const handleShuffle = () => {
    const randomIndex = Math.floor(Math.random() * state.song.length);
    setState((prevState) => ({
      ...prevState,
      shuffle: true,
      currentSongIndex: randomIndex,
      playing: true,
    }));
  };
  const handlePlay = () => {
    setState((prevState) => ({ ...prevState, playing: true }));
  };
  return {
    state,
    stateRef,
    setState,
    audioRef,
    getCurrentTime,
    playNext,
    togglePlay,
    toggleHeart,
    handleVolume,
    handleTimeline,
    getSongDuration,
    handleLoop,
    playPrev,
    handleShuffle,
    handlePlay,
    setSongs,
    getCurrentSong,
    getCurrentRunningStatus,
  };
};

export default useAudioPlayer;
