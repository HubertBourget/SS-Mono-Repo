import React, { useEffect, useState, useRef } from "react";
import styled from "styled-components";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../context/AuthContext"; // Import your custom useAuth hook

const VideoPlayer = () => {
  const { videoId } = useParams();
  const [videoData, setVideoData] = useState(null);
  const [newvideoData, setNewVideoData] = useState(null);
  const [intervalId, setIntervalId] = useState(null);
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState([]);
  const { userEmail } = useAuth(); // Use the custom hook to get the user's email

  const videoRef = useRef(null);

  const logUser = async () => {
    try {
      await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/api/logContentUsage/`,
        {
          user: userEmail,
          videoId,
        }
      );
    } catch (error) {
      console.log("Error creating user log", error);
    }
  };

  const handlePlay = () => {
    const id = setInterval(logUser, 30000); // Log every 30 seconds
    setIntervalId(id);
  };

  const handlePause = () => {
    clearInterval(intervalId);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const currentTime = videoRef.current.currentTime;
      const duration = videoRef.current.duration;
      const percentagePlayed = (currentTime / duration) * 100;
      
      // Test log for purchase tracking
      if (percentagePlayed >= 90) {
        console.log('Purchase tracked for video:', videoId);
        console.log('Percentage played:', percentagePlayed.toFixed(2) + '%');
      }
    }
  };

  useEffect(() => {
    const fetchVideoData = async () => {
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_API_BASE_URL}/api/getVideoMetadataFromVideoId/${videoId}`
        );
        setNewVideoData(response.data);
      } catch (error) {
        setNewVideoData({
          fileUrl:
            "https://firebasestorage.googleapis.com/v0/b/sacred-music-60ce6.appspot.com/o/Uploads%2Fdebug9%40debug.com%2F0bd405a9-e8c4-4386-9b87-51e010593682?alt=media&token=ca7758e2-59f7-4378-9aab-31e4cd2ddf93",
        });
        console.error("Error fetching video data:", error);
      }
    };

    if (videoId) {
      fetchVideoData();
    }
  }, [videoId]);

  useEffect(() => {
    const fetchItemToItemRecommendations = async () => {
      if (videoId && userEmail) {
        try {
          const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/getItemToItemRecommendations/${userEmail}/${videoId}`);
          setRecommendations(response.data.recomms || []);
          console.log('Recommendations:', response.data.recomms);
        } catch (error) {
          console.error('Error fetching item to item recommendations:', error);
        }
      }
    };

    fetchItemToItemRecommendations();
  }, [videoId, userEmail]);

  const [quality, setQuality] = useState(360);

  // Function to detect network speed and set quality
  const detectNetworkSpeedAndSetQuality = () => {
    const connection =
      navigator.connection ||
      navigator.mozConnection ||
      navigator.webkitConnection;

    if (connection) {
      // Adjust quality based on network speed
      if (connection.effectiveType === "5g" || connection.downlink >= 10) {
        setQuality(1080);
      } else if (
        connection.effectiveType === "4g" ||
        connection.downlink >= 3
      ) {
        setQuality(720);
      } else if (
        connection.effectiveType === "3g" ||
        connection.downlink >= 1.5
      ) {
        setQuality(360);
      } else if (
        connection.effectiveType === "2g" ||
        connection.downlink >= 0.5
      ) {
        setQuality(240);
      } else {
        setQuality(240);
      }
    }
  };

  useEffect(() => {
    // Initial video
    if(newvideoData && newvideoData?.fileUrl){

      if(Array.isArray(newvideoData?.fileUrl)){
          const item = newvideoData.fileUrl.find((item) => {
            return item.quality == quality
          })
          if(videoData?.fileUrl != item.url){
            setVideoData({fileUrl: item.url});
          }

      }else{
        setVideoData({fileUrl:newvideoData?.fileUrl})
      }
    }
  }, [quality,newvideoData]);

  useEffect(() => {
    if (videoData && videoData.fileUrl) {
      if (videoRef.current) {
        const wasPlaying = !videoRef.current.paused;
        const currentTime = videoRef.current.currentTime;
  
        // Reload the video whenever the URL changes
        videoRef.current.load();
  
        // After loading, set the time back to where it was
        videoRef.current.currentTime = currentTime;
  
        // If the video was playing, resume playing
        if (wasPlaying) {
          videoRef.current.play();
        }
      }
    }
  }, [videoData]);

  useEffect(() => {
    // Detect network quality on initial load
    detectNetworkSpeedAndSetQuality();

    // Optionally monitor network changes
    const connection =
      navigator.connection ||
      navigator.mozConnection ||
      navigator.webkitConnection;

    if (connection) {
      connection.addEventListener("change", detectNetworkSpeedAndSetQuality);
      return () => {
        connection.removeEventListener(
          "change",
          detectNetworkSpeedAndSetQuality
        );
      };
    }
  }, [quality]);

  if (!videoData) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <VideoPlayerHeader>
        <BackButton onClick={() => navigate(-1)} style={{ color: 'black' }}>Close</BackButton>
      </VideoPlayerHeader>
      <div id="videoPlayerContainer" style={{ display: 'flex', justifyContent: 'center' }}>
        <video 
          ref={videoRef} 
          width="80%" 
          height="auto" 
          controls 
          onPlay={handlePlay} 
          onPause={handlePause}
          onTimeUpdate={handleTimeUpdate}
        >
          <source src={videoData.fileUrl} type="video/mp4" />
          <p>Your browser does not support HTML5 video. Here is a <a href={videoData.fileUrl}>link to the video</a> instead.</p>
        </video>
      </div>
    </>
  );
};

export default VideoPlayer;

const VideoPlayerHeader = styled.div`
  width: 100%;
  height: 12vh;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px; // Adjust padding as needed
  box-sizing: border-box;
`;

const BackButton = styled.button`
  background: transparent;
  border: none;
  color: #fff; // Set the color as needed
  font-size: 18px; // Set size as needed
  cursor: pointer;
  // Add more styles as needed
`;