const { MongoClient, ObjectId } = require("mongodb");
require("dotenv").config();
const { MONGO_URI, JWT_SECRET } = process.env;
const { SyncRecombee } = require("./utils/SyncRecombee");
const storage = require("./utils/googleCloudStorage");
const { decryptData } = require("./utils/cardDetailsEncryption");
const axios = require("axios");
const { Video } = require("@mux/mux-node");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const path = require("path");
const admin = require('firebase-admin');

const base64EncodedKey = process.env.ENCODED_KEY;
const decodedKey = JSON.parse(Buffer.from(base64EncodedKey, "base64").toString("utf-8"));

admin.initializeApp({
  credential: admin.credential.cert(decodedKey),
  storageBucket: process.env.FIREBASE_STORAGEBUCKET,
});

const bucket = admin.storage().bucket();

const {
  findSubscriptionByEmail,
  createSubscription,
  updateSubscription,
} = require("./utils/beehiivAPI");
const { timeStamp } = require("console");
const mux = new Video(process.env.MUX_ACCESS_TOKEN, process.env.MUX_SECRET_KEY);

const { 
    AddUser,
    AddUserProperty,
    SetUserValues,
    RecommendItemsToUser,
    RecommendItemsToItem,
    SetItemValues,
    SearchItems,
    GetItemValues,
    AddDetailView,
    AddPurchase,
} = require("recombee-api-client").requests;

const options = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
};

const sanitizeUserId = (userId) => {
    return userId.replace(/[+]/g, '_');
};

const getServerHomePage = async (req, res) => {
    res.status(200).json({status: 200, message:`Sacred Sound Studio Back End Server is currently up and running!`});
};

const postNewUserWithAccountName = async (req, res) => {
    const { email, accountName, isArtist, timestamp } = req.body;
    const contentType = "userAccounts";
    const user = {
        email,
        accountName,
        isArtist,
        timestamp,
        contentType: contentType,
    };

    const client = await new MongoClient(MONGO_URI, options);
    try {
        const { recombeeClient } = require("./utils/recombeeClient");
        client.connect();
        const db = client.db("db-name");

        // First try-catch block for MongoDB operations
        try {
            // Add the user to Recombee
            const userId = email;
            
            const oldUser = await db.collection("userAccounts").findOne({email: userId})
            if(oldUser){
                return res.status(409).json({
                    status: 409,
                    message: "User already created.",
                });
            }
            // Continue with MongoDB operations (inserting the user)
            const result = await db.collection("userAccounts").insertOne(user);

            if (result.insertedId) {
                console.log("User added to MongoDB successfully!");
                const sanitizedUserId = sanitizeUserId(userId);
                await recombeeClient.send(new AddUser(sanitizedUserId));
                res.status(200).json({ status: 200, result: result });
            } else {
                console.log("Failed to create user in MongoDB.");
                res.status(400).json({
                    status: 400,
                    message: "Failed to create user in MongoDB.",
                });
            }
        } catch (mongoError) {
            console.error("Error in MongoDB operations:", mongoError.message);
            console.error("Error details:", mongoError);

            // Continue with appropriate response to the client
            res.status(500).json({ status: 500, message: "Internal server error" });
        }

        // Second try-catch block for Recombee operations
        try {
            // Set values for the user properties
            const userId = email;
            const userProperties = {
                accountName: accountName,
                isArtist: isArtist,
                timestamp: timestamp,
                currentOnBoardingStep : 0,
                isOnboardingStepsPending : true,
            };

            // Create a SetUserValues request with both the user ID and properties
            const sanitizedUserId = sanitizeUserId(userId);
            const setUserValuesRequest = new SetUserValues(sanitizedUserId, userProperties);

            // Send the request to set user values
            await recombeeClient.send(setUserValuesRequest);

            console.log("User properties added to Recombee successfully!");
        } catch (recombeeError) {
            console.error("Error in Recombee operations:", recombeeError.message);
            console.error("Error details:", recombeeError);
            // Log the error, but continue with the function execution
        }
    } catch (mainError) {
        console.error("Error in the main function:", mainError.message);
        // Continue with appropriate response to the client
        res.status(500).json({ status: 500, message: "Internal server error" });
    } finally {
        client.close();
    }
};

const postContentMetaData = async (req, res) => {
    const { owner, videoId, timestamp,  fileUrl, b_isPreparedForReview, b_hasBeenReviewed, b_isApproved, isOnlyAudio, visibility, category } = req.body;
    const ContentMetaData = {
        owner,
        videoId,
        timestamp,
        fileUrl,
        isOnlyAudio,
        b_isPreparedForReview: b_isPreparedForReview,
        b_hasBeenReviewed: b_hasBeenReviewed,
        b_isApproved: b_isApproved,
        visibility: visibility,
        category: category,
        contentType: 'ContentMetaData',
    };

    const client = await new MongoClient(MONGO_URI, options);
    try{
        client.connect();
        const db = client.db('db-name');
        const result = await db.collection("ContentMetaData").insertOne(ContentMetaData);
        res.status(200).json({ status: 200, result: result })
        client.close();
    }
    catch (e){
        res.status(400).json({ status: 400, message: e.message })
    }
}

const uploadBufferToFirebase = async (filePath, firebasePath) => {

    try {
  
      // Read the file as a buffer
      const fileBuffer = fs.readFileSync(filePath);
  
      const file = bucket.file(firebasePath);
      
      // Create a reference to the location in Firebase Storage
      const stream = file.createWriteStream({
        resumable: true,
        metadata: {
          contentType: "video/mp4",
        },
      });
  
      stream.end(fileBuffer);
  
      return new Promise((resolve, reject) => {
        stream.on("finish", async () => {
  
          // Get public URL or signed URL
          const [url] = await file.getSignedUrl({
            action: "read",
            expires: "03-01-2099",
          });
          resolve(url);
        });
  
        stream.on("error", (error) => {
          console.error("Error uploading file:", error);
          reject(error);
        });
      });
    } catch (error) {
      console.error("🚀 ~ uploadBufferToFirebase ~ error:", error);
    }
  };
  
  // Helper function to process and upload video streams
  const processAndUploadVideo = async (file, videoId, userEmail) => {
    const qualities = [240, 360, 480, 720, 1080];
    const videoUrls = [];
  
    const payload = qualities.map((quality)=> {
      return new Promise((resolve, reject) => {
        const outputStream = `processed/${quality}.mp4`;
  
        ffmpeg(file.path)
          .inputFormat('mp4') // Assuming the input buffer is MP4
          .addOptions([
            `-vf scale=-2:${quality}`,
            "-preset veryfast",
            "-g 48",
            "-sc_threshold 0",
            "-c:v libx264",
            "-c:a aac",
            "-ar 48000",
            "-b:a 128k",
            "-hls_time 4",
            "-hls_playlist_type vod",
          ])
          .on("end", resolve)
          .on("error", (e) => console.log(e))
          .output(outputStream)
          .run();
      });
    })
    await Promise.all(payload);
  
    for (const quality of qualities) {
      const firebasePath = `Uploads/${userEmail}/${videoId}_${quality}p`;
      await uploadBufferToFirebase(`processed/${quality}.mp4`, firebasePath)
      .then((url) => {
        videoUrls.push({ quality, url });
      })
      .catch((e) => console.log(e));
    }
  
    fs.unlinkSync(file.path);
    const folderPath = 'processed/'
    const files = fs.readdirSync(folderPath);
  
    // Loop through the files and delete each one
    for (const file of files) {
      const filePath = path.join(folderPath, file);
      fs.unlinkSync(filePath);
      console.log(`Deleted file: ${filePath}`);
    }
    return videoUrls;
  };

const uploadVideo = async (req, res) => {
    const file = req.file;
    console.log("filefile", file);
    const { videoId, userEmail } = req.body;

    if (!file) {
      return res.status(400).send("No video file uploaded.");
    }

    try {
      const videoUrls = await processAndUploadVideo(file, videoId, userEmail);
      console.log("🚀 ~ .post ~ videoUrls:", videoUrls);
      res.send({ message: "Video processed and uploaded.", urls: videoUrls });
    } catch (error) {
      console.log("🚀 ~ .post ~ error:", error);
      res.status(500).send({ message: "Error processing video.", error });
    }
  }

const getPreReviewedVideoList = async (req, res) => {
    const client = await new MongoClient(MONGO_URI, options);
    try {
        await client.connect();
        const collection = client.db('db-name').collection('ContentMetaData');
        const videos = await collection.find({
            owner: req.query.owner,
            b_isPreparedForReview: false
        }).toArray();
        res.json(videos);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    } finally {
        await client.close();
    }
};

const updateContentMetaData = async (req, res) => {
    const { videoId, b_isPreparedForReview, title, description, category, tags } = req.body;

    if (!videoId) {
        return res.status(400).json({ error: "Missing videoId parameter" });
    }

    const client = await MongoClient.connect(MONGO_URI, options);
    try {
        const db = client.db("db-name");
        const collection = db.collection("ContentMetaData");

        const query = { videoId: videoId };
        const update = { 
            $set: {
                b_isPreparedForReview: b_isPreparedForReview,
                title: title,
                description: description,
                category: category,
                tags: tags,
            }
        };
        const options = { returnOriginal: false };

        const result = await collection.findOneAndUpdate(query, update, options);

        if (!result.value) {
            return res.status(404).json({ error: "No document found with that videoId" });
        }

        return res.status(200).json({ status: 200, result: result.value });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: error.message });
    } finally {
        client.close();
    }
};

const updateUserProfile = async (req, res) => {
    const { accountName, bio, artistLink, userId, artistTitle, bannerImageUrl, profileImageUrl } = req.body;

    const client = await MongoClient.connect(MONGO_URI, options);
    try {
        const db = client.db("db-name");
        const collection = db.collection("userAccounts");

        const query = { _id: new ObjectId(userId) };
        const update = {
            $set: {
                accountName,
                bio,
                artistLink,
                artistTitle,
                bannerImageUrl,
                profileImageUrl
            },
        };
        const options = { returnOriginal: false };
        const user = await collection.findOne(query)
        const result = await collection.findOneAndUpdate(query, update, options);

        if (!result.value) {
            return res.status(404).json({ error: "No document found with that email" });
        }
        else {
            const { recombeeClient } = require("./utils/recombeeClient");
            // Set values for the user properties in Recombee
            const userProperties = {
                accountName: accountName,
                bio: bio,
                artistLink: artistLink,
            };

            // Create a SetUserValues request with both the user ID and properties
            const sanitizedUserId = sanitizeUserId(user.email);
            const setUserValuesRequest = new SetUserValues(
                sanitizedUserId,
                userProperties
            );

            // Send the request to set user values
            await recombeeClient.send(setUserValuesRequest);
        }

        return res.status(200).json({ status: 200, result: result.value });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: error.message });
    } finally {
        client.close();
    }
};

const getUserProfile = async (req, res) => {
    // Check if userId is undefined or not provided, and return a default object
    if (!req.params.userId || req.params.userId === 'undefined') {
        console.log("getUserProfile called with undefined userId");

        // Return a default response with empty strings for user properties
        return res.status(200).json({
            accountName: '',
            bio: '',
            artistLink: '',
            profileImageUrl: '',
            artistTitle: ''
        });
    }

    const client = await new MongoClient(MONGO_URI, options);
    try {
        const db = client.db("db-name");
        const collection = db.collection('userAccounts');
        const user = await collection.findOne({ email: req.params.userId });
        
        if (!user) {
            // If no user is found, return the default object as well
            return res.status(200).json({
                accountName: '',
                bio: '',
                artistLink: '',
                profileImageUrl: '',
                artistTitle: ''
            });
        }

        const { accountName, bio, artistLink, profileImageUrl, artistTitle } = user;

        return res.status(200).json({ accountName, bio, artistLink, profileImageUrl, artistTitle });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error' });
    } finally {
        await client.close();
    }
};

const getUserProfileById = async (req, res) => {
    if (!req.params.userId || req.params.userId === 'undefined') {

        return res.status(200).json({
            accountName: '',
            bio: '',
            artistLink: '',
            profileImageUrl: '',
            artistTitle: ''
        });
    }

    const client = await new MongoClient(MONGO_URI, options);
    try {
        const db = client.db("db-name");
        const collection = db.collection('userAccounts');
        const user = await collection.findOne({ _id: new ObjectId(req.params.userId) });
        if (!user) {
            return res.status(200).json({
                accountName: '',
                bio: '',
                artistLink: '',
                profileImageUrl: '',
                artistTitle: ''
            });
        }


        return res.status(200).json(user);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error' });
    } finally {
        await client.close();
    }
};

const b_getUserExist = async (req, res) => {
    const client = await new MongoClient(MONGO_URI, options);
    try {
        const db = client.db("db-name");
        const collection = db.collection('userAccounts');
        const user = await collection.findOne({ email: req.params.userId });
        
        if (!user) {
            return res.status(404).json({ exist: false, message: 'User not found' });
        }
        
        return res.status(200).json({ exist: true, message: 'User found', user: user });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error' });
    } finally {
        await client.close();
    }
};

const getContentById = async (req, res) => {
    const client = await new MongoClient(MONGO_URI, options);
    try {
        const db = client.db("db-name");
        const collection = db.collection('ContentMetaData');
        const contentDocument = await collection.findOne({ videoId: req.query.videoId });
        if (!contentDocument) {
            return res.status(404).json({ message: 'contentDocument not found: err.404' });
        }
        return res.status(200).json({ contentDocument });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error' });
    } finally {
        await client.close();
    }
};

const postProfileImage = async (req, res) => {
    const { profileImageUrl, email } = req.body; 
    const client = await MongoClient.connect(MONGO_URI, options);
    try {
        const db = client.db("db-name");
        const collection = db.collection("userAccounts");

        const query = { "email": email };
        const update = {
            $set: {
                profileImageUrl,
            },
        };
        const options = { returnOriginal: false };

        const result = await collection.findOneAndUpdate(query, update, options);

        if (!result.value) {
            return res.status(404).json({ error: "No document found with that email" });
        }

        return res.status(200).json({ status: 200, result: result.value });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: error.message });
    } finally {
        client.close();
    }
}

const getCheckAccountName = async (req, res) => {
    const { accountName, email } = req.query;
    const client = await new MongoClient(MONGO_URI, options);
    try {
        const db = client.db("db-name");
        const collection = db.collection('userAccounts');

        // Check if the account name is too short
        if (accountName.length < 3) {
            return res.status(200).json({ taken: true, message: 'Account names need to be at least 3 characters long.' });
        }

        const existingUser = await collection.findOne({ accountName });

        // Check if the account name is taken by the current user
        if (existingUser && existingUser.email === email) {
            return res.status(200).json({ taken: false, message: 'This is your current account name.' });
        }
        // Check if the account name is taken by another user
        else if (existingUser) {
            return res.status(200).json({ taken: true, message: 'Account name already exists.' });
        }

        // The account name is not taken and is of valid length
        return res.status(200).json({ taken: false, message: 'Account name is available.' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error' });
    } finally {
        await client.close();
    }
};

const getContentByArtist = async (req, res) => {
    const client = await new MongoClient(MONGO_URI, options);

    try {
        const { artistId } = req.query;
        if (!artistId) {
        return res.status(400).json({ message: 'Missing artistId parameter' });
        }
        console.log('fetching getContentByArtist:', artistId)
        await client.connect();
        const collection = client.db('db-name').collection('ContentMetaData');
        const contentDocuments = await collection.find({ owner: artistId }).toArray();
        res.json(contentDocuments);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error' });
    } finally {
        client.close();
    }
};

const getMostPlayedTracksByArtist = async (req, res) => {
    const client = await new MongoClient(MONGO_URI, options);

    try {
        const { artistId } = req.query;
        if (!artistId) {
            return res.status(400).json({ message: 'Missing artistId parameter' });
        }

        await client.connect();
        const collection = client.db('db-name').collection('ContentMetaData');
        
        // First get all tracks with views
        let tracksWithViews = await collection.aggregate([
            { 
                $match: { 
                    owner: artistId,
                    views: { $exists: true, $ne: null }
                }
            },
            {
                $lookup: {
                    from: 'userAccounts',
                    localField: 'owner',
                    foreignField: 'email',
                    as: 'user'
                }
            },
            { $unwind: '$user' },
            { $sort: { views: -1 } }
        ]).toArray();

        // If we have 3 or more tracks with views, just take the top 3
        if (tracksWithViews.length >= 3) {
            return res.status(200).json({ 
                status: 200, 
                message: "Top viewed tracks fetched successfully", 
                tracks: tracksWithViews.slice(0, 3) 
            });
        }

        // If we have some tracks with views but less than 3,
        // get additional tracks without views to complete the set
        const remainingNeeded = 3 - tracksWithViews.length;
        if (remainingNeeded > 0) {
            const tracksWithoutViews = await collection.aggregate([
                { 
                    $match: { 
                        owner: artistId,
                        $or: [
                            { views: { $exists: false } },
                            { views: null }
                        ]
                    }
                },
                {
                    $lookup: {
                        from: 'userAccounts',
                        localField: 'owner',
                        foreignField: 'email',
                        as: 'user'
                    }
                },
                { $unwind: '$user' },
                { $limit: remainingNeeded }
            ]).toArray();

            // Combine the tracks with views and without views
            const combinedTracks = [...tracksWithViews, ...tracksWithoutViews];

            return res.status(200).json({ 
                status: 200, 
                message: "Mixed tracks fetched successfully", 
                tracks: combinedTracks 
            });
        }

        // If we get here and tracksWithViews is empty, get any 3 tracks
        if (tracksWithViews.length === 0) {
            const anyTracks = await collection.aggregate([
                { 
                    $match: { 
                        owner: artistId
                    }
                },
                {
                    $lookup: {
                        from: 'userAccounts',
                        localField: 'owner',
                        foreignField: 'email',
                        as: 'user'
                    }
                },
                { $unwind: '$user' },
                { $limit: 3 }
            ]).toArray();

            return res.status(200).json({ 
                status: 200, 
                message: "Random tracks fetched successfully", 
                tracks: anyTracks 
            });
        }

        // If we get here, just return whatever tracks with views we found
        return res.status(200).json({ 
            status: 200, 
            message: "Partial tracks fetched successfully", 
            tracks: tracksWithViews 
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error' });
    } finally {
        client.close();
    }
};

const getApprovedVideoContent = async (req, res) => {
    const client = await new MongoClient(MONGO_URI, options);

    try {
        await client.connect();
        const collection = client.db('db-name').collection('ContentMetaData');
        
        // Find documents where both isOnlyAudio is false and b_isApproved is true
        const contentDocuments = await collection.find({ isOnlyAudio: false, b_isApproved: true }).toArray();
        res.json(contentDocuments);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error' });
    } finally {
        client.close();
    }
};

const deleteContent = async (req, res) => {
    const client = new MongoClient(MONGO_URI, options);
    try {
        const { recombeeClient } = require("./utils/recombeeClient");
        await client.connect();
        const collection = client.db('db-name').collection('ContentMetaData');
        const videoId = req.query.videoId;
        const userId = req.headers['user-id'];
        console.log('Incoming videoId:', videoId);
        console.log('Incoming userId:', userId);

        // Check if the user making the request is the owner of the content
        const contentDocument = await collection.findOne({ videoId, owner: userId });
        console.log('Content document:', contentDocument);

        if (!contentDocument) {
            console.log('Document not found or unauthorized access');
            return res.status(404).json({ message: 'Video not found or unauthorized' });
        }

        try {
            const itemProperties = { deleted: true };
            const recombeeItemId = contentDocument._id.toString();
            console.log('Recombee item ID:', recombeeItemId);
            const setItemValuesRequest = new SetItemValues(recombeeItemId, itemProperties);
            console.log('Recombee request:', setItemValuesRequest);
            await recombeeClient.send(setItemValuesRequest);
        } catch (recombeeError) {
            console.error('Recombee error, proceeding with MongoDB deletion:', recombeeError);
        }

        // Delete the file from Google Cloud Storage
        const fileUrl = contentDocument.fileUrl;
        const matches = fileUrl.match(/https:\/\/firebasestorage.googleapis.com\/v0\/b\/([^\/]+)\/o\/([^?]+)/);
        console.log('File URL:', fileUrl, 'Matches:', matches);

        if (matches && matches.length >= 3) {
            const bucketName = matches[1];
            const filePath = decodeURIComponent(matches[2]);
            console.log(`Deleting file from bucket: ${bucketName}, path: ${filePath}`);
            await storage.bucket(bucketName).file(filePath).delete();
            console.log(`File ${filePath} deleted from bucket ${bucketName}.`);
        } else {
            console.warn('Could not extract bucket name and file path from URL:', fileUrl);
        }

        // Proceed to delete the document with the specified videoId in MongoDB
        console.log('Attempting to delete MongoDB document...');
        const result = await collection.deleteOne({ videoId });
        console.log('Delete result:', result);

        if (result.deletedCount === 0) {
            console.log('Document not found for deletion');
            return res.status(404).json({ message: 'Video not found' });
        }

        res.status(200).json({ message: 'Video deleted successfully' });
    } catch (error) {
        console.error('Error deleting content:', error);
        return res.status(500).json({ message: 'Server error' });
    } finally {
        if (client) {
            console.log('Closing MongoDB client');
            await client.close();
        }
    }
};


const postNewAlbum = async (req, res) => {
const { owner, albumId, albumName, description } = req.body;
    const AlbumMetaData = {
        owner,
        albumId,
        timestamp: new Date(),
        albumName,
        description,
        contentType: 'AlbumMetaData',
    };
    const client = await new MongoClient(MONGO_URI, options);
    try{
        client.connect();
        const db = client.db('db-name');
        const result = await db.collection("AlbumMetaData").insertOne(AlbumMetaData);
        res.status(200).json({ status: 200, result: result })
        client.close();
    }
    catch (e){
        res.status(400).json({ status: 400, message: e.message })
    }
}

const postAlbumImage = async (req, res) => {
    const { albumImageUrl, albumId } = req.body; 
    const client = await MongoClient.connect(MONGO_URI, options);
    try {
        const db = client.db("db-name");
        const collection = db.collection("AlbumMetaData");

        const query = { "albumId": albumId };
        const update = {
            $set: {
                albumImageUrl,
            },
        };
        const options = { returnOriginal: false };

        const result = await collection.findOneAndUpdate(query, update, options);

        if (!result.value) {
            return res.status(404).json({ error: "No document found with that albumId" });
        }

        return res.status(200).json({ status: 200, result: result.value });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: error.message });
    } finally {
        client.close();
    }
}

const updateAlbumMetaData = async (req, res) => {
    const { albumId, title, description, visibility, albumOrder, albumImageUrl } = req.body;
    const client = await MongoClient.connect(MONGO_URI, options);
    try {
        const db = client.db("db-name");
        const collection = db.collection("AlbumMetaData");
        
        // Log for debugging
        console.log('updateAlbumMetaData: ', albumId, title, description, visibility, albumOrder, albumImageUrl);

        // Construct the update document based on provided fields
        const updateDoc = { $set: {} };
        if (title !== undefined) updateDoc.$set.albumName = title;
        if (description !== undefined) updateDoc.$set.description = description;
        if (visibility !== undefined) updateDoc.$set.visibility = visibility;
        if (albumOrder !== undefined) updateDoc.$set.albumOrder = albumOrder;
        // Conditionally include albumImageUrl if it's provided
        if (albumImageUrl !== undefined) updateDoc.$set.albumImageUrl = albumImageUrl;

        const query = { albumId: albumId };
        const options = { returnOriginal: false };

        const result = await collection.findOneAndUpdate(query, updateDoc, options);

        if (!result.value) {
            return res.status(404).json({ error: "No document found with that albumId: ", albumId });
        }

        return res.status(200).json({ status: 200, result: result.value });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: error.message });
    } finally {
        client.close();
    }
};

const updatePartialContentMetaData = async (req, res) => {
    const { videoId, ...updateFields } = req.body;
    console.log("updatePartialContentMetaData - req.body: ", req.body);

    if (!videoId) {
        return res.status(400).json({ error: "Missing videoId parameter" });
    }

    const client = await MongoClient.connect(MONGO_URI, options);
    try {
        const db = client.db("db-name");
        const collection = db.collection("ContentMetaData");

        const query = { videoId: videoId };
        const update = { $set: {} };
        let hasValidFields = false;

        for (const [key, value] of Object.entries(updateFields)) {
            if (value !== undefined) {
                update.$set[key] = value;
                hasValidFields = true;
            }
        }

        if (!hasValidFields) {
            return res.status(400).json({ error: "No valid fields to update" });
        }

        const options = { returnOriginal: false };
        const result = await collection.findOneAndUpdate(query, update, options);

        if (!result.value) {
            return res.status(404).json({ error: "No document found with that videoId" });
        }

        return res.status(200).json({ status: 200, result: result.value });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: error.message });
    } finally {
        client.close();
    }
};

const updateReviewStatus = async (req, res) => {
    const { videoId, b_isPreparedForReview } = req.body;

    console.log("updateReviewStatus :", videoId, b_isPreparedForReview)
    // Input validation
    if (!videoId || typeof b_isPreparedForReview !== 'boolean') {
        return res.status(400).json({ message: 'Invalid request' });
    }

    // Create a new MongoDB client and connect
    const client = await MongoClient.connect(MONGO_URI, options);
    try {
        const db = client.db("db-name");
        const collection = db.collection("ContentMetaData");

        const result = await collection.updateOne(
            { videoId: videoId },
            { $set: { b_isPreparedForReview: b_isPreparedForReview } }
        );

        if (result.modifiedCount === 0) {
            return res.status(404).json({ message: 'Video not found or no update needed' });
        }

        res.json({ message: 'Review status updated successfully', videoId: videoId });
    } catch (error) {
        console.error('Error updating review status:', error);
        res.status(500).json({ message: 'Internal server error' });
    } finally {
        // Ensure that the client will close when you finish/error
        await client.close();
    }
};

const postCoverImage = async (req, res) => {
const { videoId, selectedImageThumbnail } = req.body; 
    const client = await MongoClient.connect(MONGO_URI, options);
    try {
        const db = client.db("db-name");
        const collection = db.collection("ContentMetaData");

        const query = { "videoId": videoId };
        const update = {
            $set: {
                selectedImageThumbnail,
            },
        };
        const options = { returnOriginal: false };

        const result = await collection.findOneAndUpdate(query, update, options);

        if (!result.value) {
            return res.status(404).json({ error: "No document found with that videoId" });
        }

        return res.status(200).json({ status: 200, result: result.value });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: error.message });
    } finally {
        client.close();
    }
}

const postBannerImage = async (req, res) => {
    const { bannerImageUrl, email } = req.body; 
    console.log("bannerImageUrl: ", bannerImageUrl);
    console.log("email: ", email)
    const client = await MongoClient.connect(MONGO_URI, options);
    try {
        const db = client.db("db-name");
        const collection = db.collection("userAccounts");

        const query = { "email": email };
        const update = {
            $set: {
                bannerImageUrl,
            },
        };
        const options = { returnOriginal: false };

        const result = await collection.findOneAndUpdate(query, update, options);

        if (!result.value) {
            return res.status(404).json({ error: "No document found with that email" });
        }

        return res.status(200).json({ status: 200, result: result.value });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: error.message });
    } finally {
        client.close();
    }
}

const updateTrackThumbnail = async (req, res) => {
    console.log('updateTrackThumbnail');
    const { videoId, thumbnailUrl } = req.body;
    const client = await MongoClient.connect(MONGO_URI, options);
    const db = client.db("db-name");

    if (!videoId || !thumbnailUrl) {
        return res.status(400).send("Missing videoId or thumbnailUrl");
    }

    try {
        console.log('thumbnailUrl :', thumbnailUrl)
        const tracksCollection = db.collection('ContentMetaData');

        // Update the thumbnail URL for the given track
        const updateResult = await tracksCollection.updateOne(
            { videoId: videoId }, // No ObjectId conversion if videoId is a string
            { $set: { selectedImageThumbnail: thumbnailUrl } }
        );

        if (updateResult.matchedCount === 0) {
            return res.status(404).send("Track not found");
        }

        res.status(200).send("Thumbnail updated successfully");
    } catch (error) {
        console.error("Error updating track thumbnail:", error);
        res.status(500).send("Internal Server Error");
    } finally {
        client.close();
    }
};

const getVideoMetadataFromVideoId = async (req, res) => {
    const { id } = req.params;
    const client = await new MongoClient(MONGO_URI, options);    
    
    try {
        await client.connect();
        const db = client.db("db-name");
        const videosCollection = db.collection('ContentMetaData'); 
        
        // Query for the video by id
        const video = await videosCollection.findOne({ videoId: id } );
        
        if (!video) {
            // If no video is found, return a 404 response
            return res.status(404).json({ message: 'Video not found' });
        }
        
        // If a video is found, return the video metadata
        return res.status(200).json({
            videoId: video.videoId,
            owner: video.owner,
            title: video.title,
            selectedImageThumbnail: video.selectedImageThumbnail || null,
            fileUrl: video.fileUrl,
        });

        
    } catch (error) {
        console.error("Failed to retrieve video metadata:", error);
        res.status(500).json({ message: 'Internal server error' });
    } finally {
        await client.close();
    }
};

const getVideoMetadataFromObjectId = async (req, res) => {
    const { id } = req.params;
    const client = await new MongoClient(MONGO_URI, options);    
    
    try {
        await client.connect();
        const db = client.db("db-name");
        const collection = db.collection("ContentMetaData");
        // First, try to find the document using the ObjectId
        let result = await collection.findOne({ _id: new ObjectId(id) });

        // If not found, try searching by string representation of ObjectId
        if (!result) {
            result = await collection.findOne({ _id: id });
        }

        if (result) {
            res.status(200).json(result);
        } else {
            const allDocs = await collection.find({}).toArray();
            res.status(404).json({ message: "Video not found" });
        }
    } catch (error) {
        res.status(500).json({ message: "Error retrieving video metadata", error: error.message });
    } finally {
        await client.close();
    }
};

const getAlbumById = async (req, res) => {
    const client = await new MongoClient(MONGO_URI, options);
    try {
        await client.connect();
        const db = client.db("db-name");
        const albumsCollection = db.collection('AlbumMetaData');
        const albumId = req.query.albumId; // Retrieve the albumId from query parameters
        const albumDocument = await albumsCollection.findOne({ albumId: albumId });

        if (!albumDocument) {
            return res.status(404).json({ message: 'Album not found' });
        }

        return res.status(200).json(albumDocument);
    } catch (error) {
        console.error(`An error occurred while fetching album by id ${albumId}:`, error);
        return res.status(500).json({ message: 'Server error' });
    } finally {
        await client.close();
    }
};

const deleteAlbum = async (req, res) => {
    const albumId = req.params.albumId;
    const artistId = req.query.artistId; 

    const client = new MongoClient(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    const { recombeeClient } = require("./utils/recombeeClient");

    try {
        await client.connect();
        const db = client.db("db-name");
        const collection = db.collection('AlbumMetaData');

        // First, verify that the album belongs to the artist
        const albumDocument = await collection.findOne({ albumId: albumId });
        if (!albumDocument) {
            return res.status(404).json({ message: "Album not found." });
        }

        if (albumDocument.owner !== artistId) {
            return res.status(403).json({ message: "You do not have permission to delete this album." });
        }
        try {
            const itemProperties = { deleted: true };
            const recombeeItemId = albumDocument._id.toString();
            console.log('recombeeItemId :', recombeeItemId);
            const setItemValuesRequest = new SetItemValues(recombeeItemId, itemProperties);
            console.log('setItemValuesRequest', setItemValuesRequest);
            await recombeeClient.send(setItemValuesRequest);
        } catch (recombeeError) {
            console.error('Recombee error, proceeding with MongoDB deletion:', recombeeError);
        }

        // If the artistId matches the album's owner, proceed with the deletion
        await collection.deleteOne({ albumId: albumId });
        res.status(200).json({ message: "Album successfully deleted." });
    } catch (error) {
        console.error(`Failed to delete album: ${error}`);
        res.status(500).json({ message: "Internal server error." });
    } finally {
        await client.close();
    }
};



//Key encoding & decoding
const encodeCreds = async (req, res) => {
    try {
    if (!req.body) {
        return res.status(400).json({
        err: true,
        error: "Invalid request body!!",
        });
    }

    const jsonString = JSON.stringify(req.body);
    const encoded = Buffer.from(jsonString).toString("base64");

    return res.status(200).json({
        msg: "success",
        data: {
        encoded,
        },
    });
    } catch (err) {
    console.log(
        "Err in File-ThumbnailController > Method-EncodeCreds > : ",
        err
    );
    return res.status(400).json({
        msg: "err",
        err: err,
    });
    }
};

const decodeCreds = async (req, res) => {
    try {
        const encodedData = process.env.ENCODED_KEY;


        if (!encodedData) {
        return res.status(400).json({
            err: true,
            error: "Encoded data not found in environment variable!!",
        });
        }

        const decodedJsonString = Buffer.from(encodedData, "base64").toString(
        "utf-8"
        );
        const decodedObject = JSON.parse(decodedJsonString);

        return res.status(200).json({
        msg: "success",
        data: {
            decodedObject,
        },
        });
    } catch (err) {
        console.log(
        "Err in File-ThumbnailController > Method-DecodeCreds > : ",
        err
        );
        return res.status(400).json({
        msg: "err",
        err: err,
        });
    }
}

const syncCatalog = async (req, res) => {
    try {
        // sync our database with the recombee platform
        const syncRecombeeResponse = await SyncRecombee();


        if (syncRecombeeResponse.success) {
        return res.status(200).json({
            data: syncRecombeeResponse
        });
        } else {
        return res.status(400).json({
            msg: "Data syncing failed.",
            error: syncRecombeeResponse.error || "Unknown error",
        });
        }
    } catch (err) {
        console.log("Error in File-RecombeeController > Method-SyncCatalog:", err);
        return res.status(500).json({
        msg: "Internal server error",
        error: err.message || "An error occurred.",
        });
    }
};

const getItemToUserRecommendations_Scenario_Meditation = async (req, res) => {
    const userId = sanitizeUserId(req.params.userId);
    const { recombeeClient } = require("./utils/recombeeClient");
    
    try {
        const count = 10;

        const getRecommendationsRequest = new RecommendItemsToUser(userId, count, {
            'scenario': 'Scenario_Meditation',
            'cascadeCreate': true,
        });

        const response = await recombeeClient.send(getRecommendationsRequest);
        console.log(response);

        return res.json(response);

    } catch (err) {
        console.log("Error in File-RecombeeController > Method-getRecommendations:", err);
        return res.status(500).json({
            msg: "Internal server error",
            error: err.message || "An error occurred.",
        });
    }
};

const getItemToUserRecommendations_Scenario_MusicVideo = async (req, res) => {
    const userId = sanitizeUserId(req.params.userId);
    const { recombeeClient } = require("./utils/recombeeClient");
    
    try {
        const count = 10;


        const getRecommendationsRequest = new RecommendItemsToUser(userId, count, {
            'scenario': 'Scenario_MusicVideo',
            'cascadeCreate': true,
        });

        const response = await recombeeClient.send(getRecommendationsRequest);

        return res.json(response);

    } catch (err) {
        console.log("Error in File-RecombeeController > Method-getRecommendations:", err);
        return res.status(500).json({
            msg: "Internal server error",
            error: err.message || "An error occurred.",
        });
    }
};

const getItemToUserRecommendations_Scenario_StudioRecording = async (req, res) => {
    const userId = sanitizeUserId(req.params.userId);
    const { recombeeClient } = require("./utils/recombeeClient");
    
    try {
        const count = 10;

        const getRecommendationsRequest = new RecommendItemsToUser(userId, count, {
            'scenario': 'Scenario_StudioRecording',
            'cascadeCreate': true,
        });

        const response = await recombeeClient.send(getRecommendationsRequest);
        console.log(response);

        return res.json(response);

    } catch (err) {
        console.log("Error in File-RecombeeController > Method-getRecommendations:", err);
        return res.status(500).json({
            msg: "Internal server error",
            error: err.message || "An error occurred.",
        });
    }
};

const getItemToUserRecommendations_Scenario_DJSet = async (req, res) => {
    const userId = sanitizeUserId(req.params.userId);
    const { recombeeClient } = require("./utils/recombeeClient");
    
    try {
        const count = 10;


        const getRecommendationsRequest = new RecommendItemsToUser(userId, count, {
            'scenario': 'Scenario_DJSet',
            'cascadeCreate': true,
        });

        const response = await recombeeClient.send(getRecommendationsRequest);
        console.log(response);

        return res.json(response);

    } catch (err) {
        console.log("Error in File-RecombeeController > Method-getRecommendations:", err);
        return res.status(500).json({
            msg: "Internal server error",
            error: err.message || "An error occurred.",
        });
    }
};

const getItemToUserRecommendations_Scenario_BehindTheScenes = async (req, res) => {
    const userId = sanitizeUserId(req.params.userId);
    const { recombeeClient } = require("./utils/recombeeClient");
    
    try {
        const count = 10;


        const getRecommendationsRequest = new RecommendItemsToUser(userId, count, {
            'scenario': 'Scenario_BehindTheScenes',
            'cascadeCreate': true,
        });

        const response = await recombeeClient.send(getRecommendationsRequest);
        console.log(response);

        return res.json(response);

    } catch (err) {
        console.log("Error in File-RecombeeController > Method-getRecommendations:", err);
        return res.status(500).json({
            msg: "Internal server error",
            error: err.message || "An error occurred.",
        });
    }
};

const getItemToUserRecommendations_Scenario_Concert = async (req, res) => {
    const userId = sanitizeUserId(req.params.userId);
    const { recombeeClient } = require("./utils/recombeeClient");
    
    try {
        const count = 10;


        const getRecommendationsRequest = new RecommendItemsToUser(userId, count, {
            'scenario': 'Scenario_Concert',
            'cascadeCreate': true,
        });

        const response = await recombeeClient.send(getRecommendationsRequest);
        console.log(response);

        return res.json(response);

    } catch (err) {
        console.log("Error in File-RecombeeController > Method-getRecommendations:", err);
        return res.status(500).json({
            msg: "Internal server error",
            error: err.message || "An error occurred.",
        });
    }
};

const getItemToUserRecommendations_Scenario_VideoLesson = async (req, res) => {
    const userId = sanitizeUserId(req.params.userId);
    const { recombeeClient } = require("./utils/recombeeClient");
    
    try {
        const count = 10;

        const getRecommendationsRequest = new RecommendItemsToUser(userId, count, {
            'scenario': 'Scenario_VideoLesson',
            'cascadeCreate': true,
        });

        const response = await recombeeClient.send(getRecommendationsRequest);

        return res.json(response);

    } catch (err) {
        console.log("Error in File-RecombeeController > Method-getRecommendations:", err);
        return res.status(500).json({
            msg: "Internal server error",
            error: err.message || "An error occurred.",
        });
    }
};


const getSingleRecommendationForMusicPlayer = async (req, res) => {
    const userId = sanitizeUserId(req.params.userId);
    const { recombeeClient } = require("./utils/recombeeClient");
    
    try {
        const count = 1; // We only need one recommendation with this request

        const getRecommendationsRequest = new RecommendItemsToUser(userId, count, {
            'scenario': 'Scenario_MusicVideo', //temporary
            'cascadeCreate': true,
        });

        const response = await recombeeClient.send(getRecommendationsRequest);

        return res.json(response);

    } catch (err) {
        console.log("Error in getSingleRecommendation:", err);
        return res.status(500).json({
            msg: "Internal server error",
            error: err.message || "An error occurred.",
        });
    }
};

const trackInteraction = async (req, res) => {
    const { userId, itemId, type, recommId } = req.body;
    const { recombeeClient } = require("./utils/recombeeClient");

    try {
        if (type === 'detailView') {
            await recombeeClient.send(new AddDetailView(userId, itemId, {
                cascadeCreate: true,
                timestamp: new Date().toISOString(),
                recommId: recommId || undefined
            }));
        } else if (type === 'purchase') {
            await recombeeClient.send(new AddPurchase(userId, itemId, {
                cascadeCreate: true,
                timestamp: new Date().toISOString(),
                recommId: recommId || undefined
            }));
        }
        
        res.status(200).json({ message: 'Interaction tracked successfully' });
    } catch (error) {
        console.error('Error tracking interaction:', error);
        res.status(500).json({ error: 'Failed to track interaction' });
    }
};

//Archived for later use:
const addUserPropertyOnRecombee = async (req, res) => {
    // Define the properties to be added (initialize)
            const propertiesToAdd = [
                { name: "bio", type: "string" },
                { name: "artistLink", type: "string" },
            ];

            // Create an array of AddUserProperty requests
            const addUserPropertyRequests = propertiesToAdd.map(
                (property) => new AddUserProperty(property.name, property.type)
            );

            // Send requests to add user properties
            await Promise.all(
                addUserPropertyRequests.map((request) =>
                recombeeClient.send(request)
                )
            );
}

//manual addUser on Recombee
const addUserOnRecombee = async (req, res) => {
    const userId = sanitizeUserId(req.params.userId);
    try{
        const { recombeeClient } = require("./utils/recombeeClient");
        await recombeeClient.send(new AddUser(userId));
        res.status(200).json({ status: 200, message: "User added successfuly on Recombee." });
    }catch (e){
        console.error("Error in addUserOnRecombee operations:", e.message);
        console.error("Error details:", e);
        res.status(500).json({ status: 500, message: "Internal server error" });
    }
}

//manual setUser on Recombee
const setUserOnRecombee = async (req, res) => {
    const userId = sanitizeUserId(req.params.userId);
    try{
        const { recombeeClient } = require("./utils/recombeeClient");
            const userProperties = {
                accountName: 'accountName',
                artistLink: 'artistLink',
                bio: 'bio',
                isArtist: true,
                timestamp: new Date().toISOString(),
            };

        // Create a SetUserValues request with both the user ID and properties
        const setUserValuesRequest = new SetUserValues(userId, userProperties);

        // Send the request to set user values
        await recombeeClient.send(setUserValuesRequest);
        res.status(200).json({ status: 200, message: "User was set successfuly on Recombee." });
    }catch (e){
        console.error("Error in setUserOnRecombee operations:", e.message);
        console.error("Error details:", e);
        res.status(500).json({ status: 500, message: "Internal server error" });
    }
}

const getItemPropertiesFromRecombee = async (req, res) => {
    const itemId = req.params.itemId;

    const { recombeeClient } = require("./utils/recombeeClient");
    const rqs = require('recombee-api-client/lib/requests');
    try {
        const response = await recombeeClient.send(new GetItemValues(itemId));
        res.status(200).json({ 
            message: 'Item properties fetched successfully', 
            data: response 
        });
    } catch (error) {
        console.error('Error fetching item properties:', error);
        res.status(500).json({ 
            message: 'Failed to fetch item properties', 
            error: error.message 
        });
    }
}

const getItemToItemRecommendations = async (req, res) => {
    const { itemId } = req.params;
    const userId = sanitizeUserId(req.params.userId);
    const { recombeeClient } = require("./utils/recombeeClient");
    const count = 3;

    try {
        const recommendItemsToItemRequest = new RecommendItemsToItem(itemId, userId, count, {
                // optional parameters:
                'scenario': 'scenario_2',
                'cascadeCreate': true,
            }
        );

        const response = await recombeeClient.send(recommendItemsToItemRequest).catch(error => {
            console.error("Error sending request to Recombee:", error);
            throw error;
        });
        return res.json(response);
    } catch (err) {
        console.error("Error in getItemToItemRecommendations:", err);
        return res.status(500).json({
            msg: "Internal server error",
            error: err.message || "An error occurred.",
        });
    }
};

const postNewContentTypePropertyWithAttributes = async (req, res) => {
    const client = new MongoClient(MONGO_URI, options);
    try {
        await client.connect();
        const db = client.db('db-name');
        const collections = ['ContentMetaData', 'AlbumMetaData', 'userAccounts'];
        for (const collectionName of collections) {
            const collection = db.collection(collectionName);
            const updateResult = await collection.updateMany(
                {}, 
                { $set: { contentType: collectionName } }
            );
            console.log(`${collectionName} updated count:`, updateResult.modifiedCount);
        }

        res.status(200).json({ status: 200, message: "Content types updated successfully across collections." });
    } catch (e) {
        console.error("Error updating content types:", e.message);
        res.status(400).json({ status: 400, message: e.message });
    } finally {
        await client.close();
    }
};

const postNewCardForPayment = async (req, res) => {
    const client = new MongoClient(MONGO_URI, options);
    try {
        await client.connect();
        const {card, expire, cvv, userId, nameOnCard, cardCompany} = req.body
        const db = client.db('db-name')
        const userCollection = db.collection('userAccounts')
        const paymentMethodCollection = db.collection('paymentMethods')
        const user = await userCollection.findOne({_id: new ObjectId(userId)})
        if(!user){
            throw new Error('user not found')
        }
        const savedCard = await paymentMethodCollection.insertOne({card, expire, cvv, nameOnCard, cardCompany, userId})

        res.status(200).json({ status: 200, message: "Card saved successfully", savedCard });
    } catch (e) {
        res.status(500).json({ status: 500, message: e.message });
    } finally {
        await client.close();
    }
};

const getCard = async (req, res) => {
    const client = new MongoClient(MONGO_URI, options);
    try {
        await client.connect();
        const {_id, userId} = req.body
        const db = client.db('db-name')
        const paymentMethodCollection = db.collection('paymentMethods')
        const card = await paymentMethodCollection.findOne({_id: new ObjectId(_id), userId: userId})
        if(!card){
            throw new Error('card not found')
        }
        card.card = decryptData(card.card)
        card.nameOnCard = decryptData(card.nameOnCard)
        card.expire = decryptData(card.expire)
        card.cardCompany = decryptData(card.cardCompany)
        delete card.cvv
        res.status(200).json({ status: 200, message: "Card fetched successfully", card });
    } catch (e) {
        res.status(500).json({ status: 500, message: e.message });
    } finally {
        await client.close();
    }
};

const getAllCards = async (req, res) => {
    const client = new MongoClient(MONGO_URI, options);
    try {
        await client.connect();
        const {userId} = req.params
        const db = client.db('db-name')
        const paymentMethodCollection = db.collection('paymentMethods')
        let cards = await paymentMethodCollection.find({userId: userId}).project({card: 1, expire: 1, cardCompany: 1, userId: 1}).toArray()
        cards = cards.map((card) => {
            card.card = decryptData(card.card).slice(-4)
            card.expire = decryptData(card.expire)
            card.cardCompany = decryptData(card.cardCompany)
            return card
        })        
        res.status(200).json({ status: 200, message: "Cards fetched successfully", cards });
    } catch (e) {
        res.status(500).json({ status: 500, message: e.message });
    } finally {
        await client.close();
    }
};

const getPaymentToken = async (req, res) => {
    try {
      const token = await axios.post("https://app.tilopay.com/api/v1/loginSdk", {
        apiuser: process.env.TILOPAY_API_USER,
        password: process.env.TILOPAY_PASSWORD,
        key: process.env.TILOPAY_KEY,
      });
      res
        .status(200)
        .json({ status: 200, message: "token fetched successfully", token: token.data.access_token});
    } catch (e) {
      res.status(500).json({ status: 500, message: e.message });
    }
};

const saveOrder = async (req, res) => {
   const client = new MongoClient(MONGO_URI, options);
    try {
        await client.connect();
        const db = client.db('db-name');
        const orderCollection = db.collection('orderHistories');
        const {description, amount, status, userId}= req.body
        const savedOrder = await orderCollection.insertOne({description, amount, status, userId, time: new Date()})

        res.status(200).json({ status: 200, message: "order saved successfully", savedOrder });
    } catch (e) {
        console.error("Error updating content types:", e.message);
        res.status(400).json({ status: 400, message: e.message });
    } finally {
        await client.close();
    }
};

const getOrders = async (req, res) => {
    const client = new MongoClient(MONGO_URI, options);
     try {
         await client.connect();
         const db = client.db('db-name');
         const orderCollection = db.collection('orderHistories');
         const {userId}= req.params
         const orders = await orderCollection.find({userId}).toArray()
 
         res.status(200).json({ status: 200, message: "orders fetched successfully", orders });
     } catch (e) {
         res.status(500).json({ status: 500, message: e.message });
     } finally {
         await client.close();
     }
 };

 const savePlan = async (req, res) => {
    const client = new MongoClient(MONGO_URI, options);
     try {
         await client.connect();
         const db = client.db('db-name');
         const planCollection = db.collection('plans');
         const userCollection = db.collection('userAccounts')
         const {amount, type, userId}= req.body
         const user = await userCollection.findOne({_id: new ObjectId(userId)})
         if(!user){
             throw new Error('user not found')
         }
         let plan = await planCollection.findOne({userId})
         if(plan){
             const order = await planCollection.updateOne({userId}, {$set: {amount, type, userId}})
             res.status(200).json({ status: 200, message: "plan updated successfully", order });
         }else{
            const order = await planCollection.insertOne({amount, type, userId, time: new Date()})
             res.status(200).json({ status: 200, message: "plan saved successfully", order });
         } 
     } catch (e) {
         console.error("Error updating content types:", e.message);
         res.status(400).json({ status: 400, message: e.message });
     } finally {
         await client.close();
     }
 };


 const getPlanOfUser = async (req, res) => {
    const client = new MongoClient(MONGO_URI, options);
     try {
         await client.connect();
         const db = client.db('db-name');
         const planCollection = db.collection('plans');
        
         const {userId}= req.params
        
         let plan = await planCollection.findOne({userId})
         res.status(200).json({ status: 200, message: "plan fetch successfully", plan });
     } catch (e) {
         console.error("Error updating content types:", e.message);
         res.status(400).json({ status: 400, message: e.message });
     } finally {
         await client.close();
     }
 };

const getSearchResult = async (req, res) => {
    const { userId, searchQuery } = req.params;
    const { recombeeClient } = require("./utils/recombeeClient");
    console.log("user: ", userId);
    console.log("searchQuery: ", searchQuery);
    const count = 5; // Number of items to return

    try {
        // Perform separate searches for tracks, albums, and artists
        const [tracks, albums, artists] = await Promise.all([
            recombeeClient.send(new SearchItems(userId, searchQuery, count, {'scenario': 'tracks_search_scenario'})),
            recombeeClient.send(new SearchItems(userId, searchQuery, count, {'scenario': 'albums_search_scenario'})),
            recombeeClient.send(new SearchItems(userId, searchQuery, count, {'scenario': 'artists_search_scenario'})),
        ]);

        console.log({ tracks, albums, artists });

        // Compile the results into a structured object
        const searchResults = {
            tracks: tracks.recomms,
            albums: albums.recomms,
            artists: artists.recomms,
        };

        // Return the compiled search results
        res.status(200).json(searchResults);
    } catch (error) {
        console.error('Search request failed:', error);
        res.status(500).json({ message: 'Internal server error during search' });
    }
};

const postCreateLiveStream = async (req, res) => {
try {
    const liveStream = await mux.LiveStreams.create({
        playback_policy: ['public'],
        new_asset_settings: { playback_policy: ['public'] },
        });
        res.json(liveStream);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error creating live stream');
    }
};

const getAllContent = async (req, res) => {
    const client = await new MongoClient(MONGO_URI, options);

    try {
        const { type, artistId } = req.query;
        if (!type || !artistId) {
            return res.status(400).json({ message: 'Missing required parameters' });
        }

        await client.connect();
        const db = client.db("db-name");
        
        // First get the user's email using their _id
        const userCollection = db.collection('userAccounts');
        const user = await userCollection.findOne({ _id: new ObjectId(artistId) });
        
        if (!user) {
            return res.status(404).json({ message: 'Artist not found' });
        }

        const collection = db.collection('ContentMetaData');
        const query = {
            b_isApproved: true,
            isOnlyAudio: type === 'audio',
            owner: user.email // Use the email from the found user
        };

        const contentDocuments = await collection.aggregate([
            { $match: query },
            {
                $lookup: {
                    from: 'userAccounts',
                    localField: 'owner',
                    foreignField: 'email',
                    as: 'user'
                }
            },
            { $unwind: '$user' }
        ]).toArray();

        res.status(200).json(contentDocuments);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error' });
    } finally {
        client.close();
    }
};

const getAlbumsByArtist = async (req, res) => {
    const client = await new MongoClient(MONGO_URI, options);
    try {
        const { artistId } = req.query;
        if (!artistId) {
            return res.status(400).json({ message: 'Missing artistId parameter' });
        }

        await client.connect();
        const db = client.db("db-name");
        
        // First get the user's email using their _id
        const userCollection = db.collection('userAccounts');
        const user = await userCollection.findOne({ _id: new ObjectId(artistId) });
        
        if (!user) {
            return res.status(404).json({ message: 'Artist not found' });
        }

        const collection = db.collection('albums');
        const albums = await collection.find({ artistId: user.email }).toArray();
        
        res.status(200).json(albums);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error' });
    } finally {
        client.close();
    }
};

 const addTrackToAlbum = async (req, res) => {
    const client = new MongoClient(MONGO_URI, options);
     try {
         await client.connect();
         const db = client.db('db-name');
         let {owner, trackId, albumId} = req.body
         const albumCollection = db.collection('AlbumMetaData');
         const userCollection = db.collection('userAccounts');
         const contentCollection = db.collection('ContentMetaData');
         const user = await userCollection.findOne({ email: owner });
         const content = await contentCollection.findOne({ _id: new ObjectId(trackId) });
         const album = await albumCollection.findOne({ _id: new ObjectId(albumId) });
        
        if (!user || !content || !album) {
            return res.status(404).json({ exist: false, message: 'User or Track not found' });
        }

        if(album.owner !== owner){
            return res.status(404).json({ exist: false, message: 'User have not authority to change album' });
        }
        let tracks = []

        if (Array.isArray(album.tracks)) {
            tracks = [...album.tracks]; 
            if(tracks.includes(trackId)){
                return res.status(409).json({success : false, message:'This song is already in the playlist'})
            }else{
               tracks.push(trackId)  
            }
        } else {
            tracks.push(trackId);
        }
           
        await albumCollection.updateOne({_id: new ObjectId(albumId)},  { $set: { tracks } })
         res.status(200).json({ status: 200, message: "Track added successfully" });
     } catch (e) {
         res.status(500).json({ status: 500, message: e.message });
     } finally {
         await client.close();
     }
 };

 const getAlbum = async (req, res) => {
    const client = new MongoClient(MONGO_URI, options);
     try {
         await client.connect();
         const db = client.db('db-name');
         const {albumId}= req.params
       
         const albumCollection = db.collection('AlbumMetaData');
         const album = await albumCollection.aggregate([
            {$match: {_id: new ObjectId(albumId)}},
            {
                $lookup: {
                    from: 'ContentMetaData',
                    let: { trackIds: { $ifNull: ["$tracks", []] } },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $in: ["$_id", { $map: { input: "$$trackIds", as: "id", in: { $toObjectId: "$$id" } } }] }
                            }
                        }
                    ],
                    as: 'tracksArray'
                }
            }
    ,
        ]).toArray()
 
         res.status(200).json({ status: 200, message: "Album fetched successfully", album: album[0] });
     } catch (e) {
         res.status(500).json({ status: 500, message: e.message });
     } finally {
         await client.close();
     }
 };

 const getTrack = async (req, res) => {
    const client = new MongoClient(MONGO_URI, options);
     try {
         await client.connect();
         const db = client.db('db-name');
         const {trackId}= req.params
       
         const trackCollection = db.collection('ContentMetaData');
         const track = await trackCollection.aggregate([
            {$match: {_id: new ObjectId(trackId)}},
            {$lookup: {
                from: 'userAccounts',
                localField: 'owner',
                foreignField: 'email',
                as: 'user'
            }},
            {$unwind: '$user'}
        ]).toArray()
 
         res.status(200).json({ status: 200, message: "Track fetched successfully", track: track[0] });
     } catch (e) {
         res.status(500).json({ status: 500, message: e.message });
     } finally {
         await client.close();
     }
 };


const getContentDocumentsByCategory = async (req, res) => {
    const client = new MongoClient(MONGO_URI, options);
    const { category } = req.params;  
    
    try {
        await client.connect();
        const db = client.db("db-name");
        const collection = db.collection('ContentMetaData'); 
        
        // Query for the content by category
        const documents = await collection.find({ category: category }).toArray();
        
        if (!documents) {
            // If no content is found, return a 404 response
            return res.status(404).json({ message: 'Content not found' });
        }
        // Send the found documents in the response
        res.json(documents);
        
    } catch (error) {
        console.error("Failed to retrieve content metadata:", error);
        res.status(500).json({ message: 'Internal server error' });
    } finally {
        await client.close();
    }
}

const updateContentCategory = async (req, res) => {
    const client = new MongoClient(MONGO_URI, options);
    const { oldCategory, newCategory } = req.body;

    console.log(`Request received to update category from '${oldCategory}' to '${newCategory}'`);

    try {
        await client.connect();
        const db = client.db("db-name");
        const collection = db.collection('ContentMetaData');

        // Log pre-update document count
        const preUpdateCount = await collection.countDocuments({ category: oldCategory });
        console.log(`${preUpdateCount} documents found with category '${oldCategory}'`);

        // Update the category for documents that match the old category
        const updateResult = await collection.updateMany(
            { category: oldCategory },
            { $set: { category: newCategory } }
        );

        console.log(`Update operation details:`, updateResult);

        if (updateResult.matchedCount === 0) {
            console.log('No documents matched the criteria for update.');
            return res.status(404).json({ message: 'No content found to update' });
        }

        console.log(`${updateResult.modifiedCount} documents were updated from '${oldCategory}' to '${newCategory}'`);

        // Send the success response with details of the update operation
        res.json({
            message: 'Content category updated successfully',
            details: updateResult
        });

    } catch (error) {
        console.error("Failed to update content category:", error);
        res.status(500).json({ message: 'Internal server error' });
    } finally {
        await client.close();
    }
}

/**
 * @api {post} /api/createEvent Create a New Event
 * @apiDescription This endpoint allows for the creation of a new event associated with an artist. It records various details about the event, including title, description, and pricing information. The endpoint also automatically generates a creation timestamp to track when the event was added to the system.
 * 
 * @apiParam {String} title The title of the event.
 * @apiParam {String} createdBy The email or identifier of the user or artist creating the event. This field should uniquely identify the creator within the system.
 * @apiParam {String} description A detailed description of the event.
 * @apiParam {String} dateTime The scheduled date and time of the event. The format should comply with ISO 8601 standard (e.g., YYYY-MM-DDTHH:MM:SSZ).
 * @apiParam {String} [paymentLink] An optional link to an external site for event booking or ticket purchase. This parameter should only be included if `priceType` is set to 'ExternalLink'.
 * @apiParam {String} priceType The pricing strategy for the event, which determines how the event is monetized. Valid options are 'Free', 'PricedInThanks', and 'ExternalLink'.
 * @apiParam {Number} [priceInThanks] The price of the event in ThanksCoins, required if `priceType` is 'PricedInThanks'. This field specifies how many ThanksCoins attendees need to spend to access the event.
 */
const postCreateEvent = async (req, res) => {
    const { title, createdBy, description, dateTime, paymentLink, priceType, priceInThanks } = req.body;

    // Generate the current timestamp
    const createdAt = new Date();

    const event = {
        title,
        createdBy,
        description,
        dateTime,
        priceType,
        paymentLink: priceType === 'ExternalLink' ? paymentLink : '', // Conditionally include paymentLink
        priceInThanks: priceType === 'PricedInThanks' ? priceInThanks : null, // Conditionally include priceInThanks
        createdAt
    };

    const client = new MongoClient(MONGO_URI, options);
    try {
        await client.connect();
        const db = client.db('db-name');
        const result = await db.collection("ArtistEvents").insertOne(event);
        if (result.insertedId) {
            const insertedEvent = await db.collection("ArtistEvents").findOne({ _id: result.insertedId });
            res.status(200).json({ status: 200, event: insertedEvent });
        } else {
            // Handle the case where the document wasn't inserted properly
            res.status(400).json({ status: 400, message: "Event creation failed." });
        }
    } catch (e) {
        console.error("Error creating event:", e.message);
        res.status(500).json({ status: 500, message: e.message });
    } finally {
        await client.close();
    }
};

/**
 * @api {post} /api/editEvent/:id Edit an Existing Event
 * @apiDescription This endpoint allows for the modification of an existing event's details. It updates the event with new information provided in the request body. A server-side timestamp is generated to record the last edit time.
 * 
 * @apiParam {String} id The unique identifier of the event to be edited. This is passed as a URL parameter.
 * 
 * @apiBody {String} title The new title of the event. (required)
 * @apiBody {String} createdBy The email or identifier of the user or artist updating the event. This should match the original creator of the event. (required)
 * @apiBody {String} description A new detailed description of the event. (required)
 * @apiBody {String} dateTime The updated scheduled date and time of the event. The format should comply with ISO 8601 standard (e.g., YYYY-MM-DDTHH:MM:SSZ). (required)
 * @apiBody {String} [paymentLink] An optional new link to an external site for event booking or ticket purchase. This parameter should only be included if `priceType` is set to 'ExternalLink'. (optional)
 * @apiBody {String} priceType The updated pricing strategy for the event, which determines how the event is monetized. Valid options are 'Free', 'PricedInThanks', and 'ExternalLink'. (required)
 * @apiBody {Number} [priceInThanks] The updated price of the event in ThanksCoins, required if `priceType` is 'PricedInThanks'. This field specifies how many ThanksCoins attendees need to spend to access the event. (optional)
 */
const postEditEvent = async (req, res) => {
    const { id } = req.params; // Event ID is passed as URL parameter
    const { title, createdBy, description, dateTime, paymentLink, priceType, priceInThanks } = req.body;

    // Connect to the MongoDB client
    const client = new MongoClient(MONGO_URI, options);
    try {
        const objectId = new ObjectId(id);

        await client.connect();
        const db = client.db('db-name');
        const collection = db.collection("ArtistEvents");

        // Find the document before attempting update to verify it exists
        const doc = await collection.findOne({ _id: objectId });

        if (!doc) {
            return res.status(404).json({ status: 404, message: "Event not found." });
        }

        // Perform the update operation
        const result = await collection.findOneAndUpdate(
            { _id: objectId },
            {
                $set: {
                    title, 
                    createdBy, 
                    description, 
                    dateTime, 
                    priceType,
                    paymentLink: priceType === 'ExternalLink' ? paymentLink : '', // Conditionally include paymentLink
                    priceInThanks: priceType === 'PricedInThanks' ? priceInThanks : null, // Conditionally include priceInThanks
                    lastEdited: new Date(), // Server-side timestamp for last edit
                }
            },
            { returnOriginal: false }
        );

        // Check if the update operation was successful
        if (result.value) {
            res.status(200).json({ status: 200, event: result.value });
        } else {
            res.status(404).json({ status: 404, message: "Event not found after update attempt." });
        }
    } catch (e) {
        console.error("Error editing event:", e);
        if (e instanceof TypeError) {
            res.status(400).json({ status: 400, message: "Invalid event ID format." });
        } else {
            res.status(500).json({ status: 500, message: "Internal server error" });
        }
    } finally {
        await client.close();
    }
};

const postCreateOffer = async (req, res) => {
    const { title, description, file, image, paymentLink, priceInThanks, priceType } = req.body;
    const createdAt = new Date(); 

    const offer = {
        title,
        description,
        image,
        file,
        priceType,
        createdAt,
        paymentLink: priceType === 'ExternalLink' ? paymentLink : '', // Only set paymentLink for ExternalLink priceType
        priceInThanks: priceType === 'PricedInThanks' ? priceInThanks : null, // Only set priceInThanks for PricedInThanks priceType
    };

    const client = new MongoClient(MONGO_URI, options);
    try {
        await client.connect();
        const db = client.db('db-name');
        const result = await db.collection("ArtistOffers").insertOne(offer);
        
        if (result.insertedId) {
            // Fetch and send back the full inserted document including the createdAt timestamp
            const insertedOffer = await db.collection("ArtistOffers").findOne({ _id: result.insertedId });
            res.status(200).json({ status: 200, offer: insertedOffer });
        } else {
            res.status(500).json({ status: 500, message: "Failed to create the offer." });
        }
    } catch (e) {
        console.error("Error creating offer:", e.message);
        res.status(400).json({ status: 400, message: e.message });
    } finally {
        await client.close();
    }
};

const postEditOffer = async (req, res) => {
    const { id } = req.params;
    const { title, description, file, paymentLink, priceInThanks, priceType } = req.body;

    const update = {
        $set: {
            title,
            description,
            file,
            priceType,
            paymentLink: priceType === 'ExternalLink' ? paymentLink : '',
            priceInThanks: priceType === 'PricedInThanks' ? priceInThanks : null,
            lastEdited: new Date(), // Server-side timestamp for last edit
        }
    };

    const client = new MongoClient(MONGO_URI, options);
    try {
        await client.connect();
        const db = client.db('db-name');
        const collection = db.collection("ArtistOffers");

        const result = await collection.findOneAndUpdate(
            { _id: new ObjectId(id) },
            update,
            { returnOriginal: false }
        );

        if (result.value) {
            res.status(200).json({ status: 200, offer: result.value });
        } else {
            res.status(404).json({ status: 404, message: "Offer not found" });
        }
    } catch (e) {
        console.error("Error editing offer:", e.message);
        res.status(500).json({ status: 500, message: "Internal server error" });
    } finally {
        await client.close();
    }
};

/**
 * @api {get} /api/getUserLoves
 * @apiDescription Fetches the list of videos a user has "loved". The user is identified by their email address.
 * @apiParam {String} user Query parameter containing the user's email address.
 */
const getUserLoves = async (req, res) => {
    const user = req.query.user; // User's email is expected as a query parameter

    if (!user) {
        return res.status(400).json({ message: "User email is required." });
    }

    const client = await new MongoClient(MONGO_URI, options);
    try {
        await client.connect();
        const db = client.db("db-name");
        const collection = db.collection("userAccounts");

        const userData = await collection.findOne({ email: user }, { projection: { loves: 1 } });

        if (!userData) {
            return res.status(404).json({ message: "User not found." });
        }

        const loves = userData.loves || [];
        res.status(200).json({ loves });
    } catch (error) {
        console.error("Error fetching user loves:", error);
        res.status(500).json({ error: "Internal server error" });
    } finally {
        await client.close();
    }
};

/**
 * @api {patch} /api/updateUserLikes
 * @apiDescription This endpoint allows a user to like or unLike an artist. The operation is determined by the `b_isLiking` flag.
 * @apiParam {String} user User's email address used to identify the user account.
 * @apiParam {String} videoId The unique identifier of the video to like or unlike.
 * @apiParam {Boolean} b_isLiking Flag indicating whether the video is being liked (true) or unliked (false).
*/
const updateUserLoves = async (req, res) => {
    const { user, videoId, b_isLoving } = req.body;
    const client = await new MongoClient(MONGO_URI, options);

    try {
        await client.connect();
        const db = client.db("db-name");
        const collection = db.collection("userAccounts");

        if (b_isLoving) {
            // Add videoId to the loves array if b_isLoving is true, avoid duplicates using $addToSet
            await collection.updateOne(
                { email: user }, // Assuming userId is an ObjectId, adjust if your ID system differs
                { $addToSet: { loves: videoId } }
            );
        } else {
            // Remove videoId from the loves array if b_isLoving is false
            await collection.updateOne(
                { email: user },
                { $pull: { loves: videoId } }
            );
        }
        res.status(200).json({ message: "User loves updated successfully." });
    } catch (error) {
        console.error("Error updating user loves:", error);
        res.status(500).json({ error: "Internal server error" });
    } finally {
        await client.close();
    }
};

/**
 * Fetches the list of favorite artists for a user.
 * 
 * @api {get} /api/getUserFavorites Fetch User's Favorite Artists       
 * @apiDescription Fetches the list of artistIds marked as favorites by the user. 
 *                 The user is identified by their email address passed as a query parameter.
 * @apiParam {String} user Query parameter containing the user's email address.
 */
const getUserFavorites = async (req, res) => {
    const user = req.query.user; // User's email is expected as a query parameter

    if (!user) {
        return res.status(400).json({ message: "User email is required." });
    }

    const client = await new MongoClient(MONGO_URI, options);
    try {
        await client.connect();
        const db = client.db("db-name");
        const collection = db.collection("userAccounts");

        const userData = await collection.findOne({ email: user }, { projection: { favorites: 1 } });

        if (!userData) {
            return res.status(404).json({ message: "User not found." });
        }

        const favorites = userData.favorites || [];
        res.status(200).json({ favorites });
    } catch (error) {
        console.error("Error fetching user favorites:", error);
        res.status(500).json({ error: "Internal server error" });
    } finally {
        await client.close();
    }
};

/**
 * @api {patch} /api/updateUserFollows Toggle User's Follow Status on an Artist
 * @apiDescription This endpoint allows a user to follow or unfollow an artist. The operation is determined by the `b_isFollowing` flag.
 * @apiParam {String} user Email of the user performing the follow/unfollow operation.
 * @apiParam {String} artistId Unique identifier of the artist to be followed/unfollowed.
 * @apiParam {Boolean} b_isFollowing Flag indicating the desired follow status: `true` to follow, `false` to unfollow.
 */
const updateUserFavorites = async (req, res) => {
    const { user, artistId, b_isFavored } = req.body;
    const client = await new MongoClient(MONGO_URI, options);

    try {
        await client.connect();
        const db = client.db("db-name");
        const collection = db.collection("userAccounts");

        if (b_isFavored) {
            // Add artistId to the favorites array if b_isFavored is true, avoid duplicates using $addToSet
            await collection.updateOne(
                { email: user }, // Assuming userId is an ObjectId, adjust if your ID system differs
                { $addToSet: { favorites: artistId } }
            );
        } else {
            // Remove artistId from the favorites array if b_isFavored is false
            await collection.updateOne(
                { email: user },
                { $pull: { favorites: artistId } }
            );
        }
        res.status(200).json({ message: "User Favorites updated successfully." });
    } catch (error) {
        console.error("Error updating user Favorites:", error);
        res.status(500).json({ error: "Internal server error" });
    } finally {
        await client.close();
    }
};

const updateUserSubscription = async (req, res) => {
    const { userEmail, artistId, b_isSubscribing, thanksCoinsPerMonth } = req.body;
    const client = await new MongoClient(MONGO_URI, options);

    try {
        await client.connect();
        const db = client.db("db-name");
        const collection = db.collection("userAccounts");

        if (b_isSubscribing) {
            // Subscriptions are stored as an array of objects { artistId, thanksCoinsPerMonth }
            await collection.updateOne(
                { email: userEmail },
                { 
                    $addToSet: { 
                        subscriptions: { artistId, thanksCoinsPerMonth } 
                    } 
                }
            );
        } else {
            // When unsubscribing, remove the subscription object matching the artistId
            await collection.updateOne(
                { email: userEmail },
                { 
                    $pull: { 
                        subscriptions: { artistId } 
                    } 
                }
            );
        }
        res.status(200).json({ message: "User subscriptions updated successfully." });
    } catch (error) {
        console.error("Error updating user subscriptions:", error);
        res.status(500).json({ error: "Internal server error" });
    } finally {
        await client.close();
    }
};

/**
 * @api {post} /api/logContentUsage Log Content Usage
 * @apiDescription Logs a user's interaction with content, specifically when a video is played. This endpoint captures the event along with a server-generated timestamp to record when the content was accessed.
 * 
 * @apiParam {String} user The email of the user who interacted with the content. This is used to identify the user account within the system.
 * @apiParam {String} videoId The unique identifier of the video content that was accessed by the user. This ID corresponds to the specific piece of content within the content catalog.
 */
const logContentUsage = async (req, res) => {
    const { user, videoId } = req.body;

    // Generate timestamp server-side using current date and time
    const timestamp = new Date().toISOString();

    const contentUsageRecord = {
        user,
        videoId,
        timestamp, //Server-generated timestamp
    };

    const client = new MongoClient(MONGO_URI, options);

    try {
        await client.connect();
        const db = client.db("db-name");
        const collection = db.collection("contentUsage");

        // Insert the content usage record into the collection
        await collection.insertOne(contentUsageRecord);
        
        res.status(200).json({ message: "Content usage logged successfully.", data: contentUsageRecord });
    } catch (error) {
        console.error("Error logging content usage:", error);
        res.status(500).json({ error: "Internal server error" });
    } finally {
        await client.close();
    }
};

/**
 * Fetches the playback history for a specified user.
 *
 * @api {get} /api/getUserPlaybackHistory Fetch User Playback History
 * @apiDescription Retrieves an array containing the playback history of a user. The history includes records of videos or tracks the user has played back. This endpoint requires the user's email address to identify the user account and fetch the corresponding playback history.
 * @apiParam {String} user Query parameter for the user's email address used to identify the user account and fetch the playback history.
 */
const getUserPlaybackHistory = async (req, res) => {
    const userEmail = req.query.user; // Expecting user's email as a query parameter

    if (!userEmail) {
        return res.status(400).json({ message: "User email is required as a query parameter." });
    }

    const client = new MongoClient(MONGO_URI, options);

    try {
        await client.connect();
        const db = client.db("db-name"); // Use your actual database name
        const collection = db.collection("userAccounts"); // Adjust according to your collection name

        // Assuming 'playbackHistory' is an array in the user's document
        const userDoc = await collection.findOne({ email: userEmail }, { projection: { playbackHistory: 1 } });

        if (!userDoc) {
            return res.status(404).json({ message: "User not found." });
        }

        res.status(200).json({ playbackHistory: userDoc.playbackHistory || [] });
    } catch (error) {
        console.error("Error fetching user playback history:", error);
        res.status(500).json({ error: "Internal server error." });
    } finally {
        await client.close();
    }
};

/**
 * @api {patch} /api/updateUserPlaybackHistory Update User Playback History
 * @apiDescription Adds a new playback event to the user's playback history, including the videoId of the playback event and an automatically generated timestamp. Maintains a maximum of 300 items in the playback history.
 * @apiParam {String} user The user's email address used to identify the user account.
 * @apiParam {String} videoId The unique identifier of the video in the playback event.
 */
const updateUserPlaybackHistory = async (req, res) => {
    const { user, videoId } = req.body;
    const timestamp = new Date().toISOString(); // Generate the timestamp server-side

    if (!user || !videoId) {
        return res.status(400).json({ message: "Missing required fields: user, videoId." });
    }

    const client = await new MongoClient(MONGO_URI, options);

    try {
        await client.connect();
        const db = client.db("db-name");
        const collection = db.collection("userAccounts");

        // The playback event to be added
        const playbackEvent = { videoId, timestamp };

        // Update user document by adding the playbackEvent. If playbackHistory has more than 300 items,
        // remove the oldest one to maintain the size limit using $slice.
        const updateResult = await collection.updateOne(
            { email: user },
            {
                $push: {
                    playbackHistory: {
                        $each: [playbackEvent],
                        $slice: -300 // Keeps the last 300 items, removing the oldest if exceeding 300
                    }
                }
            }
        );

        if (updateResult.matchedCount === 0) {
            return res.status(404).json({ message: "User not found." });
        } else if (updateResult.modifiedCount === 0) {
            return res.status(500).json({ message: "Failed to update playback history." });
        } else {
            res.status(200).json({ message: "Playback history updated successfully." });
        }
    } catch (error) {
        console.error("Error updating user playback history:", error);
        res.status(500).json({ error: "Internal server error." });
    } finally {
        await client.close();
    }
};

/**
 * @api {patch} /api/sendThanksCoinsViaArtistPage Send ThanksCoins to an Artist
 * @apiDescription This endpoint allows a user to send ThanksCoins to an artist as a form of support. 
 * It ensures the sender has a sufficient balance before proceeding with the transfer and updates both the sender's and the artist's ThanksCoins balance accordingly. 
 * The transaction is recorded with a server-generated timestamp for auditing purposes.
 * 
 * @apiParam {String} userId The email of the user sending ThanksCoins. This is used to identify the sender's account.
 * @apiParam {Number} amountSend The amount of ThanksCoins to be sent to the artist.
 * @apiParam {String} artistId The email of the artist receiving ThanksCoins. This is used to identify the artist's account.
 */
const sendThanksCoinsViaArtistPage = async (req, res) => {
    const { userId, amountSend, artistId } = req.body;

    // Ensure amountSend is a positive integer
    if (!Number.isInteger(amountSend) || amountSend <= 0) {
        return res.status(400).json({ message: "Invalid amount. Please send a positive number of ThanksCoins." });
    }

    const client = new MongoClient(MONGO_URI, options);

    try {
        await client.connect();
        const db = client.db("db-name");
        const usersCollection = db.collection("userAccounts");

        // Verify sender's existence and balance
        const sender = await usersCollection.findOne({ email: userId });
        if (!sender) {
            return res.status(404).json({ message: "Sender not found." });
        }

        // Ensure the sender has a thanksCoins property and a sufficient balance
        const senderBalance = sender.thanksCoins || 0; // Treat missing property as 0
        if (senderBalance < amountSend) {
            return res.status(400).json({ message: "Insufficient thanksCoins." });
        }

        // Check if the artist exists before proceeding
        const artist = await usersCollection.findOne({ email: artistId });
        console.log("🚀 ~ sendThanksCoinsViaArtistPage ~ artist:", artist);
        if (!artist) {
            return res.status(404).json({ message: "Artist not found." });
        }

        // Proceed with deducting and crediting ThanksCoins
        await usersCollection.updateOne(
            { email: userId },
            { $inc: { thanksCoins: -amountSend } }
        );

        await usersCollection.updateOne(
            { email: artistId },
            { $inc: { thanksCoins: amountSend } }
        );

        // Record the transaction
        const sendEvent = {
            timestamp: new Date(),
            senderUserId: userId,
            recipientArtistId: artistId,
            amountSend,
            giftedFrom: "ArtistPage"
        };
        await db.collection("ThanksSent").insertOne(sendEvent);

        res.status(200).json({ message: "ThanksCoins sent successfully to the artist." });
    } catch (error) {
        console.error("Error sending ThanksCoins to artist:", error);
        res.status(500).json({ error: "Internal server error." });
    } finally {
        await client.close();
    }
};

/**
 * @api {patch} /api/sendThanksCoinsViaAlbumPage Send ThanksCoins to Artist via Album
 * @apiDescription This endpoint allows a user to send ThanksCoins to an artist by selecting an album. 
 * The function identifies the artist using the album's owner property, ensuring the ThanksCoins are credited to the correct artist.
 * 
 * @apiParam {String} userId Email of the user sending ThanksCoins, used to identify the sender's account.
 * @apiParam {Number} amountSend Amount of ThanksCoins to be sent.
 * @apiParam {String} albumId Unique identifier of the album being used to send ThanksCoins.
 */
const sendThanksCoinsViaAlbumPage = async (req, res) => {
    const { userId, amountSend, albumId } = req.body;

    // Ensure amountSend is a positive integer
    if (!Number.isInteger(amountSend) || amountSend <= 0) {
        return res.status(400).json({ message: "Invalid amount. Please send a positive number of ThanksCoins." });
    }

    const client = new MongoClient(MONGO_URI, options);

    try {
        await client.connect();
        const db = client.db("db-name");
        const usersCollection = db.collection("userAccounts");
        const albumCollection = db.collection("AlbumMetaData");
        const thanksSentCollection = db.collection("ThanksSent");

        // Verify sender's balance
        const sender = await usersCollection.findOne({ email: userId });
        if (!sender) {
            return res.status(404).json({ message: "Sender not found." });
        }

        if (sender.thanksCoins < amountSend) {
            return res.status(400).json({ message: "Insufficient thanksCoins." });
        }

        // Find the album to get the owner (artistId)
        const album = await albumCollection.findOne({ _id: new ObjectId(albumId) });
        if (!album) {
            return res.status(404).json({ message: "Album not found." });
        }

        // Check if the artist exists before proceeding
        const artist = await usersCollection.findOne({ email: album.owner });
        if (!artist) {
            return res.status(404).json({ message: "Artist not found." });
        }

        // Deduct ThanksCoins from the sender and credit to the artist
       await usersCollection.updateOne({ email: userId }, { $inc: { thanksCoins: -amountSend } });
       await usersCollection.updateOne({ email: album.owner }, { $inc: { thanksCoins: amountSend } });

        // Record the transaction
        const sendEvent = {
            timestamp: new Date(),      
            senderUserId: userId,
            recipientArtistId: album.owner,
            albumId: albumId,
            amountSend,
            giftedFrom: "AlbumPage"
        };
        await thanksSentCollection.insertOne(sendEvent);

        res.status(200).json({ message: "ThanksCoins sent successfully to the artist." });
    } catch (error) {
        console.error("Error sending ThanksCoins via album:", error);
        res.status(500).json({ error: "Internal server error." });
    } finally {
        await client.close();
    }
};

/**
 * @api {patch} /api/sendThanksCoinsViaTrackPage Send ThanksCoins to Artist via Track
 * @apiDescription This endpoint allows a user to send ThanksCoins to an artist by selecting a track. 
 * The function identifies the artist using the track's metadata, ensuring the ThanksCoins are credited to the correct artist.
 * 
 * @apiParam {String} userId Email of the user sending ThanksCoins, used to identify the sender's account.
 * @apiParam {Number} amountSend Amount of ThanksCoins to be sent.
 * @apiParam {String} trackId Unique identifier of the track being used to send ThanksCoins.
 */
const sendThanksCoinsViaContent = async (req, res) => {
    const { userId, amountSend, videoId } = req.body;

    // Ensure amountSend is a positive integer
    if (!Number.isInteger(amountSend) || amountSend <= 0) {
        return res.status(400).json({ message: "Invalid amount. Please send a positive number of ThanksCoins." });
    }

    const client = new MongoClient(MONGO_URI, options);

    try {
        await client.connect();
        const db = client.db("db-name");
        const usersCollection = db.collection("userAccounts");
        const contentCollection = db.collection("ContentMetaData");
        const thanksSentCollection = db.collection("ThanksSent");

        // Verify sender's balance
        const sender = await usersCollection.findOne({ email: userId });
        if (!sender) {
            return res.status(404).json({ message: "Sender not found." });
        }

        if (sender.thanksCoins < amountSend) {
            return res.status(400).json({ message: "Insufficient thanksCoins." });
        }

        // Find the track to get the associated artistId
        const track = await contentCollection.findOne({ videoId: videoId });
        if (!track) {
            return res.status(404).json({ message: "Track not found." });
        }

        // Assuming the track document contains an 'artistId' field
        const artistId = track.owner;

        // Check if the artist exists before proceeding
        const artist = await usersCollection.findOne({ email: artistId });
        if (!artist) {
            return res.status(404).json({ message: "Artist not found." });  
        }

        // Deduct ThanksCoins from the sender and credit to the artist
        await usersCollection.updateOne({ email: userId }, { $inc: { thanksCoins: -amountSend } });
        await usersCollection.updateOne({ email: artistId }, { $inc: { thanksCoins: amountSend } });

        // Record the transaction
        const sendEvent = {
            timestamp: new Date(),
            senderUserId: userId,
            recipientArtistId: artistId,
            videoId: videoId,
            amountSend,
            giftedFrom: "ContentPage"
        };
        await thanksSentCollection.insertOne(sendEvent);

        res.status(200).json({ message: "ThanksCoins sent successfully to the artist." });
    } catch (error) {
        console.error("Error sending ThanksCoins via track:", error);
        res.status(500).json({ error: "Internal server error." });
    } finally {
        await client.close();
    }
};

/**
 * @api {post} /api/postUserOnboardingProgress Update User Onboarding Progress
 * @apiDescription This endpoint updates the onboarding progress of a user.
 * 
 * @apiParam {String} userId The unique identifier (email) of the user.
 * @apiParam {Number} currentStep The current step of the onboarding process completed by the user. Should be an integer value between 1 and 3.
 * * @apiParam {Array} topicChoices The choices elected by users during step 2.
 * @apiParamExample {json} Request Example:
 *    {
 *      "userId": "example@example.com",
 *      "currentStep": 2
 *       "topicChoices": ["Dance", "Techno"]
 *    }
 */
const PostUserOnboardingProgress = async (req, res) => {
    const { userId, currentStep, topicChoices, isOnboardingStepsPending } = req.body;
  
    // Ensure currentStep is a positive integer and within range [1, 2, 3]
    if (!Number.isInteger(currentStep) || ![1, 2, 3].includes(currentStep)) {
      return res.status(400).json({
        message: "Invalid currentStep. A currentStep must be a number and either 1, 2 or 3.",
      });
    }
  
    const client = new MongoClient(MONGO_URI, options);
  
    try {
      await client.connect();
      const db = client.db("db-name");
      const userCollection = db.collection("userAccounts");
  
      // Find user by email
      const user = await userCollection.findOne({ email: userId });
      if (!user) {
        return res.status(404).json({ message: "User not found." });
      }
  
      // Update user's onboarding progress
      const updatePayload = {
          currentOnBoardingStep: currentStep,
          isOnboardingStepsPending,
      };

      if(topicChoices && topicChoices.length) updatePayload["userOnboardingTopicChoices"] = topicChoices

      await userCollection.updateOne({ email: userId },{$set: updatePayload} );
  
      // Return success message
      return res
        .status(200)
        .json({ message: "User onboarding progress updated successfully" });
    } catch (error) {
      console.error("Error updating user onboarding progress:", error);
      return res.status(500).json({ error: "Internal server error." });
    } finally {
      await client.close();
    }
  };
  
const getArtistNames = async (req, res) => {
  const { emails } = req.query;
  if (!emails) {
    return res.status(400).json({ error: "No emails provided" });
  }
  const emailArray = emails.split(',');
  const client = new MongoClient(MONGO_URI, options);

  try {
    await client.connect();
    const db = client.db("db-name");
    const userCollection = db.collection("userAccounts"); 

    const users = await userCollection.find({ email: { $in: emailArray } }).toArray();
    const artistNames = {};
    users.forEach(user => {
      artistNames[user.email] = user.accountName;
    });
    res.json(artistNames);
  } catch (error) {
    console.error("Error fetching artist names:", error);
    res.status(500).json({ error: "Internal server error." });
  } finally {
    await client.close();
  }
};

//this endpoint store email on mongodb into a waitlist collection
const storeEmailOnWaitlist = async (req, res) => {
  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  console.log("storeEmailOnWaitlist", req.body);
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }
  const client = new MongoClient(MONGO_URI, options);
  try {
    await client.connect();
    const db = client.db("db-name");
    const waitlistCollection = db.collection("waitlist");
    await waitlistCollection.insertOne({ email });
    res.status(200).json({ message: "Email stored successfully" });
  } catch (error) {
    console.error("Error storing email on waitlist:", error);
    res.status(500).json({ error: "Internal server error." });
  } finally {
    await client.close();
  }
};

    const signup = async (req, res) => {
  const client = new MongoClient(MONGO_URI, options);
  try {
    await client.connect();
    const db = client.db('db-name');
    const userCollection = db.collection('userAccounts');

    const { accountName, email, password, isArtist } = req.body;

    // Check if the user already exists
    const existingUser = await userCollection.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 8);

    // Create new user
    const newUser = { accountName, email, password: hashedPassword, isArtist, createdAt: new Date() };
    await userCollection.insertOne(newUser);

    // Generate JWT access token (6 hour)
    const accessToken = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '6h' });

    // Generate JWT refresh token (90 days)
    const refreshToken = jwt.sign({ email }, process.env.JWT_REFRESH_SECRET, { expiresIn: '90d' });

    // Store refresh token in an HTTP-only cookie
    res.cookie('sacredSound_refreshToken', refreshToken, {
      httpOnly: true,
       secure: process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging', // Secure only in production or staging environments
      sameSite: 'Strict',
      maxAge: 90 * 24 * 60 * 60 * 1000 // 90 days
    });

    // Return access token to the frontend
    res.status(201).json({ accessToken });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Error creating user' });
  } finally {
    await client.close();
  }
};


const login = async (req, res) => {
  const client = new MongoClient(MONGO_URI, options);
  try {
    await client.connect();
    console.log("Connected to DB");
    const db = client.db('db-name');
    const userCollection = db.collection('userAccounts');

    const { email, password } = req.body;
    console.log("Login request for:", email);

    // Check if user exists
    const user = await userCollection.findOne({ email });
    if (!user) {
      console.log("User not found");
      return res.status(400).json({ message: 'Invalid email or password' });
    }
    console.log("User found:", user.email);

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log("Password mismatch");
      return res.status(400).json({ message: 'Invalid email or password' });
    }
    console.log("Password matched");

    // Generate JWT access token (6 hour)
    const accessToken = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '6h' });
    console.log("Access token generated");

    // Generate JWT refresh token (90 days)
    const refreshToken = jwt.sign({ email }, process.env.JWT_REFRESH_SECRET, { expiresIn: '90d' });
    console.log("Refresh token generated");

    // Store refresh token in an HTTP-only cookie
    res.cookie('sacredSound_refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging', // Secure only in production or staging environments
      sameSite: 'Strict',
      maxAge: 90 * 24 * 60 * 60 * 1000 // 90 days
    });

    res.status(200).json({ accessToken });
    console.log("Response sent with access token");
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error during login' });
  } finally {
    await client.close();
    console.log("DB connection closed");
  }
};



const refreshAccessToken = async (req, res) => {
  const { sacredSound_refreshToken } = req.cookies;

  if (!sacredSound_refreshToken) {
    return res.status(401).json({ message: 'No refresh token, authorization denied' });
  }

  try {
    // Verify the refresh token
    const decoded = jwt.verify(sacredSound_refreshToken, process.env.JWT_REFRESH_SECRET);

    // Issue a new access token (6 hour)
    const accessToken = jwt.sign({ email: decoded.email }, process.env.JWT_SECRET, { expiresIn: '6h' });

    // Return the new access token
    res.status(200).json({ accessToken });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(403).json({ message: 'Invalid refresh token' });
  }
};

const logout = (req, res) => {
  // Clear the refresh token cookie
  res.clearCookie('sacredSound_refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging', // Secure only in production or staging
    sameSite: 'Strict'
  });

  // Send a success response
  res.status(200).json({ message: 'Logged out successfully' });
};

const requestPasswordReset = async (req, res) => {
  const client = new MongoClient(MONGO_URI, options);
  try {
    await client.connect();
    const db = client.db('db-name');
    const userCollection = db.collection('userAccounts');
    const resetTokenCollection = db.collection('passwordResetTokens');

    const { email } = req.body;

    // Check if user exists
    const user = await userCollection.findOne({ email });
    if (!user) {
      // For security, don't reveal if email exists or not
      return res.status(200).json({ message: 'If an account exists with this email, you will receive a password reset link' });
    }

    // Generate reset token (using bcrypt's salt generation)
    const resetToken = await bcrypt.genSalt(8);
    const resetTokenHash = await bcrypt.hash(resetToken, 8);

    // Store reset token with expiration (1 hour)
    await resetTokenCollection.insertOne({
      email,
      token: resetTokenHash,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 3600000) // 1 hour from now
    });

    // Create transporter (configure for your email service)
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    // Send reset email
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}&email=${email}`;
    console.log("Reset link:", resetLink);
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset Request',
      html: `
        <p>Hey this is Sacred Sound, we have heard you requested a password reset.</p>
        <p>Click <a href="${resetLink}">here</a> to reset your password.</p>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `
    });

    res.status(200).json({ message: 'If an account exists with this email, you will receive a password reset link' });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ message: 'Error processing password reset request' });
  } finally {
    await client.close();
  }
};

const resetPassword = async (req, res) => {
  const client = new MongoClient(MONGO_URI, options);
  try {
    await client.connect();
    const db = client.db('db-name');
    const userCollection = db.collection('userAccounts');
    const resetTokenCollection = db.collection('passwordResetTokens');

    const { token, email, newPassword } = req.body;

    // Find reset token
    const resetRequest = await resetTokenCollection.findOne({
      email,
      expiresAt: { $gt: new Date() }
    });

    if (!resetRequest) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    // Verify token
    const isValidToken = await bcrypt.compare(token, resetRequest.token);
    if (!isValidToken) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 8);

    // Update password
    await userCollection.updateOne(
      { email },
      { $set: { password: hashedPassword } }
    );

    // Delete used reset token
    await resetTokenCollection.deleteOne({ _id: resetRequest._id });

    res.status(200).json({ message: 'Password successfully reset' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ message: 'Error resetting password' });
  } finally {
    await client.close();
  }
};

const getUserProfileByEmails = async (req, res) => {
    const emails = req.query.emails.split(',');

    if (!emails || emails.length === 0) {
        return res.status(400).json({ message: 'No emails provided' });
    }

    const client = await new MongoClient(MONGO_URI, options);
    try {
        const db = client.db("db-name");
        const collection = db.collection('userAccounts');
        
        // Find all users whose email matches any of the provided emails
        const users = await collection.find({ email: { $in: emails } }, 
            { projection: { _id: 1, email: 1, accountName: 1, bio: 1, artistLink: 1, profileImageUrl: 1, artistTitle: 1 } }
        ).toArray();

        // Map users by email
        const usersByEmail = users.reduce((acc, user) => {
            acc[user.email] = {
                _id: user._id,
                accountName: user.accountName,
                bio: user.bio,
                artistLink: user.artistLink,
                profileImageUrl: user.profileImageUrl,
                artistTitle: user.artistTitle
            };
            return acc;
        }, {});

        return res.status(200).json(usersByEmail);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error' });
    } finally {
        await client.close();
    }
};

const updateTrackViews = async (req, res) => {
    const { videoId } = req.params;

    if (!videoId) {
        return res.status(400).json({ error: "Missing videoId parameter" });
    }

    const client = await MongoClient.connect(MONGO_URI, options);
    try {
        const db = client.db("db-name");
        const collection = db.collection("ContentMetaData");

        const result = await collection.findOneAndUpdate(
            { videoId: videoId },
            { 
                $inc: { views: 1 }  // Increment views by 1
            },
            { 
                returnDocument: 'after',
                upsert: false
            }
        );

        if (!result.value) {
            return res.status(404).json({ 
                status: 404,
                error: "No document found with that videoId" 
            });
        }

        return res.status(200).json({ 
            status: 200, 
            data: result.value 
        });

    } catch (error) {
        console.error("Error in updateTrackViews:", error);
        return res.status(500).json({ 
            status: 500,
            error: "Internal server error",
            details: error.message 
        });
    } finally {
        await client.close();
    }
};

module.exports = {
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
    getItemToUserRecommendations_Scenario_Meditation,
    getItemToUserRecommendations_Scenario_MusicVideo,
    getItemToUserRecommendations_Scenario_StudioRecording,
    getItemToUserRecommendations_Scenario_DJSet,
    getItemToUserRecommendations_Scenario_BehindTheScenes,
    getItemToUserRecommendations_Scenario_Concert,
    getItemToUserRecommendations_Scenario_VideoLesson,
    getSearchResult,
    addUserOnRecombee,
    getSingleRecommendationForMusicPlayer,
    trackInteraction,

    setUserOnRecombee,
    getItemPropertiesFromRecombee,
    getItemToItemRecommendations,
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
    getMostPlayedTracksByArtist,
    getAllContent,
    getUserProfileById,
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
};