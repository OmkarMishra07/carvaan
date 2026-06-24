import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Replicate from 'replicate';
import admin from 'firebase-admin';

// Load environment variables
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Firebase Admin
let bucket;
try {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY 
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    : undefined;
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;

  if (projectId && clientEmail && privateKey) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      storageBucket,
    });
    bucket = admin.storage().bucket();
    console.log('Firebase Admin initialized successfully using environment credentials.');
  } else {
    // Attempt local fallback / default credentials
    admin.initializeApp({
      storageBucket,
    });
    bucket = admin.storage().bucket();
    console.log('Firebase Admin initialized using application default credentials.');
  }
} catch (error) {
  console.error('Error initializing Firebase Admin. Caching will be disabled:', error.message);
}

// Initialize Replicate client
let replicate;
if (process.env.REPLICATE_API_TOKEN) {
  replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
  });
  console.log('Replicate client initialized.');
} else {
  console.warn('Warning: REPLICATE_API_TOKEN is missing from environment. Separation calls will fail.');
}

// Separate vocals and instrumentals
app.post('/api/separate', async (req, res) => {
  const { songId, songUrl } = req.body;

  if (!songId || !songUrl) {
    return res.status(400).json({ success: false, error: 'Missing songId or songUrl' });
  }

  // 1. Check Cache if Firebase is active
  if (bucket) {
    try {
      const file = bucket.file(`instrumentals/${songId}.mp3`);
      const [exists] = await file.exists();

      if (exists) {
        // Cache Hit! Generate signed URL (valid for 24 hours)
        const [signedUrl] = await file.getSignedUrl({
          action: 'read',
          expires: Date.now() + 24 * 60 * 60 * 1000,
        });

        console.log(`Cache HIT for song: ${songId}`);
        return res.json({
          success: true,
          instrumentalUrl: signedUrl,
          cached: true
        });
      }
    } catch (cacheErr) {
      console.warn('Cache lookup failed, proceeding with separation:', cacheErr.message);
    }
  }

  // 2. Cache Miss - Run separation
  if (!replicate) {
    return res.status(500).json({
      success: false,
      error: 'Vocal separation service is not configured (missing REPLICATE_API_TOKEN).'
    });
  }

  try {
    console.log(`Cache MISS for song ${songId}. Starting vocal separation on Replicate...`);
    
    // Using cjwbw/demucs (Hybrid Transformer Demucs v4)
    // Model ID: cjwbw/demucs
    const model = 'cjwbw/demucs:25a173108cff36ef9f80f854c162d01df9e6528be175794b81158fa03836d953';
    
    const output = await replicate.run(model, {
      input: {
        audio: songUrl,
        model_name: 'htdemucs',
        output_format: 'mp3',
        mp3_bitrate: 320
      }
    });

    // Output is expected to contain a URL to the instrumental track ('other')
    if (!output || !output.other) {
      console.error('Replicate output invalid:', output);
      throw new Error('Replicate separation did not return an instrumental track.');
    }

    const separatedUrl = output.other;
    console.log(`Separation finished. Downstream URL: ${separatedUrl}`);

    let finalUrl = separatedUrl;

    // 3. Upload to Firebase Storage for Caching (if bucket is configured)
    if (bucket) {
      console.log(`Uploading instrumental to Firebase Storage /instrumentals/${songId}.mp3 ...`);
      
      const response = await fetch(separatedUrl);
      if (!response.ok) {
        throw new Error(`Failed to download separated file from Replicate: ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      const file = bucket.file(`instrumentals/${songId}.mp3`);
      await file.save(buffer, {
        metadata: {
          contentType: 'audio/mpeg',
          metadata: {
            originalUrl: songUrl,
            separatedAt: new Date().toISOString()
          }
        }
      });

      console.log('Upload complete. Generating signed URL...');
      
      const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 24 * 60 * 60 * 1000,
      });

      finalUrl = signedUrl;
    } else {
      console.warn('Firebase Storage not initialized. Returning Replicate temp URL directly.');
    }

    return res.json({
      success: true,
      instrumentalUrl: finalUrl,
      cached: false
    });

  } catch (error) {
    console.error('Separation failed:', error);
    return res.status(500).json({
      success: false,
      error: `Vocal separation failed: ${error.message}`
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Vocal separation server running on port ${PORT}`);
});
