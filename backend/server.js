const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const PORT = process.env.PORT || 8000;

const {
  getServerHomePage,
  uploadVideo,
  postContentMetaData,
  getPreReviewedVideoList,
  updateContentMetaData,
  updateUserProfile,
  getUserProfile,
  postProfileImage,
  getCheckAccountName,
  getContentById,
  b_getUserExist,
  postNewUserWithAccountName,
  getContentByArtist,
  getApprovedVideoContent,
  deleteContent,
  encodeCreds,
  decodeCreds,
  syncCatalog,
  getSearchResult,
  addUserOnRecombee,
  setUserOnRecombee,
  getItemToUserRecommendations_Scenario_BehindTheScenes,
  getItemToUserRecommendations_Scenario_Concert,
  getItemToUserRecommendations_Scenario_DJSet,
  getItemToUserRecommendations_Scenario_Meditation,
  getItemToUserRecommendations_Scenario_MusicVideo,
  getItemToUserRecommendations_Scenario_StudioRecording,
  getItemToUserRecommendations_Scenario_VideoLesson,
  getItemPropertiesFromRecombee,
  getItemToItemRecommendations,
  getSingleRecommendationForMusicPlayer,
  trackInteraction,

  postNewAlbum,
  postAlbumImage,
  updateAlbumMetaData,
  updatePartialContentMetaData,
  updateReviewStatus,
  postCoverImage,
  postBannerImage,
  updateTrackThumbnail,
  getVideoMetadataFromVideoId,
  getVideoMetadataFromObjectId,
  getAlbumsByArtist,
  getAlbumById,
  deleteAlbum,
  postNewContentTypePropertyWithAttributes,
  getUserProfileById,
  getMostPlayedTracksByArtist,
  addTrackToAlbum,
  getAlbum,
  getTrack,
  postNewCardForPayment,
  getCard,
  getAllCards,
  getPaymentToken,
  saveOrder,
  getOrders,
  savePlan,
  getPlanOfUser,
  postCreateLiveStream,
  getContentDocumentsByCategory,
  updateContentCategory,
  postCreateEvent,
  postEditEvent,
  postCreateOffer,
  postEditOffer,
  getUserLoves,
  updateUserLoves,
  getUserFavorites,
  updateUserFavorites,
  updateUserSubscription,
  logContentUsage,
  getUserPlaybackHistory,
  updateUserPlaybackHistory,
  sendThanksCoinsViaArtistPage,
  sendThanksCoinsViaAlbumPage,
  sendThanksCoinsViaContent,
  PostUserOnboardingProgress,
  getArtistNames,
  storeEmailOnWaitlist,
  signup,
  login,
  refreshAccessToken,
  logout,
  getUserProfileByEmails,
  requestPasswordReset,
  resetPassword,
  updateTrackViews,
  getAllContent,
} = require("./handlers");

const { CreateImageThumbnail } = require("./controllers/ThumbnailController");

const multer = require("multer");
const fs = require("fs");

// Multer configuration for in-memory storage
const upload = multer({ dest: "uploads/" });
const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};
ensureDir('processed');

express()
  .use(cors({
    origin: ['https://staging.ss-mono-repo.pages.dev', 'http://localhost:3000', '*'],
    methods: ["GET", "POST", "DELETE", "UPDATE", "PUT", "PATCH", "OPTIONS"],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 204
  }))
  .options('*', cors())
  .use((req, res, next) => {
    console.log('Request headers:', req.headers);
    console.log('Response headers:', res.getHeaders());
    next();
  })
  .use(express.json())
  .use(bodyParser.json({}))
  .use(cookieParser())
  .get("/", getServerHomePage)
  .post("/api/upload/video", upload.single("video"), uploadVideo)
  .post("/api/postContentMetaData", postContentMetaData)
  .get("/api/getPreReviewedVideoList", getPreReviewedVideoList)
  .post("/api/updateContentMetaData", updateContentMetaData)
  .post("/api/updateUserProfile", updateUserProfile)
  .get("/api/getUserProfile/:userId", getUserProfile)
  .get("/api/getUserProfileById/:userId", getUserProfileById)
  .post("/api/postProfileImage", postProfileImage)
  .get("/api/getCheckAccountName", getCheckAccountName)
  .post("/api/postCreateImageThumbnail", CreateImageThumbnail)
  .get("/api/getContentById", getContentById)
  .get("/api/b_getUserExist/:userId", b_getUserExist)
  .post("/api/postNewUserWithAccountName", postNewUserWithAccountName)
  .get("/api/getContentByArtist", getContentByArtist)
  .get("/api/getMostPlayedTracksByArtist", getMostPlayedTracksByArtist)
  .get("/api/getApprovedVideoContent", getApprovedVideoContent)
  .delete("/api/deleteContent", deleteContent)
  .post("/api/postNewAlbum", postNewAlbum)
  .post("/api/postAlbumImage", postAlbumImage)
  .post("/api/updateAlbumMetaData", updateAlbumMetaData)
  .post("/api/updatePartialContentMetaData", updatePartialContentMetaData)
  .post('/api/updateReviewStatus', updateReviewStatus)
  .post('/api/postCoverImage', postCoverImage)
  .post('/api/postBannerImage', postBannerImage)
  .post('/api/updateTrackThumbnail', updateTrackThumbnail)
  .get("/api/getVideoMetaDataFromVideoId/:id", getVideoMetadataFromVideoId)
  .get("/api/getVideoMetaDataFromObjectId/:id", getVideoMetadataFromObjectId)
  .get("/api/getAlbumsByArtist", getAlbumsByArtist)
  .get("/api/getAlbumById", getAlbumById)
  .delete("/api/deleteAlbum/:albumId", deleteAlbum)
  .post("/api/postCreateEvent", postCreateEvent)
  .post("/api/postEditEvent/:id", postEditEvent)
  .post("/api/postCreateOffer", postCreateOffer)
  .post("/api/postEditOffer/:id", postEditOffer)
  .get("/api/getUserLoves", getUserLoves)
  .patch("/api/updateUserLoves", updateUserLoves)
  .get("/api/getUserFavorites", getUserFavorites)
  .patch("/api/updateUserFavorites", updateUserFavorites)
  .patch("/api/updateUserSubscription", updateUserSubscription)
  .post("/api/logContentUsage", logContentUsage)
  .get("/api/getUserPlaybackHistory", getUserPlaybackHistory)
  .patch("/api/updateUserPlaybackHistory", updateUserPlaybackHistory)
  .patch("/api/sendThanksCoinsViaArtistPage", sendThanksCoinsViaArtistPage)
  .patch("/api/sendThanksCoinsViaAlbumPage", sendThanksCoinsViaAlbumPage)
  .patch("/api/sendThanksCoinsViaContent", sendThanksCoinsViaContent)
  .post("/api/PostUserOnboardingProgress", PostUserOnboardingProgress)
  .get("/api/getArtistNames", getArtistNames)
  .post("/api/storeEmailOnWaitlist", storeEmailOnWaitlist)
  .get('/api/getUserProfilesByEmails', getUserProfileByEmails)




  //Authentication
  .post("/api/signup", signup)
  .post("/api/login", login)
  .post("/api/refreshToken", refreshAccessToken)
  .post("/api/logout", logout)
  .post("/api/request-password-reset", requestPasswordReset)
  .post("/api/reset-password", resetPassword)
  

  //Key encryption:
  .post("/api/encodeCreds", encodeCreds)
  .post("/api/decodeCreds", decodeCreds)

  //Recombee:
  .get("/api/syncCatalog", syncCatalog)
  .get("/api/getItemToUserRecommendations_Scenario_MusicVideo/:userId", getItemToUserRecommendations_Scenario_MusicVideo)
  .get("/api/getItemToUserRecommendations_Scenario_Meditation/:userId", getItemToUserRecommendations_Scenario_Meditation)
  .get("/api/getItemToUserRecommendations_Scenario_StudioRecording/:userId", getItemToUserRecommendations_Scenario_StudioRecording)
  .get("/api/getItemToUserRecommendations_Scenario_DJSet/:userId", getItemToUserRecommendations_Scenario_DJSet)
  .get("/api/getItemToUserRecommendations_Scenario_BehindTheScenes/:userId", getItemToUserRecommendations_Scenario_BehindTheScenes)
  .get("/api/getItemToUserRecommendations_Scenario_Concert/:userId", getItemToUserRecommendations_Scenario_Concert)
  .get("/api/getItemToUserRecommendations_Scenario_VideoLesson/:userId", getItemToUserRecommendations_Scenario_VideoLesson)
  .get("/api/getItemToItemRecommendations/:userId/:itemId", getItemToItemRecommendations)
  .get("/api/getSearchResult/:userId/:searchQuery", getSearchResult)
  .get("/api/getItemPropertiesFromRecombee/:itemId", getItemPropertiesFromRecombee)
  .get("/api/getSingleRecommendationForMusicPlayer/:userId", getSingleRecommendationForMusicPlayer)
  .post("/api/trackInteraction", trackInteraction)
  // .post("/api/addUserOnRecombee/:userId", addUserOnRecombee) //For Manual Insertion Only!
  // .post("/api/setUserOnRecombee/:userId", setUserOnRecombee) //For Manual Insertion Only!
  

  //MongoDB data management:
  .post("/api/postNewContentTypePropertyWithAttributes", postNewContentTypePropertyWithAttributes)
  .post("/api/addTrackToAlbum", addTrackToAlbum)
  .get("/api/getAlbum/:albumId", getAlbum)
  .get("/api/getTrack/:trackId", getTrack)
  .post("/api/postNewCardForPayment", postNewCardForPayment)
  .post("/api/getCard", getCard)
  .get("/api/getAllCards/:userId", getAllCards)
  .get("/api/getTilopayToken", getPaymentToken)
  .post("/api/saveOrder", saveOrder)
  .get("/api/orders/:userId", getOrders)
  .post("/api/save-plan", savePlan)
  .get("/api/get-plan/:userId", getPlanOfUser)
  // .post("/api/postNewContentTypePropertyWithAttributes", postNewContentTypePropertyWithAttributes)
  .post("/api/postNewContentTypePropertyWithAttributes", postNewContentTypePropertyWithAttributes) //used to create the contentType property in ContentMetaData, ConcertMetaData and AlbumMetaData collection
  .get("/api/getContentDocumentsByCategory/:category", getContentDocumentsByCategory) //Database Inspection tool for Content by Category type
  .patch("/api/updateContentCategory", updateContentCategory)
  .patch("/api/updateTrackViews/:videoId", updateTrackViews)
  .get("/api/getAllContent", getAllContent)

  //Mux endpoint:
  .post("/api/postCreateLiveStream", postCreateLiveStream)

  .listen(PORT, () => {
    console.log(`Server launched on port ${PORT}`);
  });