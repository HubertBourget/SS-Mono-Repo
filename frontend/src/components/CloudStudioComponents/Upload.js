import React, { useState, useEffect } from 'react';
import { ref, uploadBytesResumable, getDownloadURL, uploadBytes } from 'firebase/storage';
import { v4 } from 'uuid';
import { storage } from '../../firebase';
import styled from 'styled-components';
import FileProgressBar from './FileProgressBar';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import UploadDetailsForm from './UploadsDetailsForm';
import Rectangle27 from '../../assets/Rectangle27.png';
import { useAuth } from '../../context/AuthContext';
import WhiteEditIcon from '../../assets/WhiteEditIcon.png';
import axios from 'axios';

const Upload = ({ 
    viewState, 
    onStateChange, 
    albumTitle, 
    albumDescription, 
    visibility, 
    onAlbumDataChange,
    albumId,
    publishClicked, 
    handlePublishHandled,
    onAllUpdatesComplete,
    onTrackDetailChange,
    fileUploadsArray, 
    setFileUploadsArray,
    trackDetails,
    updateFileProgress,   
}) => {

    const { userEmail } = useAuth(); // Use the custom hook to get the user's email

    // Upload tracking:
    const [uploadProgress, setUploadProgress] = useState({});
    const [fileUploadStatus, setFileUploadStatus] = useState({});
    
    // Drag and drop system with album order:
    const [albumOrderUpdated, setAlbumOrderUpdated] = useState(false);
    
    const handleDragOver = (e) => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer.files);
        setFileUploadsArray(files);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer.files);
        setFileUploadsArray(files);
        if (files.length > 0) {
            onStateChange("albumCreation");
        }
    };

    // Delete tracks functions:
    const handleDeleteTrack = (fileName) => {
        const updatedFileUploadsArray = fileUploadsArray.filter(file => file.data.name !== fileName);
        setFileUploadsArray(updatedFileUploadsArray);
        const updatedAlbumOrder = updatedFileUploadsArray.map(file => file.videoId);
        onAlbumDataChange("albumOrder", updatedAlbumOrder);
    };

    // Checkbox:
    const [createAlbum, setCreateAlbum] = useState(true);
    const handleCheckboxChange = (e) => { setCreateAlbum(e.target.checked); };

    // Album creation:
    const [albumCover, setAlbumCover] = useState(null);
    
    // Update functions that are called when input fields are changed
    const handleDescriptionChange = (e) => {
        onAlbumDataChange("description", e.target.value);
    };

    const handleVisibilityChange = (e) => {
        onAlbumDataChange("visibility", e.target.value);
    };

    const handleTitleChange = (e) => {
        onAlbumDataChange("albumTitle", e.target.value);
    };

    const handleAlbumCoverChange = (event) => {
        if (event.target.files[0]) {
            const file = event.target.files[0];
            const imageUrl = URL.createObjectURL(file);
            setAlbumCover(imageUrl); // Set the state with the URL
            uploadAlbumPicture(file); // Continue with your existing upload logic
        }
    };

    // Inside Album creation: Drag and Drop (rearrange menu for the order of tracks on the album):
    const onDragEnd = (result) => {
        if (!result.destination) return;
        const reorderedFiles = Array.from(fileUploadsArray);
        const [reorderedItem] = reorderedFiles.splice(result.source.index, 1);
        reorderedFiles.splice(result.destination.index, 0, reorderedItem);

        setFileUploadsArray(reorderedFiles);
        onAlbumDataChange("albumOrder", reorderedFiles.map(file => file.videoId));
    };

    // Upload details form handle changes in uploads details
    const handleDetailChange = (index, key, value) => {
        setFileUploadsArray(prevArray => {
            const newArray = [...prevArray];
            const updatedFile = { ...newArray[index], [key]: value };
            newArray[index] = updatedFile;
            return newArray;
        });
    };

    // Function to handle image file selection
    const handleImageChange = (event, index) => {
        const file = event.target.files[0];
        handleDetailChange(index, "imageFile", file);
    };

    // Function to handle form submission for each file
    const handleSubmit = (index, event) => {
        event.preventDefault();
        const fileDetails = fileUploadsArray[index];
        console.log('Submitting details for file:', fileDetails);
    };

    // Set the view state based on the properties of the upload event 
    const handleFileChange = (event) => {
        const files = Array.from(event.target.files).map(file => ({
            data: file,
            uploaded: false,
        }));
        setFileUploadsArray(files);

        if (files.length > 1 && createAlbum) {
            postNewAlbum(albumId);
            onStateChange("albumCreation");
        } else if (files.length > 0) {
            onStateChange("fileDetail");
        }
        event.target.value = '';
    };

    // Handling file upload useEffect:
    useEffect(() => {
        const uploadFile = async (fileObj) => {
            if (!fileObj.data || fileUploadStatus[fileObj.data.name]) return;

            setFileUploadStatus(prevStatus => ({
                ...prevStatus,
                [fileObj.data.name]: { uploading: true }
            }));

            const videoId = v4();
            const fileRef = ref(storage, `Uploads/${userEmail}/${videoId}`);

            const call = await postContentMetaData(videoId, 'temp', fileObj.data.type.startsWith('audio/'), albumId);

            if(fileObj.data.type.startsWith('video/')) {
                
                const formData = new FormData();
                formData.append('video', fileObj.data);
                formData.append('videoId', videoId);
                formData.append('userEmail', userEmail);
                const response = await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/upload/video`, formData,{ headers: { 'Content-Type': 'multipart/form-data'}})
                if(!response || !response?.data) {
                    setFileUploadStatus(prevStatus => ({
                        ...prevStatus,
                        [fileObj.data.name]: { uploading: false, error: true }
                    }));
                    return;
                }

                updatePartialContentMetaData(videoId, response.data.urls);
                setFileUploadStatus(prevStatus => ({
                    ...prevStatus,
                    [fileObj.data.name]: { uploading: false, completed: true }
                }));
                updateFileProgress(fileObj.data.name, 100);

            }
            else {
                const metadata = { contentType: fileObj.data.type };
                const uploadTask = uploadBytesResumable(fileRef, fileObj.data, metadata);

                uploadTask.on('state_changed', 
                    (snapshot) => {
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        setUploadProgress(prevProgress => ({
                            ...prevProgress,
                            [fileObj.data.name]: progress,
                        }));
                        updateFileProgress(fileObj.data.name, progress);
                    }, 
                    (error) => {
                        console.error('Upload error:', error);
                        setFileUploadStatus(prevStatus => ({
                            ...prevStatus,
                            [fileObj.data.name]: { uploading: false, error: true }
                        }));
                    }, 
                    async () => {
                        const fileUrl = await getDownloadURL(uploadTask.snapshot.ref);
                        console.log("File uploaded successfully:", fileUrl);
                        updatePartialContentMetaData(videoId, fileUrl);
    
                        setFileUploadStatus(prevStatus => ({
                            ...prevStatus,
                            [fileObj.data.name]: { uploading: false, completed: true }
                        }));
                    }
                );
            }

            setFileUploadsArray(prevArray => {
                const newArray = [...prevArray];
                const index = newArray.findIndex(f => f.data.name === fileObj.data.name);
                if (index !== -1) {
                    newArray[index] = { ...newArray[index], videoId: videoId };
                }
                return newArray;
            });
        };

        fileUploadsArray.forEach(fileObj => uploadFile(fileObj));
    }, [fileUploadsArray, userEmail]);

    // Updating parent with Album Order:
    useEffect(() => {
        const allUploaded = fileUploadsArray.every(file => file.videoId && fileUploadStatus[file.data.name]?.completed);

        if (allUploaded && fileUploadsArray.length > 0 && !albumOrderUpdated) {
            const albumOrder = fileUploadsArray.map(file => file.videoId);
            onAlbumDataChange("albumOrder", albumOrder);
            setAlbumOrderUpdated(true); // Set the flag to true once updated
        }
    }, [fileUploadsArray, fileUploadStatus, albumOrderUpdated, onAlbumDataChange]);

    useEffect(() => {
        if (publishClicked) {
            handleUpdateReviewStatus();
        }
    }, [publishClicked]);

    const handleUpdateReviewStatus = async () => {
        const fileIds = fileUploadsArray.map(file => file.videoId);
        console.log("fileIds :", fileIds);

        console.log("Starting the update process for review status.");

        try {
            const promises = fileIds.map(videoId => {
                return fetch(`${process.env.REACT_APP_API_BASE_URL}/api/updateReviewStatus`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ videoId, b_isPreparedForReview: true }),
                }).then(response => response.json());
            });

            await Promise.all(promises);
            console.log("Review status updated for all files.");
            onAllUpdatesComplete();
            handlePublishHandled(); // Reset publishClicked to false
        } catch (error) {
            console.error('Error updating review status:', error);
        }
    };

    // API calls:
    const postContentMetaData = async (videoId, fileUrl, isOnlyAudio) => {
        const timestamp = new Date().toISOString();
        try {
            const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/postContentMetaData`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify({
                    owner: userEmail,
                    videoId: videoId,
                    timestamp: timestamp,
                    fileUrl: fileUrl,
                    b_isPreparedForReview: false,
                    b_hasBeenReviewed: false,
                    b_isApproved: false,
                    isOnlyAudio: isOnlyAudio,
                    visibility: true,
                    category: 'Studio recording',
                }),
            });
            return videoId; // Assuming the response contains the videoId
        } catch (error) {
            console.error('Error posting metadata:', error);
            return null;
        }
    };

    const updatePartialContentMetaData = async (videoId, fileUrl) => {
        try {
            const response = await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/updatePartialContentMetaData`, {
                videoId: videoId,
                fileUrl: fileUrl,
            });

            console.log('Update successful:', response.data);
            return response.data; // You can return the response data here if needed
        } catch (error) {
            console.error('Error updating content meta data:', error);
            throw error; // Rethrow the error if you want to handle it elsewhere
        }
    };

    const uploadAlbumPicture = (uploadingPicture) => {
        if (uploadingPicture == null) {
            console.log("profilePicture was null");
            return;
        }
        const fileUploadName = v4();
        const fileRef = ref(storage, `AlbumPictures/${userEmail}/${fileUploadName}`);
        const metadata = {
            contentType: 'image/jpeg',
        };
        uploadBytes(fileRef, uploadingPicture, metadata)
            .then(() => {
                getDownloadURL(fileRef)
                    .then((url) => {
                        postAlbumImage(url);
                        setAlbumCover(url); // Update the profilePicture state with the new URL
                    })
                    .catch((error) => {
                        console.error(error);
                    });
            })
            .catch((error) => {
                console.error(error);
            });
    };

    const postAlbumImage = (url) => {
        fetch(`${process.env.REACT_APP_API_BASE_URL}/api/postAlbumImage`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify({
                albumId: albumId,
                albumImageUrl: url,
            }),
        })
        .then((res) => res.json())
        .then((data) => console.log(data));
    };

    const postNewAlbum = (albumId) => {
        const timestamp = new Date().toISOString();
        fetch(`${process.env.REACT_APP_API_BASE_URL}/api/postNewAlbum`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify({
                owner: userEmail,
                albumId: albumId,
                timestamp: timestamp,
            }),
        })
        .then((res) => res.json())
        .catch((error) => console.error('Error posting metadata:', error));
    };

    return (
        <>
        {viewState === "initial" && (
             <StyledContainer>
             <StyledContent>
               <div className="max-width">
                 <div className="section-title">Upload your audio/video files</div>
                 <p className="description">To ensure the highest audio quality for your project, all uploaded files must meet the following technical standards:</p>
                    <MainContainer>
                        <StyledDropZone onDragOver={handleDragOver} onDrop={handleDrop}>
                            <div className="upload-icon">
                            <   svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'4rem', height:'4rem'}} ><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" x2="12" y1="3" y2="15"></line></svg>
                            </div>
                            <div className="upload-text">Upload file to get started</div>
                            <label className="upload-button">
                                Choose files
                                <input type="file" accept="video/*, audio/*" onChange={handleFileChange} multiple />
                            </label>
                        </StyledDropZone>
                        <Guidelines>
                            <div className="Guidelines-title">For Audio</div>
                            <p className="Guidelines-description">File type: WAV, FLAC, AIFF</p>
                            <p className="Guidelines-description">Bit depth: 16-bit min</p>
                            <p className="Guidelines-description">Sample rate: 44.1 kHz min</p><br/>
                            <div className="Guidelines-title">For Video</div>
                            <p className="Guidelines-description" >File type: MP4</p>
                            <p className="Guidelines-description">Highest resolution :)</p>
                        </Guidelines>
                    </MainContainer>
                 <StyledCheckboxContainer>
                   <input type="checkbox" id="createAlbumCheckbox" checked={createAlbum} onChange={handleCheckboxChange} />
                   <label style={{margin:0}} htmlFor="createAlbumCheckbox">Create an Album Instantly with Multiple Selection</label>
                 </StyledCheckboxContainer>
               </div>
             </StyledContent>
           </StyledContainer>
        )}

        {viewState === "albumCreation" && (
            <AlbumCreationView>
                <AlbumDetails>
                    <h1 style={{ marginTop: '5vh', marginBottom: '3vh' }}>Album Details</h1>

                    <label htmlFor="albumTitle">Title</label>
                    <input
                        style={{ marginBottom: '3vh', padding: '22px' }}
                        id="albumTitle"
                        type="text"
                        value={albumTitle}
                        onChange={handleTitleChange}
                    />
                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                        <AlbumCoverInput
                            onClick={() => document.getElementById('albumCover').click()}
                            image={albumCover}
                        >
                            {!albumCover && <span>Upload Cover Image</span>}
                            {albumCover && <EditCoverButton />}
                        </AlbumCoverInput>
                        <input 
                            style={{ display: 'none' }}
                            id="albumCover"
                            type="file" 
                            accept="image/*" 
                            onChange={handleAlbumCoverChange}
                        />
                    </div>

                    <label htmlFor="albumDescription">Description</label>
                    <textarea
                        style={{ marginBottom: '3vh', height: '9vh', verticalAlign: 'top', padding: '22px' }}
                        id="albumDescription"
                        type="text"
                        value={albumDescription}
                        onChange={handleDescriptionChange}
                    />

                    <label htmlFor="visibility">Visibility</label>
                    <select id="visibility" value={visibility} onChange={handleVisibilityChange}>
                        <option value="public">Public</option>
                        <option value="private">Private</option>
                    </select>
                </AlbumDetails>
                <FileUploads>
                    <h2 style={{ marginTop: '5vh', marginBottom: '3vh' }}>Tracks from this album</h2>
                    <DragDropContext onDragEnd={onDragEnd}>
                        <Droppable droppableId="fileUploads">
                            {(provided) => (
                                <div {...provided.droppableProps} ref={provided.innerRef}>
                                    {fileUploadsArray.map((file, index) => (
                                        <Draggable key={`${file.data.name}-${index}`} draggableId={`${file.data.name}-${index}`} index={index}>
                                            {(provided) => (
                                                <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                                                    <FileProgressBar 
                                                        file={file.data} 
                                                        progress={uploadProgress[file.data.name] || 0}
                                                        onDelete={() => handleDeleteTrack(file.data.name)}
                                                    />
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </DragDropContext>
                </FileUploads>
            </AlbumCreationView>
        )}

        {viewState === "fileDetail" && (
            <div>
                <h1 style={{ marginLeft: '3vw' }}>Track details</h1>
                {fileUploadsArray.map((file, index) => (
                    <UploadDetailsForm 
                        key={index}
                        file={file}
                        index={index}
                        videoId={file.videoId}
                        handleDetailChange={handleDetailChange}
                        handleImageChange={handleImageChange}
                        handleSubmit={handleSubmit}
                        progress={uploadProgress[file.data.name] || 0}
                        onTrackDetailChange={onTrackDetailChange}
                        trackDetails={trackDetails}
                        handleDelete={() => handleDeleteTrack(file.data.name)}
                    />
                ))}
            </div>
        )}
        </>
    );
};

export default Upload;

const StyledContainer = styled.div`
  min-height: 100vh;
`;

const MainContainer = styled.div`
    display: flex;
    align-items: start;
    gap: 50px;

    @media (max-width: 768px) {
        align-items: center;
        flex-direction: column;
    }

`;

const StyledContent = styled.div`
  padding: 0 32px;
  .max-width {
    max-width: 960px;
    margin: 0 auto;
  }
  .section-title {
    margin-top: 48px;
    font-size: 34px;
    // font-family: 'Playfair Display', serif;
    color: #63639C;
    font-weight: 500;
  }
  .description {
    color:rgb(61, 68, 77);
    font-size: 18px;
    line-height: 1.75;
  }
`;

const StyledDropZone = styled.div`
  border: 2px dashed #D1D5DB;
  border-radius: 8px;
  padding: 64px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.3s;
  height: 300px;
  width: 500px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  align-items: center;
  justify-content: center;
  margin-top: 25px;
  &:hover {
    border-color: #63639C;
  }
  .upload-icon {
    width: 64px;
    height: 64px;
    color: #63639C;
  }
  .upload-text {
    font-size: 20px;
    color:rgb(52, 57, 65);
    font-weight: 500;
    margin-top: 16px;
  }
  .upload-button {
    background-color: #63639C;
    color: white;
    padding: 16px 32px;
    font-size: 18px;
    border-radius: 9999px;
    margin-top: 24px;
    cursor: pointer;
    transition: background-color 0.3s;
    &:hover {
      background-color: rgba(99, 99, 156, 0.9);
    }
    input {
      display: none;
    }
  }
`;

const Guidelines = styled.div`
    margin: 0;
    
    .Guidelines-title {
        margin: 30px 0px;
        font-size: 24px;
        // font-family: 'Playfair Display', serif;
        color: #63639C;
        font-weight: 500;
    }

    .Guidelines-description {
        font-size: 16px;
        color:rgb(61, 68, 77);

    }
`

const StyledCheckboxContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 48px;
  input[type="checkbox"] {
    width: 20px;
    height: 20px;
    border: 2px solid #63639C;
    border-radius: 4px;
    cursor: pointer;
    accent-color: #63639C;
  }
  label {
    font-size: 18px;
    color: #4B5563;
    cursor: pointer;
  }
`;

const DropZone = styled.div`
    --borderHeight: 215px; // Half the height of the image for top and bottom borders
    --borderWidth: 485px; // Half the width of the image for left and right borders

    align-items: center;
    padding: 20px;
    text-align: center;
    margin: 20px;
    height: 35vh;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    position: relative; // Needed for pseudo-elements positioning

    // Pseudo-elements for top, bottom, left, right borders
    &::before, &::after {
        content: "";
        position: absolute;
        background: url(${Rectangle27}) no-repeat;
    }

    // Top border
    &::before {
        top: calc(0 * var(--borderHeight + 100)); // Position outside the div
        left: 0;
        right: 0;
        height: var(--borderHeight);
        background-position: top; // Adjust if needed
    }

    // Bottom border
    &::after {
        bottom: calc(0 * var(--borderHeight)); // Position outside the div
        left: 0;
        right: 0;
        height: var(--borderHeight);
        background-position: bottom; // Adjust if needed
    }
`;

const UploadStyledLabel = styled.label`
    display: inline-block;
    position: relative;
    overflow: hidden;
    cursor: pointer;
    background-color: #434289;
    border-radius: 33px;
    margin-top: 15px;
    padding: 11px;
    color: white;
    margin-bottom: 11px;
    z-index: 11;
    font-size: 14px;
    padding: 22px;
    & input[type="file"] {
        position: absolute;
        width: 100%;
        height: 100%;
        top: 0;
        left: 0;
        opacity: 0;
        cursor: pointer;
        display: none;
    }
`;

const AlbumCreationView = styled.div`
    display: flex;
`;

const AlbumDetails = styled.div`
    width: 45vw;
    display: flex;
    flex-direction: column;
    margin-left: 3vw;
    margin-right: 3vw;
`;

const FileUploads = styled.div`
    flex: 1;
    margin-left: 3vw;
    margin-right: 3vw;
`;

const AlbumCoverInput = styled.div`
    width: 65%;
    height: 170px;
    background-color: ${props => props.image ? 'transparent' : '#f0f0f0'};
    background-image: url(${props => props.image});
    background-size: cover;
    background-repeat: no-repeat;
    background-position: center;
    cursor: pointer;
    display: flex;
    justify-content: center;
    align-items: center; /* Align children vertically */
    position: relative; /* Position relative to the parent */
    margin-bottom: 3vh;
    padding: 0 10px; /* Horizontal padding */
`;

const EditCoverButton = styled.div`
    position: absolute;
    top: 12px; // Adjust as needed
    right: 12px; // Adjust as needed
    width: 24px; // Adjust as needed
    height: 24px; // Adjust as needed
    background-image: url(${WhiteEditIcon});
    background-size: cover;
    cursor: pointer;
    background-color: transparent;
`;

const BottomContainer = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between; // This will space out the children evenly
    padding: 0 10px; // Add padding on the left and right sides
    width: 930px;
    z-index: 11;

    label, div {
        font-size: 22px; // Set the font size for label and span
    }
`;