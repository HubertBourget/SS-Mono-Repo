import React from 'react';
import { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import NavigationButton from '../components/CloudStudioComponents/NavigationButton';
import Dashboard from '../components/CloudStudioComponents/Dashboard';
import ContentTab from '../components/CloudStudioComponents/ContentTab';
import YourChannel from '../components/CloudStudioComponents/YourChannel';
import Feedback from '../components/CloudStudioComponents/Feedback';
import Upload from '../components/CloudStudioComponents/Upload';
import { v4 } from 'uuid';
import { debounce } from 'lodash';
import axios from 'axios';
import ProfileCircle from '../assets/ProfileCircle.png';
import UploadIcon from '../assets/UploadIcon.png';
import DashboardIcon from '../assets/DashboardIcon.png';
import YourContentIcon from '../assets/ContentIcon.png'
import YourChanneltIcon from '../assets/YourChannelIcon.png';
import FeedbackIcon from '../assets/FeedbackIcon.png';
import { Navigate, useNavigate } from 'react-router'; 
import VideoPlayer from '../components/CloudStudioComponents/VideoPlayer';
import SacredSoundLogo from '../assets/SacredSoundLogo.png'
import { jwtDecode } from 'jwt-decode';

// Function to check if token is valid and not expired
const isTokenValid = (token) => {
    try {
        const decoded = jwtDecode(token);
        const currentTime = Date.now() / 1000; // Convert to seconds
        return decoded.exp > currentTime;  // Check if token has expired
    } catch (error) {
        return false;
    }
};

export default function NewCloudStudio() {
    //Navigation, viewStates and button flow:
    const [isUploadActive, setIsUploadActive] = useState(false);
    const [activeComponent, setActiveComponent] = useState('component1');
    const [isSlideIn, setIsSlideIn] = useState(false);
    const [publishClicked, setPublishClicked] = useState(false);
    const [uploadViewState, setUploadViewState] = useState("initial");
    const [allFilesUploaded, setAllFilesUploaded] = useState(false); //To prevent user to click the Publish button before file upload finishes
    const [uploadProgress, setUploadProgress] = useState({});
    const navigate = useNavigate();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userEmail, setUserEmail] = useState(null);

    // On component mount, check if the user is authenticated via JWT
    useEffect(() => {
        const token = localStorage.getItem('sacredSound_accessToken');
        
        if (token && isTokenValid(token)) {
        const decoded = jwtDecode(token);
        setUserEmail(decoded.email);
        setIsAuthenticated(true);
        } else {
        setIsAuthenticated(false);
        localStorage.removeItem('sacredSound_accessToken');  // Clear any expired or invalid token
        }
    }, []);
    // Function to refresh the access token
const refreshAccessToken = async () => {
    try {
        const response = await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/refreshToken`, {}, { withCredentials: true });
        const newAccessToken = response.data.accessToken;
        localStorage.setItem('sacredSound_accessToken', newAccessToken); // Store new access token
        return newAccessToken;
    } catch (error) {
        console.error('Error refreshing access token:', error);
        return null;
    }
};

    useEffect(() => {
        const checkAuthStatus = async () => {
            let token = localStorage.getItem('sacredSound_accessToken');

            if (token && isTokenValid(token)) {
                const decoded = jwtDecode(token);
                setUserEmail(decoded.email);
                setIsAuthenticated(true);
            } else {
                // Attempt to refresh the access token using the refresh token
                token = await refreshAccessToken();

                if (token) {
                    const decoded = jwtDecode(token);
                    setUserEmail(decoded.email);
                    setIsAuthenticated(true);
                } else {
                    setIsAuthenticated(false);
                    localStorage.removeItem('sacredSound_accessToken');
                    navigate('/login');
                }
            }
        };

        checkAuthStatus();
    }, [navigate]);

    useEffect(() => {
    // Set up Axios interceptor for refreshing access tokens
    const interceptor = axios.interceptors.request.use(async (config) => {
        let token = localStorage.getItem('sacredSound_accessToken');

        if (token && !isTokenValid(token)) {
            // Refresh token if expired
            token = await refreshAccessToken();
        }

        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }

        return config;
    }, (error) => {
        return Promise.reject(error);
    });

    // Cleanup the interceptor when component unmounts
    return () => {
        axios.interceptors.request.eject(interceptor);
    };
}, []); // Empty dependency array to run only on mount


    const handleSectionChange = (componentName, isUploading) => {
        setIsUploadActive(isUploading);
        setActiveComponent(componentName);
    };
    const handlePublishHandled = () => {
            setPublishClicked(false); // Reset the state
        };
    const handlePublishButtonClick = () => {
        debouncedUpdate.flush(); // Flush any pending updates
        setPublishClicked(true);
        setTimeout(() => {
            resetUploadState();
        }, 2000);
    };
    const resetUploadState = () => {
        setAlbumId(null);
        setAlbumTitle('');
        setAlbumDescription('');
        setVisibility('public');
        setUploadViewState("initial");
        setReorderedFiles([]);
        setFileUploadsArray([]);
    };
    const onAllUpdatesComplete = () => {
    // Logic to close the component or update the UI
    resetUploadState()
    setIsSlideIn(false); 
    setIsUploadActive(false); 
    setActiveComponent('component1');
    };
    const handleUploadClick = () => {
        setAlbumId(v4());
        setIsSlideIn(false);
        //After a short delay, set isSlideIn to true to trigger the animation
        setTimeout(() => {
            handleSectionChange('component5', true);
            setIsSlideIn(true); // Trigger the slide-in animation
        }, 9);
    };
    const handleCloseClick = () => {
        resetUploadState()
        setIsSlideIn(false); // Hide the UploadPopup
        setIsUploadActive(false); // Show the Upload and Account buttons
        setActiveComponent('component1'); // Optionally, reset to the default component view
    };
    const handleStateChange = (newViewState) => {
        // Update the state that controls the viewState of the Upload component
        setUploadViewState(newViewState);
    };

    // Function & useStates to handle album data update:
    const [albumId, setAlbumId] = useState(null);
    const [albumTitle, setAlbumTitle] = useState('');
    const [albumDescription, setAlbumDescription] = useState('');
    const [visibility, setVisibility] = useState('public'); // Default value set to 'public'
    //lifting the state up of the array order inside the album:
    const [reorderedFiles, setReorderedFiles] = useState([]);
    const updateReorderedFiles = (newFiles) => {
        console.log('updateReorderedFiles :', newFiles )
    setReorderedFiles(newFiles);
    };
    const handleAlbumDataChange = (key, value) => {
        console.log('handleAlbumDataChange: ', key, value)
    if (key === "description") setAlbumDescription(value);
    if (key === "visibility") setVisibility(value);
    if (key === "albumTitle") setAlbumTitle(value);
    if (key === "albumOrder") setReorderedFiles(value);
    };
    //On buttonNext click, sends the request ot sets the albumData in MongoDb and change the viewState
    const handleNextButtonClick = () => {
        // Prepare the album data
        const albumData = {
            albumId: albumId,
            title: albumTitle,
            description: albumDescription,
            visibility: visibility,
            albumOrder: reorderedFiles,
        };
        console.log('inspecting albumData: ', albumData)
        // Call the function to update album metadata
        handleAlbumMetaDataUpdate(albumData);
        // Change the view state
        setUploadViewState("fileDetail");
    };
    //The album update API call:
    const handleAlbumMetaDataUpdate = async (albumData) => {
        const { albumId, title, description, visibility, albumOrder } = albumData;
        console.log("albumData: ", albumData);
        try {
            const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/updateAlbumMetaData`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ albumId, title, description, visibility, albumOrder }),
            });
            const result = await response.json();
            console.log(result);    
        } catch (error) {
            console.error('Error updating album metadata:', error);
        }
    };


    // Function & useStates to handle tracks data update:
    // Define the debounced function
    const debouncedUpdate = useRef(debounce(async (trackId) => {
        console.log(trackId);
        const itemId = trackId.trackId.toString();
        const itemKey = trackId.key;
        const itemValue = trackId.value;
        console.log("itemId::", itemId);
        console.log("key::", itemKey);
        console.log("value::", itemValue);
    const dataToUpdate = { [itemKey]: itemValue };

    if (!itemId || itemValue === undefined) {
        console.log("Invalid itemId or value", { itemId, itemValue });
        return;
    }

    try {
        console.log('Sending data:', { videoId: itemId, ...dataToUpdate });
        const response = await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/updatePartialContentMetaData`, {
            videoId: itemId,
            ...dataToUpdate
        });
        console.log('Response:', response.data);
    } catch (error) {
        console.error('Error updating data:', error);
    }
    }, 100)).current;
    // Function to handle changes in track details
    const handleTrackDetailChange = (trackId, key, value) => {
        debouncedUpdate({ trackId, key, value });
};

// brigning fileUploadArray in the top level:
const [fileUploadsArray, setFileUploadsArray] = useState([]);
useEffect(() => {
    fileUploadsArray.forEach(file => {
        if (!trackDetails.some(detail => detail.id === file.videoId)) {
            const newTrack = {
                id: file.videoId,
                visibility: 'public',
                category: 'music video',
                albumId:albumId,
            };
            setTrackDetails(prevDetails => [...prevDetails, newTrack]);
        }
    });
}, [fileUploadsArray]);

    //tracking if all file are uploaded
    const updateFileProgress = (fileName, progress) => {
    setUploadProgress(prevProgress => {
        // Calculate the updated progress
        const updatedProgress = {
            ...prevProgress,
            [fileName]: progress
        };

        // Check if all files are uploaded
        const allUploaded = Object.values(updatedProgress).every(p => p === 100);
        setAllFilesUploaded(allUploaded); // Update the state based on the new progress values

        return updatedProgress; // Return the updated progress
    });
};

const [trackDetails, setTrackDetails] = useState([]);

    return (
        <MainContainer>
            {!isUploadActive && <HeaderContainer>
                <HeaderLeft>
                    {!isUploadActive && (
                        <Logo>
                        </Logo>
                    )}
                </HeaderLeft>
                <HeaderRight>
                    {!isUploadActive && (
                        <UploadAndAccountDiv>
                            <button onClick={() => {handleUploadClick();}}
                            style={{display:'flex', marginRight:'3vw'}}>
                                <img src={UploadIcon} alt="Upload" style={{ marginRight: '8px'}}/>
                                <div style={{alignItems:'center', color:'white', backgroundColor:"#434289", fontFamily:'Montserrat', fontSize:'18px'}}>
                                    Upload
                                </div>
                            </button>
                        </UploadAndAccountDiv>
                    )}                   
                </HeaderRight>
            </HeaderContainer>}
            
            <FlexContainer>
                {!isUploadActive && <NavigationPanel>
                    <NavigationButton onClick={() => handleSectionChange('component1', false)} active={activeComponent === 'component1'}>
                        <img src={DashboardIcon} alt="Upload" style={{ marginRight: '8px'}}/>
                        Dashboard
                    </NavigationButton>
                    <NavigationButton onClick={() => handleSectionChange('component2', false)} active={activeComponent === 'component2'}>
                        <img src={YourContentIcon} alt="Your Channel" style={{ marginRight: '8px'}}/>
                        Content
                    </NavigationButton>

                    {/* Disabling in current build */}
                    {/* <NavigationButton onClick={() => handleSectionChange('component3', false)} active={activeComponent === 'component3'}>
                        <img src={YourChanneltIcon} alt="Upload" style={{ marginRight: '8px'}}/>
                        Your Channel
                    </NavigationButton> */}

                    <SeparatorDiv/>
                    <NavigationButton 
                        onClick={() => window.open('mailto:feedback@sacredsound.app')}>
                        <img src={FeedbackIcon} alt="Feedback" style={{ marginRight: '8px'}}/>
                        Feedback
                    </NavigationButton>

                    <BottomNavigationPanel/>
                </NavigationPanel>}
                <ScrollableFlexThree isUploadActive={isUploadActive}>
                    {activeComponent === "component1" && userEmail && <Dashboard user={userEmail.toString()} />}
                    {activeComponent === "component2" && userEmail&& <ContentTab user={userEmail.toString()} />}
                    {activeComponent === "component3" && userEmail&& <YourChannel user={userEmail.toString()} />}
                    {activeComponent === "component4" && userEmail&& <Feedback user={userEmail.toString()} />}
                    <PopupComponentWithSlideIn slideIn={isSlideIn}>
                        <TopHeaderSection style={{height: '12vh'}}>
                            <CloseButton onClick={handleCloseClick}>Close</CloseButton>
                            {isUploadActive && uploadViewState === "albumCreation" && (
                            <button onClick={handleNextButtonClick} style={{display:'flex', flexDirection:'row-reverse', marginRight:'3vw'}}>Next</button>)}
                            
                            {isUploadActive && uploadViewState === "fileDetail" && (
                            <button 
                            onClick={handlePublishButtonClick} 
                            disabled={!allFilesUploaded}
                            style={{
                                display:'flex',
                                flexDirection:'row-reverse',
                                marginRight:'3vw',
                                cursor: allFilesUploaded ? 'pointer' : 'default', // Conditionally set the cursor
                                opacity: allFilesUploaded ? '1' : '0.5'}}
                            >
                                {allFilesUploaded ? "Publish" : "Uploading in progress..."}
                            </button>)}
                            </TopHeaderSection>
                        {activeComponent === "component5" && (
                            <Upload
                            reorderedFiles={reorderedFiles}
                            onUpdateReorderedFiles={updateReorderedFiles}
                            onAllUpdatesComplete = {onAllUpdatesComplete}
                            publishClicked={publishClicked}
                            handlePublishHandled={handlePublishHandled}
                            viewState={uploadViewState}
                            albumTitle={albumTitle}
                            albumDescription={albumDescription}
                            visibility={visibility}
                            onAlbumDataChange={handleAlbumDataChange}
                            onStateChange={handleStateChange}
                            albumId={albumId} 
                            onTrackDetailChange={handleTrackDetailChange}
                            fileUploadsArray={fileUploadsArray}
                            setFileUploadsArray={setFileUploadsArray}
                            trackDetails={trackDetails}
                            updateFileProgress={updateFileProgress}
                            />
                        )}
                        
                    </PopupComponentWithSlideIn>
                    </ScrollableFlexThree>
                    </FlexContainer>
        </MainContainer>
    );
}

const MainContainer = styled.div`
height: 100%;
width: 100%;
overflow: hidden;
`;

const HeaderContainer = styled.div`
    display: flex;
    flex-direction: row;
    height: 12vh;
`;

const HeaderLeft = styled.div`
    width: 24%;
    height: 12vh;
    justify-content: space-between;
    align-items: center;
    position: relative;
    overflow: hidden;
    border-right: 1px solid rgb(191, 187, 187);
    position: fixed;
`;

const HeaderRight = styled.div`
flex: 3;
display:'flex';
flex-direction:'end';
`;

const UploadAndAccountDiv = styled.div`
    flex: 3;
    display: flex;
    justify-content: flex-end;
    height: 100%;
    align-items: center;
`;


const FlexContainer = styled.div`
    display: flex;
    height: 100%;
    overflow: hidden;
`;

const NavigationPanel = styled.div`
position: fixed;
    display: flex;
    flex-direction: column;
    height: 88vh;
    border-right: 1px solid rgb(191, 187, 187);
    width: 24%;
`;

const Logo = styled.div`
    height: 80%;
    width: 80%;
    font-size: 1.5em;
    margin-left: 1vw;
    background-image: url(${SacredSoundLogo});
    background-repeat: no-repeat;
    background-size: contain;
    background-position: center;
`;

const AccountButton = styled.button`
    background-color: transparent;
    margin-left: 1vw;
    margin-right: 1vw;
    background-image: url(${ProfileCircle});
    background-repeat: no-repeat;
    background-size: contain;
    background-position: center;
    height: 7vh;
`;

const SeparatorDiv = styled.div`
    position: relative;
    margin-top: 10px;
    margin-bottom: 10px;

    ::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translateX(-50%); /* Center the border horizontally */
        width: 90%;
        height: 1px;
        background-color: #bfbbbb;
    }
`;

const BottomNavigationPanel = styled.div`
    flex: 2;
    padding: 10px;
    margin-bottom: 10px;
`;

const ScrollableFlexThree = styled.div`
    flex: 3;
    overflow-y: ${props => props.isUploadActive ? 'hidden' : 'auto'};
        margin-left: 24vw;
`;

const PopupComponentWithSlideIn = styled.div`
    position: fixed;
    top: 0vh;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100vw;
    height: 100vh;
    z-index: 1;
    transform: translateX(${props => props.slideIn ? '0' : '100vw'});
    transition: transform 0.5s ease-out;
    overflow-y: auto;
`;

const PopupComponent = styled.div`
    position: fixed;
    top: 0vh;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100vw;
    height: 100vh;
    background-color: transparent;
    z-index: 1;
    overflow-y: auto;
`;

const CloseButton = styled.button`
    background-color: rgb(0, 0, 0, 0);
    border: none;
    cursor: pointer;
    border-radius: 5px;
    font-size: 16px;
    color: rgb(67, 66, 137);
    text-decoration: underline;
    margin-left: 3vw;
    padding: 0px;
`;

const TopHeaderSection = styled.div`
    height: 12vh;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    box-shadow: 0px 2px 2px -2px rgba(0,0,0,0.3);
    align-items: center;
`;