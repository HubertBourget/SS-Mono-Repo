import React, { useEffect, useState } from "react";
import styled from "styled-components";
import "swiper/css";
import "swiper/css/navigation";
import Share from "../assets/share-android.svg";
import PersonAdd from "../assets/person-add-outline.svg";
import Play from "../assets/playicon.svg";
import Shuffle from "../assets/Shuffle-blue.svg";
import ArtistLink from "../assets/ArtistLink.png";
import Thanks from "../assets/thanks.svg";
import Thumb from "../assets/playlist.jpg";
import TrackLike from "../assets/track-like.svg";
import axios from "axios";
import SwipeComponent from "../components/SwipeComponent";
import SwipeEventComponet from "../components/lirbary/SwipeEventComponet";
import BackButton from "../components/common/BackButton";
import PlayButton from "../components/common/PlayButton";
import ThanksGivingPopup from "../components/common/ThanksGivingPopup";
import { useAuth } from '../context/AuthContext'; // Import your custom useAuth hook

export default function Artist() {
  const [artist, setArtist] = useState({});
  const [mostPlayed, setMostPlayed] = useState([]);
  const [tab, setTab] = useState(0);
  const [contents, setContent] = useState([]);
  const [events, setEvents] = useState([]);
  const [showFullBio, setShowFullBio] = useState(false);
  const { userEmail } = useAuth(); // Use the custom hook to get the user's email

  async function fetchArtist() {
    const queryParams = new URLSearchParams(window.location.search);
    const artistId = queryParams.get("id");
    const response = await axios.get(
      `${process.env.REACT_APP_API_BASE_URL}/api/getUserProfileById/${artistId}`
    );
    setArtist(response.data);
  }

  useEffect(() => {
    fetchArtist();
  }, []);

  useEffect(() => {
    fetchEvents();
    fetchMostPlayed();
  }, [artist]);

  useEffect(() => {
    fetchContent();
  }, [tab, artist]);

  const fetchContent = async () => {
    try {
      let type;
      if (tab === 1) type = "video";
      else if (tab === 2) type = "audio";
      else if (tab === 0) type = "album";
      
      // Clear content array before fetching new content
      setContent([]);

      if (tab !== 0) {
        // Fetch videos or audio using artist._id instead of email
        let url = `${process.env.REACT_APP_API_BASE_URL}/api/getAllContent?type=${type}&artistId=${artist._id}`;

        const response = await axios.get(url);
        if (response.status === 200) {
          const formattedData = response.data.map((ele) => ({
            ...ele,
            contentType: type
          }));
          setContent(formattedData);
        }
      } else {
        // Fetch albums using artist._id instead of email
        let url = `${process.env.REACT_APP_API_BASE_URL}/api/getAlbumsByArtist?artistId=${artist._id}`;

        const response = await axios.get(url);
        if (response.status === 200) {
          const formattedData = response.data.map((ele) => ({
            ...ele,
            contentType: type
          }));
          setContent(formattedData);
        }
      }
    } catch (error) {
      console.error(`An error occurred: ${error}`);
      setContent([]);
    }
  };

  const fetchMostPlayed = async () => {
    try {
      let url = `${process.env.REACT_APP_API_BASE_URL}/api/getMostPlayedTracksByArtist?artistId=${artist.email}`;

      const response = await axios.get(url);
      if (response.status === 200) {
        setMostPlayed(response.data.tracks);
      } else {
        console.error(`Request failed with status: ${response.status}`);
      }
    } catch (error) {
      console.error(`An error occurred: ${error}`);
    }
  };

  const fetchEvents = async () => {
    try {
      let url = `${process.env.REACT_APP_API_BASE_URL}/api/getEvents/${artist._id}`;

      const response = await axios.get(url);
      if (response.status === 200) {
        console.log(response.data);
        setEvents(response.data.events);
      } else {
        console.error(`Request failed with status: ${response.status}`);
      }
    } catch (error) {
      console.error(`An error occurred: ${error}`);
    }
  };

  return (
    <MainContainer>
      <HeadPart>
        <BackButton />
        <CoverImage>
          <img src={artist.bannerImageUrl} alt="not loaded"></img>
        </CoverImage>
        <HeadProfile>
          <ProfileImage>
            <img src={artist.profileImageUrl} alt="not loaded"></img>
            <div className="artist-info">
              <span>Artist</span>
              <h3>{artist.accountName}</h3>
              <span># Followers</span>
            </div>
          </ProfileImage>
          <HeadAction>
            <img src={PersonAdd} alt=""></img>
            <img src={Share} alt="Share"></img>
          </HeadAction>
        </HeadProfile>
      </HeadPart>

      <MusicInfo>
        <div>
          <div className="bio-container">
            {artist.bio && (
              <>
                <h5 className={`music-disc ${!showFullBio ? 'truncated' : ''}`}>
                  {artist.bio}
                </h5>
                {artist.bio.length > 100 && (
                  <button className="show-more" onClick={() => setShowFullBio(!showFullBio)}>
                    {showFullBio ? 'Show less' : 'Show more'}
                  </button>
                )}
              </>
            )}
            {artist.artistLink && (showFullBio || !artist.bio) && (
              <div className="artist-link">
                <img src={ArtistLink} alt="artist link" />
                <a href={artist.artistLink} target="_blank" rel="noopener noreferrer">
                  {artist.artistLink}
                </a>
              </div>
            )}
          </div>
        </div>
        <div className="music-play">
          <div className="music-icons">
            <div className="play">
              <img className="album-cover" src={Play} alt="Album Cover" />
            </div>
            {/* <div className="pause">
            <img className="album-cover" src={Pause} alt="Album Cover" />
          </div> */}
            <div className="repeat-play">
              <img className="album-cover" src={Shuffle} alt="Album Cover" />
            </div>
          </div>
          <ThanksGivingPopup artist={artist} userId={userEmail} user={userEmail} />
        </div>
      </MusicInfo>

      <SectionContainer>
        <HeadingText>
          <h1>Most Played tracks</h1>
        </HeadingText>
        <MostPlayedTracks>
          {mostPlayed.map((element, index) => (
            <div className="track-bar active" key={element._id}>
              <div className="track-left">
                <div className="icon-number">
                  <PlayButton
                    track={{
                      id: element._id,
                      songUrl: element.fileUrl,
                      songTitle: element.title,
                      isVideo: false,
                      artistName: element.user.accountName,
                      img: element.selectedImageThumbnail,
                    }}
                  />
                </div>
                <img
                  className="track-thumb"
                  src={
                    element.selectedImageThumbnail
                      ? element.selectedImageThumbnail
                      : Thumb
                  }
                  alt="track-thumb"
                ></img>
                <div className="flex-line">
                  <h5 className="track-title">{element.title}</h5>
                  <h5 className="album-title">Album title</h5>
                </div>
              </div>
              <div className="track-right">
                <h5 className="track-time">02:36</h5>
                <img src={TrackLike} alt="track-like"></img>
              </div>
            </div>
          ))}
        </MostPlayedTracks>
      </SectionContainer>

      <SectionContainer>
        <HeadingText>
          <h1>Discography</h1>
        </HeadingText>
        <Tabs>
          <button
            className={`btn btn-tab ${tab === 0 ? "active" : ""}`}
            onClick={() => setTab(0)}
          >
            Albums
          </button>
          <button
            className={`btn btn-tab ${tab === 1 ? "active" : ""}`}
            onClick={() => setTab(1)}
          >
            Videos
          </button>
          <button
            className={`btn btn-tab ${tab === 2 ? "active" : ""}`}
            onClick={() => setTab(2)}
          >
            Audio
          </button>
        </Tabs>
        <SwipeComponent arr={contents}></SwipeComponent>
      </SectionContainer>

      <SectionContainer>
        <HeadingText>
          <h1>Upcoming Events</h1>
        </HeadingText>
        <Events>
          <SwipeEventComponet arr={events} />
        </Events>
      </SectionContainer>
    </MainContainer>
  );
}

const Events = styled.div``;
const MainContainer = styled.div`
background-color: #fff;
  margin: 0;
  padding: 0;
  width: 100%;
  overflow-x: hidden;
  height: 90vh;
  @media (max-width: 1000px) {
    height: 80vh;
  }
`;
const HeadPart = styled.div`
  position: relative;
  * {
    background-color: transparent;
  }
`;

const CoverImage = styled.div`
  position: relative;
  z-index: 2;
  height: 400px;
  &::before {
    content: "";
    position: absolute;
    inset: 0;
    height: 99%;
    width: 100%;
    background-color: #00000061;
    overflow: hidden;
    z-index: 1;
  }
  img {
    width: 100%;
    height: 400px;
    object-fit: cover;
    @media (max-width: 767px) {
      height: 270px;
    }
  }
`;

const HeadProfile = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  position: absolute;
  left: 0;
  right: 0;
  bottom: 35px;
  z-index: 2;
  @media (max-width: 767px) {
    position: relative;
    bottom: 0;
    display: block;
  }
  * {
    color: #fff;
    @media (max-width: 767px) {
      color: #434289;
    }
  }
`;

const ProfileImage = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 15px;
  h3 {
    margin: 0;
    font-weight: 400;
    font-size: 48px;
    @media (max-width: 575px) {
      font-size: 27px;
    }
  }
  img {
    width: 175px;
    height: 175px;
    object-fit: cover;
    border-radius: 50%;
    @media (max-width: 767px) {
      position: absolute;
      top: -190px;
      left: 50%;
      transform: translateX(-50%);
      width: 105px;
      height: 105px;
    }
  }
  .artist-info {
    @media (max-width: 767px) {
      text-align: center;
      width: 100%;
      margin-top: 25px;
    }
  }
`;

const HeadAction = styled.div`
  display: flex;
  align-items: center;
  gap: 15px;
  @media (max-width: 991px) {
    position: absolute;
    right: 20px;
    top: -170px;
  }
  @media (max-width: 767px) {
    top: -255px;
  }
  img {
    cursor: pointer;
    @media (max-width: 767px) {
      width: 24px;
    }
  }
`;

const MusicInfo = styled.div`
  display: flex;
  gap: 15px;
  padding: 20px;
  margin-top: 15px;
  @media (max-width: 767px) {
    flex-direction: column;
  }
  > div:first-child {
    width: 50%;
    padding-right: 25px;
    @media (max-width: 767px) {
      width: 100%;
      padding-right: 0px;
    }
  }
  .bio-container {
    position: relative;
  }
  .music-disc {
    font-size: 18px;
    font-weight: 300;
    margin: 0;
    
    &.truncated {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    
    @media (max-width: 575px) {
      font-size: 14px;
    }
  }
  .music-play {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 50%;
    @media (max-width: 767px) {
      width: 100%;
      justify-content: center;
      gap: 20px;
    }
    .music-icons {
      display: flex;
      align-items: center;
      gap: 15px;
    }
    .pause,
    .play {
      background-color: #434289;
      border-radius: 50px;
      height: 60px;
      width: 60px;
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
      }
    }
    .repeat-play {
      img {
        width: 40px;
        @media (max-width: 991px) {
          width: 22px;
        }
      }
    }
    .give-thanks {
      background-color: #687550;
      width: fit-content;
      border-radius: 50px;
      padding: 10px 15px;
      display: flex;
      align-items: center;
      gap: 10px;
      color: #fff;
      cursor: pointer;
    }
  }
  .show-more {
    background: none;
    border: none;
    color: #434289;
    padding: 0;
    margin-top: 5px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    text-decoration: underline;
  }
  .artist-link {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 10px;
    
    img {
      width: 20px;
      height: 20px;
    }

    a {
      color: #434289;
      text-decoration: none;
      font-size: 14px;
      
      &:hover {
        text-decoration: underline;
      }
    }
  }
`;

const HeadingText = styled.div`
  h1 {
    font-size: 24px;
    font-weight: 400;
  }
`;

const MostPlayedTracks = styled.div`
  padding: 20px;
  .track-bar {
    padding: 10px;
    display: flex;
    border-bottom: 1px solid #d9d9d9;
    &:hover,
    &.active {
      background-color: #f5f5f5;
    }
    * {
      font-weight: 400;
      font-size: 16px;
      background-color: transparent;
    }
    h5 {
      margin: 0;
    }
    .track-left {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 10px;
      .icon-number {
        min-width: 20px;
      }
      .track-icon {
        width: 20px;
        cursor: pointer;
        filter: invert(27%) sepia(69%) saturate(6315%) hue-rotate(211deg)
          brightness(56%) contrast(86%);
      }
      .track-thumb {
        width: 50px;
        height: 50px;
        object-fit: cover;
      }
      .flex-line {
        display: flex;
        flex: 1;
        @media (max-width: 767px) {
          flex-direction: column;
        }
      }
      .track-title,
      .album-title {
        width: 50%;
        overflow: hidden;
        display: -webkit-box;
        -webkit-line-clamp: 1;
        -webkit-box-orient: vertical;
        @media (max-width: 767px) {
          width: 100%;
        }
      }
    }
    .track-right {
      display: flex;
      align-items: center;
      gap: 40px;
      @media (max-width: 767px) {
        gap: 20px;
      }
      img {
        cursor: pointer;
      }
    }
  }
`;

const Tabs = styled.div`
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 0;
  @media (max-width: 575px) {
    gap: 10px;
    justify-content: space-between;
  }
  .btn-tab {
    height: 40px;
    background-color: #d9d9d9;
    color: #434289;
    transition: all 0.5s ease;
    @media (max-width: 575px) {
      padding: 10px 18px;
    }
    &:hover,
    &.active {
      background-color: #434289;
      color: #fff;
    }
  }
`;

const SectionContainer = styled.div`
  padding: 0 20px;
  margin-top: 20px;
`;