const express = require("express");
const PORT_NUMBER = 8001;

const {
    postVideoMetaData,
    getPreReviewedVideoList,
    updateVideoMetaData,
    updateUserProfile,
    getUserProfile,
    postProfileImage,
    checkAccountName,
} = require("./handlers");

express()
    .use(express.json())
    .post("/api/postVideoMetaData", postVideoMetaData)
    .get("/api/getPreReviewedVideoList", getPreReviewedVideoList)
    .post("/api/updateVideoMetaData", updateVideoMetaData)
    .post("/api/updateUserProfile", updateUserProfile)
    .get('/api/getUserProfile/:userId', getUserProfile)
    .post('/api/postProfileImage', postProfileImage)
    .get('/api/checkAccountName/:username', checkAccountName)

    .listen(PORT_NUMBER, () => {
        console.log(`Server launched on port ${PORT_NUMBER}`)
    });

    




