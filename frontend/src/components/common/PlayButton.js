import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { usePlayingContext } from "../../pageComponents/NowPlaying";
import Pause from "../../assets/pause.svg";
import Play from "../../assets/playicon.svg";
import { useAuth } from '../../context/AuthContext'; // Import your custom useAuth hook

export default function PlayButton({ track, songsList, large }) {
  const { userEmail } = useAuth(); // Use the custom hook to get the user's email
  const currentSong = usePlayingContext(state => state.getCurrentSong);
  const setSongs = usePlayingContext(state => state.setSongs);
  const playingStatus = usePlayingContext(state => state.state);
  const [playButton, setPlay] = useState(true);
  const trackIndex = songsList.findIndex((song) => song._id === track.id);
  
  useEffect(() => {
    if (track.id !== currentSong()) {
      setPlay(true);
    }
    if (track.id === currentSong() && playingStatus.playing === true) {
      setPlay(false);
    }
    if (track.id === currentSong() && playingStatus.playing === false) {
      setPlay(true);
    }
  }, [currentSong, track, playingStatus]);

  const onPlay = (event) => {
    event.stopPropagation();
    setPlay(!playButton);
    setSongs(songsList, trackIndex);
    addToPlaybackHistory();
  };

  async function addToPlaybackHistory() {
    fetch(`${process.env.REACT_APP_API_BASE_URL}/api/updateUserPlaybackHistory`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          user: userEmail,
          videoId: track.id,
        }),
    })
      .then((res) => res.json())
      .then((data) => console.log(data));
  }

  return (
    <PlayComponent>
      <img className="album-cover" src={playButton === true ? Play : Pause} alt="Album Cover" onClick={onPlay} />
    </PlayComponent>
  );
}

const PlayComponent = styled.div`
  border-radius: 50px;
  height: 60px;
  width: 40px;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  @media (max-width: 991px) {
    width: 50px;
    height: 50px;
  }
  img {
    width: 28px;
    @media (max-width: 991px) {
      width: 22px;
    }
    filter: invert(27%) sepia(69%) saturate(6315%) hue-rotate(211deg)
      brightness(56%) contrast(86%);
  }
`;