import { Navigation } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/navigation";
import SliderArrow from "../assets/slider-arrow.svg";
import React from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import rect from '../assets/rect.png'
import PlayButton from "./common/PlayButton";
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";

export default function SwipeComponent({ arr, recommId }) {  
  const [artistNames, setArtistNames] = useState({});
  const navigate = useNavigate();
  const { userEmail } = useAuth();

  useEffect(() => {
  const fetchArtistData = async () => {
    const emails = arr.map(content => content.owner.toLowerCase()).filter((v, i, a) => a.indexOf(v) === i);
    
    if (emails.length === 0) return; // Early exit if no emails

    try {
      const queryParams = new URLSearchParams({ emails: emails.join(',') });
      
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/getUserProfilesByEmails?${queryParams}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Map data by email and set the state
      const mappedArtistNames = {};
      emails.forEach(email => {
        if (data[email]) {
          mappedArtistNames[email] = {
            accountName: data[email].accountName || 'Unknown Artist',
            id: data[email]._id || null, // Ensure that the `id` is mapped from `_id`
          };
        } else {
          mappedArtistNames[email] = { accountName: 'Unknown Artist', id: null };
        }
      });

      setArtistNames(mappedArtistNames); // Update state
    } catch (error) {
      console.error('Error fetching artist names:', error);
    }
  };

  if (arr && arr.length > 0) {
    fetchArtistData();
  }
}, [arr]);

const trackDetailView = async (itemId, recommId) => {
  try {
    const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/trackInteraction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: userEmail,
        itemId: itemId,
        type: 'detailView',
        recommId: recommId
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.error('Error tracking detail view:', error);
  }
};

const handleContentPlay = (content) => {
  console.log('Content play handler for:', content.title);
};

const handleArtistClick = async (content, e) => {
  e.stopPropagation(); // Prevent event bubbling
  const artistEmail = content.owner?.toLowerCase();
  const artistData = artistNames[artistEmail];

  if (artistData?.id) {
    navigate(`/main/artist?id=${artistData.id}`);
  } else {
    console.log('Artist ID not found.');
  }
};

  return (
    <Discography>
      <Swiper
        className="swiper-slider"
        spaceBetween={30}
        slidesPerView={4}
        modules={[Navigation]}
        navigation
        breakpoints={{
          320: {
            slidesPerView: 1,
          },
          575: {
            slidesPerView: 2,
          },
          992: {
            slidesPerView: 3,
          },
          1200: {
            slidesPerView: 4,
          },
        }}
      >
        {arr.map((content) => {
  const thumbnail = content?.selectedImageThumbnail?.length > 0
    ? content.selectedImageThumbnail
    : rect;

  return (
    <SwiperSlide key={content._id}>
      <div className="item" id="content-card" onClick={() => handleContentPlay(content)} style={{ cursor: 'pointer' }}>
        <img className="swiper-thumb-img" src={thumbnail} alt="Item Thumb" />
        <div style={{ marginLeft: 0, display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
          <div>
            <h1 className="slider-trackname">{content.contentType !== 'AlbumMetaData' ? content.title : content.albumName}</h1>
            <h1 className="slider-artist">
              <span
                onClick={(e) => handleArtistClick(content, e)}
                style={{ textDecoration: 'underline', cursor: 'pointer' }}
              >
                {artistNames[content.owner?.toLowerCase()]?.accountName || 'Unknown Artist'}
              </span>
            </h1>
          </div>
          <div style={{ display: 'inline', marginRight: '20px' }}>
            {(content.contentType === 'audio' || content.contentType === 'video' || content.contentType === 'recommendation') && (
              <PlayButton
                track={{
                  id: content._id,
                  songUrl: content.fileUrl,
                  songTitle: content.title,
                  isVideo: content.contentType === 'video',
                  artistName: content.videoOwner,
                  img: content.selectedImageThumbnail,
                }}
              />
            )}
          </div>
        </div>
      </div>
    </SwiperSlide>
  );
})}


      </Swiper>
    </Discography>
  );
}

const Discography = styled.div`
  background-color: rgba(0,0,0,0);
  padding: 5px;
  margin:20px;
  .swiper-slider {
    background-color: rgba(0,0,0,0);
    // margin: 20px 0;
    overflow: visible;
    @media (max-width: 991px) {
    }
    .item {
        
      background-color: rgba(0, 0, 0, 0);
      h1 {
        font-weight: 400;
        overflow: hidden;
        display: -webkit-box;
        -webkit-line-clamp: 1;
        -webkit-box-orient: vertical;
      }
      .slider-trackname {
        font-size: 16px;
      }
      .slider-artist {
        font-size: 14px;
      }
      img {
        width: 100%;
        height: 100%;
        text-align: center;
      }
      .swiper-thumb-img{
        object-fit:cover;
        width: 100%;
        height: 100%;
      }
    }
    .swiper-container {
      background-color: rgba(0, 0, 0, 0);
      position: relative;
    }

    .swiper-button-prev,
    .swiper-button-next {
      position: absolute;
      top: -32px;
      width: 35px;
      height: 35px;
      background-color: #fff;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      justify-content: center;
      align-items: center;
      // @media (max-width: 575px) {
      //   top: -85px;
      // }
      &::after {
        content: "";
        background-image: url(${SliderArrow});
        background-size: contain;
        height: 35px;
        width: 35px;
        background-repeat: no-repeat;
      }
    }

    // .swiper-button-next {
    //   right: 0px;
    // }

    .swiper-button-prev {
      right: 60px;
      left: auto;
      &::after {
        transform: rotate(180deg);
      }
    }
  }
`;
