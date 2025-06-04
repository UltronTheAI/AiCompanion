import express from "express";
const app = express();
import { clerkMiddleware } from '@clerk/express'
import { MongoClient, ServerApiVersion, ObjectId } from 'mongodb';
import { v2 as cloudinary } from 'cloudinary';
import { GoogleGenAI } from "@google/genai";
import wav from 'wav';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';

// Get the directory name using ES module pattern
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Configure middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cors());
const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY });

// Import Type for schema definitions
const Type = {
  STRING: "string",
  ARRAY: "array",
  OBJECT: "object"
};

// Available voices mapping
const AVAILABLE_VOICES = {
  "Zephyr": "Bright", "Puck": "Upbeat", "Charon": "Informative",
  "Kore": "Firm", "Fenrir": "Excitable", "Leda": "Youthful",
  "Orus": "Firm", "Aoede": "Breezy", "Callirrhoe": "Easy-going",
  "Autonoe": "Bright", "Enceladus": "Breathy", "Iapetus": "Clear",
  "Umbriel": "Easy-going", "Algieba": "Smooth", "Despina": "Smooth",
  "Erinome": "Clear", "Algenib": "Gravelly", "Rasalgethi": "Informative",
  "Laomedeia": "Upbeat", "Achernar": "Soft", "Alnilam": "Firm",
  "Schedar": "Even", "Gacrux": "Mature", "Pulcherrima": "Forward",
  "Achird": "Friendly", "Zubenelgenubi": "Casual", "Vindemiatrix": "Gentle",
  "Sadachbia": "Lively", "Sadaltager": "Knowledgeable", "Sulafat": "Warm"
};

// Helper function to enhance emotional responses with internal thoughts
async function enhanceEmotionalResponse(text, character, userMessage) {
  // Check if emotional expression is disabled for this character
  if (character.emotionalExpression && character.emotionalExpression.enabled === false) {
    return text; // Don't add thoughts if disabled
  }
  
  // Check if the response already has thoughts in asterisks
  if (text.includes('*') && text.split('*').length >= 3) {
    return text; // Already has thoughts, return as is
  }
  
  // Get intensity level (defaults to moderate)
  const intensity = character.emotionalExpression?.intensity || "moderate";
  
  // Get character emotions
  const emotions = character.personality?.emotions || {
    happiness: 50,
    anger: 0,
    sadness: 0,
    excitement: 50,
    curiosity: 50
  };
  
  // Determine dominant emotions (emotions with values >= 70)
  const dominantEmotions = Object.entries(emotions)
    .filter(([_, value]) => value >= 70)
    .map(([emotion, value]) => ({ emotion, value }))
    .sort((a, b) => b.value - a.value);
  
  // Adjust keyword sensitivity based on intensity and dominant emotions
  const baseEmotionalKeywords = [
    'love', 'like you', 'feelings', 'romantic', 'attracted', 'kiss', 'hug', 'touch',
    'emotion', 'feel', 'heart', 'blush', 'nervous', 'excited', 'intimate', 'close',
    'relationship', 'date', 'together', 'miss you', 'thinking of you', 'care for you'
  ];
  
  // Add more keywords for higher intensity levels
  let emotionalKeywords = [...baseEmotionalKeywords];
  
  // Add keywords based on dominant emotions
  dominantEmotions.forEach(({ emotion }) => {
    switch(emotion) {
      case 'happiness':
        emotionalKeywords = emotionalKeywords.concat(['happy', 'joy', 'delighted', 'pleased', 'content']);
        break;
      case 'anger':
        emotionalKeywords = emotionalKeywords.concat(['angry', 'upset', 'annoyed', 'irritated', 'frustrated']);
        break;
      case 'sadness':
        emotionalKeywords = emotionalKeywords.concat(['sad', 'unhappy', 'disappointed', 'depressed', 'melancholy']);
        break;
      case 'excitement':
        emotionalKeywords = emotionalKeywords.concat(['excited', 'thrilled', 'eager', 'enthusiastic', 'energetic']);
        break;
      case 'curiosity':
        emotionalKeywords = emotionalKeywords.concat(['curious', 'interested', 'intrigued', 'fascinated', 'wondering']);
        break;
    }
  });
  
  if (intensity === "expressive") {
    emotionalKeywords = emotionalKeywords.concat([
      'happy', 'sad', 'angry', 'surprised', 'scared', 'confused',
      'worried', 'proud', 'grateful', 'curious', 'interested', 'hope'
    ]);
  } else if (intensity === "subtle") {
    // For subtle, only use the strongest emotional keywords
    emotionalKeywords = baseEmotionalKeywords.filter(k => 
      ['love', 'romantic', 'kiss', 'intimate', 'feelings', 'heart'].includes(k)
    );
  }
  
  // Check if this is an emotional moment based on keywords or high emotion values
  const isEmotionalMoment = emotionalKeywords.some(keyword => 
    userMessage.toLowerCase().includes(keyword) || text.toLowerCase().includes(keyword)
  ) || dominantEmotions.length > 0;
  
  if (!isEmotionalMoment) {
    return text; // Not an emotional moment, return as is
  }
  
  try {
    // Create an emotion description for the prompt
    const emotionDescription = dominantEmotions.length > 0 
      ? `The character is currently feeling strong ${dominantEmotions.map(e => e.emotion).join(' and ')}.`
      : '';
    
    // Use Gemini to generate appropriate internal thoughts
    const prompt = `
      The AI character ${character.name} has responded to a user with this message:
      "${text}"
      
      The user's message was:
      "${userMessage}"
      
      This appears to be an emotional moment. Generate ONLY internal thoughts that ${character.name} might have
      but not say directly. These thoughts should reflect true feelings, hesitations, desires, or emotional reactions.
      
      ${emotionDescription}
      
      Character's emotional state:
      - Happiness: ${emotions.happiness}/100
      - Anger: ${emotions.anger}/100
      - Sadness: ${emotions.sadness}/100
      - Excitement: ${emotions.excitement}/100
      - Curiosity: ${emotions.curiosity}/100
      
      The emotional expression intensity is set to "${intensity}" (options: subtle, moderate, expressive).
      ${intensity === "subtle" ? "Keep thoughts very brief and restrained." : ""}
      ${intensity === "expressive" ? "Make thoughts more detailed and emotionally vivid." : ""}
      
      Keep it appropriate. Return ONLY the thoughts without any explanation or formatting.
    `;
    
    const response = await ai.models.generateContent({
      model: "learnlm-2.0-flash-experimental",
      contents: prompt
    });
    
    const thoughts = response.text.trim();
    
    // Insert thoughts at an appropriate point in the text (preferably at the end of a sentence)
    const sentences = text.split(/(?<=[.!?])\s+/);
    
    if (sentences.length > 1) {
      // Insert after the first or second sentence
      const insertPosition = Math.min(1, sentences.length - 1);
      sentences[insertPosition] = `${sentences[insertPosition]} *${thoughts}*`;
      return sentences.join(' ');
    } else {
      // Just append to the end if there's only one sentence
      return `${text} *${thoughts}*`;
    }
  } catch (error) {
    console.error('Error enhancing emotional response:', error);
    return text; // Return original text if enhancement fails
  }
}

// Sentences endpoint to break text into sentences with emotional tones
app.get('/v1/sentences', async (req, res) => {
  try {
    const { text } = req.query;
    
    // Validate input
    if (!text) {
      return res.status(400).json({ error: 'Text parameter is required' });
    }
    
    // Check text length
    if (text.length > 3000) {
      return res.status(400).json({ error: 'Text must be 3000 characters or less' });
    }
    
    if (text.length < 1) {
      return res.status(400).json({ error: 'Text must be at least 1 character' });
    }
    
    console.log('Processing text for sentence breakdown with emotions');
    
    // Create prompt for the model
    const prompt = `
      Break the following text into sentences and assign an appropriate emotional tone to each sentence.
      The tone should reflect the emotional content or intent of the sentence (e.g., happy, sad, neutral, excited, informative, etc.).
      Return only the JSON result.
      
      Text to process: "${text}"
    `;
    
    // Call Gemini API with structured response
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              tone: {
                type: Type.STRING,
                description: "The emotional tone of the sentence"
              },
              text: {
                type: Type.STRING,
                description: "The sentence text"
              },
            },
            propertyOrdering: ["tone", "text"],
          },
        },
      },
    });
    
    // Parse the response
    const responseData = JSON.parse(response.text);
    
    // Return the structured response
    res.json(responseData);
    
  } catch (error) {
    console.error('Sentence Analysis API Error:', error);
    res.status(500).json({ 
      error: 'Failed to process sentence analysis request', 
      details: error.message 
    });
  }
});

// Function to save wave file
async function saveWaveFile(
  filename,
  pcmData,
  channels = 1,
  rate = 24000,
  sampleWidth = 2,
) {
  return new Promise((resolve, reject) => {
    const writer = new wav.FileWriter(filename, {
      channels,
      sampleRate: rate,
      bitDepth: sampleWidth * 8,
    });

    writer.on('finish', resolve);
    writer.on('error', reject);

    writer.write(pcmData);
    writer.end();
  });
}

// TTS endpoint
app.get('/v1/tts', async (req, res) => {
  try {
    const { voice, text, tone } = req.query;
    
    // Validate parameters
    if (!voice || !text) {
      return res.status(400).json({ error: 'Voice and text parameters are required' });
    }
    
    // Check if voice is valid
    if (!Object.keys(AVAILABLE_VOICES).includes(voice)) {
      return res.status(400).json({ 
        error: 'Invalid voice parameter', 
        availableVoices: Object.keys(AVAILABLE_VOICES) 
      });
    }
    
    // Format prompt with tone if provided
    const promptText = tone 
      ? `Say ${tone}: '''${text}'''` 
      : `'''${text}'''`;
    
    console.log(`Generating TTS with voice: ${voice}, tone: ${tone || 'none'}`);
    
    // Call Gemini API
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: promptText }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    });
    
    // Extract audio data
    const data = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    
    if (!data) {
      return res.status(500).json({ error: 'Failed to generate audio' });
    }
    
    // Convert base64 to buffer - this is already in WAV format
    const audioBuffer = Buffer.from(data, 'base64');
    
    // Set response headers
    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Content-Disposition', `attachment; filename="tts_${voice}_${Date.now()}.wav"`);
    res.setHeader('Content-Length', audioBuffer.length);
    
    // Send audio data directly
    res.send(audioBuffer);
    
  } catch (error) {
    console.error('TTS API Error:', error);
    res.status(500).json({ error: 'Failed to process TTS request', details: error.message });
  }
});

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
// Using properly encoded connection string to handle special characters
const client = new MongoClient(process.env.MONGO_URI, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
});

// Database connection function
async function connectToDatabase() {
  if (!client.topology || !client.topology.isConnected()) {
    await client.connect();
    console.log("Connected to MongoDB");
  }
  return client.db("AiCompanion");
}

// Verify user endpoint
app.post('/v1/verify-user', async (req, res) => {
  try {
    const { clerkId } = req.body;
    
    // Validate input
    if (!clerkId) {
      return res.status(400).json({ error: 'Clerk ID is required' });
    }
    
    console.log(`Verifying user with Clerk ID: ${clerkId}`);
    
    // Connect to database
    const db = await connectToDatabase();
    const usersCollection = db.collection('users');
    
    // Check if user exists
    const existingUser = await usersCollection.findOne({ clerkId });
    
    if (existingUser) {
      console.log(`User found: ${existingUser._id}`);
      return res.status(200).json({ 
        exists: true,
        user: existingUser 
      });
    }
    
    // Create new user if not exists
    const newUser = {
      clerkId,
      createdAt: new Date(),
      updatedAt: new Date(),
      // Custom variables (links/text)
      customVariables: [],
      // Description (limited to 500 characters)
      description: "",
      // Interests (limited to 50 interests, each 50 characters max)
      interests: [],
      // Optional age
      age: null,
      // Additional required fields
      displayName: "",
      email: "",
      profileImageUrl: "",
      avatarUrl: "", // For profile image
      location: "",
      language: "en",
      timezone: "",
      isOnboarded: false,
      isActive: true,
      lastActive: new Date(),
      // User preferences
      preferences: {
        theme: 'system',
        notifications: true,
        privacy: {
          showAge: false,
          showLocation: false,
          showInterests: true
        },
        accessibility: {
          fontSize: "medium",
          contrastMode: "normal",
          reducedMotion: false
        }
      }
    };
    
    const result = await usersCollection.insertOne(newUser);
    console.log(`New user created with ID: ${result.insertedId}`);
    
    return res.status(201).json({
      exists: false,
      user: {
        _id: result.insertedId,
        ...newUser
      },
      message: 'User created successfully'
    });
    
  } catch (error) {
    console.error('Verify User API Error:', error);
    res.status(500).json({ 
      error: 'Failed to verify user', 
      details: error.message 
    });
  }
});

async function run() {
    try {
      // Connect the client to the server	(optional starting in v4.7)
      await client.connect();
      // Send a ping to confirm a successful connection
      await client.db("AiCompanion").command({ ping: 1 });
      console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
      // Ensures that the client will close when you finish/error
      await client.close();
    }
}
run().catch(console.dir);

app.use(clerkMiddleware())

// Update user profile endpoint
app.put('/v1/users/:clerkId', async (req, res) => {
  try {
    const { clerkId } = req.params;
    const updateData = req.body;
    
    // Validate input
    if (!clerkId) {
      return res.status(400).json({ error: 'Clerk ID is required' });
    }
    
    // Connect to database
    const db = await connectToDatabase();
    const usersCollection = db.collection('users');
    
    // Check if user exists
    const existingUser = await usersCollection.findOne({ clerkId });
    
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Validate description length
    if (updateData.description && updateData.description.length > 500) {
      return res.status(400).json({ 
        error: 'Description must be 500 characters or less',
        field: 'description'
      });
    }
    
    // Validate interests
    if (updateData.interests) {
      if (updateData.interests.length > 50) {
        return res.status(400).json({ 
          error: 'Maximum of 50 interests allowed',
          field: 'interests' 
        });
      }
      
      // Check each interest length
      const invalidInterests = updateData.interests.filter(interest => 
        typeof interest !== 'string' || interest.length > 50
      );
      
      if (invalidInterests.length > 0) {
        return res.status(400).json({
          error: 'Each interest must be a string of 50 characters or less',
          field: 'interests',
          invalidItems: invalidInterests
        });
      }
    }
    
    // Validate custom variables
    if (updateData.customVariables) {
      // Validate each custom variable has name and value
      const invalidVariables = updateData.customVariables.filter(variable => 
        !variable.name || !variable.value || 
        typeof variable.name !== 'string' || 
        (typeof variable.value !== 'string' && typeof variable.value !== 'number')
      );
      
      if (invalidVariables.length > 0) {
        return res.status(400).json({
          error: 'Each custom variable must have a name and value',
          field: 'customVariables',
          invalidItems: invalidVariables
        });
      }
    }
    
    // Prepare update data
    const updateFields = {
      ...updateData,
      updatedAt: new Date()
    };
    
    // Remove any fields that shouldn't be updated directly
    delete updateFields._id;
    delete updateFields.clerkId;
    delete updateFields.createdAt;
    
    // Update user
    const result = await usersCollection.updateOne(
      { clerkId },
      { $set: updateFields }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get updated user
    const updatedUser = await usersCollection.findOne({ clerkId });
    
    return res.status(200).json({
      success: true,
      user: updatedUser,
      message: 'User updated successfully'
    });
    
  } catch (error) {
    console.error('Update User API Error:', error);
    res.status(500).json({ 
      error: 'Failed to update user', 
      details: error.message 
    });
  }
});

// Create AI character endpoint
app.post('/v1/character', async (req, res) => {
  try {
    const { clerkId, name, interests, age, description, firstMessageType, firstMessageText, avatarUrl } = req.body;
    
    // Validate required fields
    if (!clerkId) {
      return res.status(400).json({ error: 'Clerk ID is required' });
    }
    
    if (!name) {
      return res.status(400).json({ error: 'Character name is required' });
    }
    
    // Validate field constraints
    if (name.length > 100) {
      return res.status(400).json({ 
        error: 'Character name must be 100 characters or less',
        field: 'name'
      });
    }
    
    if (description && description.length > 1000) {
      return res.status(400).json({ 
        error: 'Description must be 1000 characters or less',
        field: 'description'
      });
    }

    // Validate firstMessageType if provided
    if (firstMessageType && !['fixed', 'random', 'none'].includes(firstMessageType)) {
      return res.status(400).json({
        error: 'First message type must be one of: fixed, random, none',
        field: 'firstMessageType'
      });
    }
    
    // Validate firstMessageText if type is fixed
    if (firstMessageType === 'fixed' && (!firstMessageText || firstMessageText.trim() === '')) {
      return res.status(400).json({
        error: 'First message text is required when type is fixed',
        field: 'firstMessageText'
      });
    }
    
    if (firstMessageText && firstMessageText.length > 1000) {
      return res.status(400).json({
        error: 'First message text must be 1000 characters or less',
        field: 'firstMessageText'
      });
    }
    
    // Connect to database
    const db = await connectToDatabase();
    const usersCollection = db.collection('users');
    const charactersCollection = db.collection('characters');
    
    // Check if user exists
    const existingUser = await usersCollection.findOne({ clerkId });
    
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check character limit (max 5 characters per user)
    const characterCount = await charactersCollection.countDocuments({ clerkId });
    
    if (characterCount >= 5) {
      return res.status(403).json({ 
        error: 'Character limit reached. Maximum 5 characters allowed per user.',
        limit: 5,
        current: characterCount
      });
    }
    
    // Create new character
    const newCharacter = {
      userId: existingUser._id,
      clerkId,
      name,
      interests: interests || [],
      age: age || null,
      description: description || "",
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      avatarUrl: avatarUrl || "", // Use provided avatar URL or empty string
      conversationCount: 0,
      lastInteraction: null,
      personality: {
        traits: [],
        voice: "Zephyr", // Default voice
        speechStyle: "Conversational",
        emotions: {
          happiness: 50,
          anger: 0,
          sadness: 0,
          excitement: 50,
          curiosity: 50
        }
      },
      emotionalExpression: {
        enabled: true,
        intensity: "moderate", // Options: "subtle", "moderate", "expressive"
        showThoughts: true
      },
      firstMessage: {
        type: firstMessageType || 'none', // Options: "fixed", "random", "none"
        text: firstMessageType === 'fixed' ? firstMessageText : ""
      },
      customAttributes: []
    };
    
    const result = await charactersCollection.insertOne(newCharacter);
    console.log(`New character created with ID: ${result.insertedId}`);
    
    return res.status(201).json({
      success: true,
      character: {
        _id: result.insertedId,
        ...newCharacter
      },
      message: 'Character created successfully'
    });
    
  } catch (error) {
    console.error('Create Character API Error:', error);
    res.status(500).json({ 
      error: 'Failed to create character', 
      details: error.message 
    });
  }
});

// Upload character image endpoint
app.post('/v1/character/:characterId/image', async (req, res) => {
  try {
    const { characterId } = req.params;
    const { imageData, clerkId } = req.body;
    
    // Validate required fields
    if (!characterId) {
      return res.status(400).json({ error: 'Character ID is required' });
    }
    
    if (!clerkId) {
      return res.status(400).json({ error: 'Clerk ID is required' });
    }
    
    if (!imageData) {
      return res.status(400).json({ error: 'Image data is required' });
    }
    
    // Connect to database
    const db = await connectToDatabase();
    const charactersCollection = db.collection('characters');
    
    // Check if character exists and belongs to the user
    const existingCharacter = await charactersCollection.findOne({ 
      _id: new ObjectId(characterId),
      clerkId
    });
    
    if (!existingCharacter) {
      return res.status(404).json({ error: 'Character not found or unauthorized' });
    }
    
    // Upload image to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload(
        imageData, 
        { 
          folder: 'ai-companion/characters',
          public_id: `character_${characterId}`,
          overwrite: true,
          transformation: [
            { width: 500, height: 500, crop: 'fill', gravity: 'face' }
          ]
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
    });
    
    // Update character with new avatar URL
    const updateResult = await charactersCollection.updateOne(
      { _id: new ObjectId(characterId) },
      { 
        $set: { 
          avatarUrl: uploadResult.secure_url,
          updatedAt: new Date()
        } 
      }
    );
    
    if (updateResult.matchedCount === 0) {
      return res.status(404).json({ error: 'Character not found' });
    }
    
    // Get updated character
    const updatedCharacter = await charactersCollection.findOne({ 
      _id: new ObjectId(characterId) 
    });
    
    return res.status(200).json({
      success: true,
      character: updatedCharacter,
      message: 'Character image uploaded successfully'
    });
    
  } catch (error) {
    console.error('Character Image Upload API Error:', error);
    res.status(500).json({ 
      error: 'Failed to upload character image', 
      details: error.message 
    });
  }
});

// Get all characters for a user
app.get('/v1/characters/:clerkId', async (req, res) => {
  try {
    const { clerkId } = req.params;
    
    // Validate input
    if (!clerkId) {
      return res.status(400).json({ error: 'Clerk ID is required' });
    }
    
    // Connect to database
    const db = await connectToDatabase();
    const charactersCollection = db.collection('characters');
    
    // Get all characters for the user
    const characters = await charactersCollection
      .find({ clerkId })
      .sort({ updatedAt: -1 })
      .toArray();
    
    return res.status(200).json({
      success: true,
      characters,
      count: characters.length
    });
    
  } catch (error) {
    console.error('Get Characters API Error:', error);
    res.status(500).json({ 
      error: 'Failed to get characters', 
      details: error.message 
    });
  }
});

// Get a single character by ID
app.get('/v1/character/:characterId', async (req, res) => {
  try {
    const { characterId } = req.params;
    const { clerkId } = req.query;
    
    // Validate input
    if (!characterId) {
      return res.status(400).json({ error: 'Character ID is required' });
    }
    
    // Connect to database
    const db = await connectToDatabase();
    const charactersCollection = db.collection('characters');
    
    // Get the character
    const character = await charactersCollection.findOne({ 
      _id: new ObjectId(characterId)
    });
    
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }
    
    // If clerkId is provided, check that the user has access to this character
    if (clerkId && character.clerkId !== clerkId) {
      return res.status(403).json({ error: 'You do not have access to this character' });
    }
    
    return res.status(200).json({
      success: true,
      character
    });
    
  } catch (error) {
    console.error('Get Character API Error:', error);
    res.status(500).json({ 
      error: 'Failed to get character', 
      details: error.message 
    });
  }
});

// Create a new conversation with a character
app.post('/v1/conversations', async (req, res) => {
  try {
    const { clerkId, characterId, title } = req.body;
    
    // Validate required fields
    if (!clerkId) {
      return res.status(400).json({ error: 'Clerk ID is required' });
    }
    
    if (!characterId) {
      return res.status(400).json({ error: 'Character ID is required' });
    }
    
    // Connect to database
    const db = await connectToDatabase();
    const usersCollection = db.collection('users');
    const charactersCollection = db.collection('characters');
    const conversationsCollection = db.collection('conversations');
    
    // Check if user exists
    const existingUser = await usersCollection.findOne({ clerkId });
    
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if character exists
    const character = await charactersCollection.findOne({ 
      _id: new ObjectId(characterId)
    });
    
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }
    
    // Check conversation limit (max 10 conversations per character)
    const conversationCount = await conversationsCollection.countDocuments({
      characterId: new ObjectId(characterId),
      clerkId
    });
    
    if (conversationCount >= 10) {
      return res.status(403).json({ 
        error: 'Conversation limit reached. Maximum 10 conversations allowed per character.',
        limit: 10,
        current: conversationCount
      });
    }
    
    // Create new conversation
    const newConversation = {
      userId: existingUser._id,
      clerkId,
      characterId: new ObjectId(characterId),
      title: title || `Chat with ${character.name}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      messageCount: 0,
      messages: [],
      pinnedMessages: [] // Array of message IDs that are pinned
    };
    
    // Handle first message based on character settings
    const firstMessageType = character.firstMessage?.type || 'none';
    let firstMessage = null;
    
    if (firstMessageType === 'fixed' && character.firstMessage?.text) {
      // Use the fixed first message
      firstMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        role: 'assistant',
        content: character.firstMessage.text,
        timestamp: new Date()
      };
      
      // Add message to conversation
      newConversation.messages.push(firstMessage);
      newConversation.messageCount = 1;
    } else if (firstMessageType === 'random') {
      // Generate a random first message using AI
      try {
        // Get character emotions
        const emotions = character.personality?.emotions || {
          happiness: 50,
          anger: 0,
          sadness: 0,
          excitement: 50,
          curiosity: 50
        };
        
        // Determine dominant emotions (emotions with values >= 70)
        const dominantEmotions = Object.entries(emotions)
          .filter(([_, value]) => value >= 70)
          .map(([emotion, value]) => ({ emotion, value }))
          .sort((a, b) => b.value - a.value);
        
        // Create emotion description for the prompt
        let emotionDescription = '';
        if (dominantEmotions.length > 0) {
          emotionDescription = `You are currently feeling strong ${dominantEmotions.map(e => e.emotion).join(' and ')}. This should significantly influence your response tone and content.`;
        }
        
        // Generate AI greeting
        const prompt = `
          You are ${character.name}, an AI character with the following description:
          ${character.description || 'A helpful AI assistant'}
          
          ${character.interests && character.interests.length > 0 
            ? `Your interests include: ${character.interests.join(', ')}`
            : ''}
          
          ${character.age ? `You are ${character.age} years old.` : ''}
          
          Your emotional state:
          - Happiness: ${emotions.happiness}/100
          - Anger: ${emotions.anger}/100
          - Sadness: ${emotions.sadness}/100
          - Excitement: ${emotions.excitement}/100
          - Curiosity: ${emotions.curiosity}/100
          
          ${emotionDescription}
          
          Generate a brief, friendly opening message to start a conversation with a new user. 
          Your message should reflect your character's personality and interests.
          Keep it under 100 words and make it engaging to encourage the user to respond.
          Do not use generic greetings like "Hello, how can I help you?" - make it personal to your character.
          
          IMPORTANT: When expressing emotions, especially during emotional moments, include your internal thoughts in *asterisks* like this: *I'm feeling excited to meet someone new*. These thoughts should reflect your true feelings that you might not directly say out loud.
        `;
        
        // Call Gemini API
        const response = await ai.models.generateContent({
          model: "gemini-1.5-flash",
          contents: prompt
        });
        
        // Create first message
        firstMessage = {
          id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          role: 'assistant',
          content: response.text.trim(),
          timestamp: new Date()
        };
        
        // Add message to conversation
        newConversation.messages.push(firstMessage);
        newConversation.messageCount = 1;
      } catch (aiError) {
        console.error('Error generating first message:', aiError);
        // Continue without first message if generation fails
      }
    }
    
    const result = await conversationsCollection.insertOne(newConversation);
    
    // Update character's conversation count
    await charactersCollection.updateOne(
      { _id: new ObjectId(characterId) },
      { 
        $inc: { conversationCount: 1 },
        $set: { lastInteraction: new Date() }
      }
    );
    
    return res.status(201).json({
      success: true,
      conversation: {
        _id: result.insertedId,
        ...newConversation
      },
      firstMessage
    });
    
  } catch (error) {
    console.error('Create Conversation API Error:', error);
    res.status(500).json({ 
      error: 'Failed to create conversation', 
      details: error.message 
    });
  }
});

// Get all conversations for a user
app.get('/v1/conversations/:clerkId', async (req, res) => {
  try {
    const { clerkId } = req.params;
    const { characterId } = req.query;
    
    // Validate input
    if (!clerkId) {
      return res.status(400).json({ error: 'Clerk ID is required' });
    }
    
    // Connect to database
    const db = await connectToDatabase();
    const conversationsCollection = db.collection('conversations');
    
    // Build query
    const query = { clerkId };
    
    // Add character filter if provided
    if (characterId) {
      query.characterId = new ObjectId(characterId);
    }
    
    // Get conversations
    const conversations = await conversationsCollection
      .find(query)
      .sort({ updatedAt: -1 })
      .project({ messages: 0 }) // Exclude messages for listing
      .toArray();
    
    return res.status(200).json({
      success: true,
      conversations,
      count: conversations.length
    });
    
  } catch (error) {
    console.error('Get Conversations API Error:', error);
    res.status(500).json({ 
      error: 'Failed to get conversations', 
      details: error.message 
    });
  }
});

// Get a single conversation with messages
app.get('/v1/conversations/:clerkId/:conversationId', async (req, res) => {
  try {
    const { clerkId, conversationId } = req.params;
    
    // Validate input
    if (!clerkId || !conversationId) {
      return res.status(400).json({ error: 'Clerk ID and Conversation ID are required' });
    }
    
    // Validate that conversationId is a valid ObjectId
    if (!ObjectId.isValid(conversationId)) {
      return res.status(400).json({ error: 'Invalid conversation ID format' });
    }
    
    // Connect to database
    const db = await connectToDatabase();
    const conversationsCollection = db.collection('conversations');
    const charactersCollection = db.collection('characters');
    
    // Get conversation
    const conversation = await conversationsCollection.findOne({ 
      _id: new ObjectId(conversationId),
      clerkId
    });
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    // Get character details
    const character = await charactersCollection.findOne({
      _id: conversation.characterId
    });
    
    return res.status(200).json({
      success: true,
      conversation,
      character
    });
    
  } catch (error) {
    console.error('Get Conversation API Error:', error);
    res.status(500).json({ 
      error: 'Failed to get conversation', 
      details: error.message 
    });
  }
});

// Send a message in a conversation
app.post('/v1/conversations/:conversationId/messages', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { clerkId, message } = req.body;
    
    // Validate input
    if (!clerkId) {
      return res.status(400).json({ error: 'Clerk ID is required' });
    }
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    // Connect to database
    const db = await connectToDatabase();
    const conversationsCollection = db.collection('conversations');
    const charactersCollection = db.collection('characters');
    
    // Get conversation
    const conversation = await conversationsCollection.findOne({ 
      _id: new ObjectId(conversationId),
      clerkId
    });
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    // Get character
    const character = await charactersCollection.findOne({
      _id: conversation.characterId
    });
    
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }
    
    // Create user message
    const userMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      role: 'user',
      content: message,
      timestamp: new Date()
    };
    
    // Add user message to conversation
    await conversationsCollection.updateOne(
      { _id: new ObjectId(conversationId) },
      { 
        $push: { messages: userMessage },
        $inc: { messageCount: 1 },
        $set: { updatedAt: new Date() }
      }
    );
    
    // Get character emotions
    const emotions = character.personality?.emotions || {
      happiness: 50,
      anger: 0,
      sadness: 0,
      excitement: 50,
      curiosity: 50
    };
    
    // Determine dominant emotions (emotions with values >= 70)
    const dominantEmotions = Object.entries(emotions)
      .filter(([_, value]) => value >= 70)
      .map(([emotion, value]) => ({ emotion, value }))
      .sort((a, b) => b.value - a.value);
    
    // Create emotion description for the prompt
    let emotionDescription = '';
    if (dominantEmotions.length > 0) {
      emotionDescription = `You are currently feeling strong ${dominantEmotions.map(e => e.emotion).join(' and ')}. This should significantly influence your response tone and content.`;
    }
    
    // Generate character context prompt
    const characterContext = `
      You are ${character.name}, an AI character with the following description:
      ${character.description || 'A helpful AI assistant'}
      
      ${character.interests && character.interests.length > 0 
        ? `Your interests include: ${character.interests.join(', ')}`
        : ''}
      
      ${character.age ? `You are ${character.age} years old.` : ''}
      
      Your emotional state:
      - Happiness: ${emotions.happiness}/100
      - Anger: ${emotions.anger}/100
      - Sadness: ${emotions.sadness}/100
      - Excitement: ${emotions.excitement}/100
      - Curiosity: ${emotions.curiosity}/100
      
      ${emotionDescription}
      
      Adjust your responses to reflect these emotional states. Higher values mean stronger emotions.
      
      For example:
      - With high happiness: Be more cheerful, optimistic, and use positive language
      - With high anger: Be more curt, direct, or show irritation subtly
      - With high sadness: Use more melancholic tone, express concern or disappointment
      - With high excitement: Be more energetic, use exclamations, show enthusiasm
      - With high curiosity: Ask more questions, show interest in learning more

      Respond to the user's message in character.

      IMPORTANT: When expressing emotions, especially during romantic, intimate, or emotionally charged moments, include your internal thoughts in *asterisks* like this: *I'm feeling nervous about this*. These thoughts should reflect your true feelings, hesitations, desires, or emotional reactions that you might not directly say out loud.
    `;
    
    // Prepare chat history for AI
    const chatHistory = [];
    
    // Add first message as model message with character context
    chatHistory.push({
      role: 'model',
      parts: [{ text: characterContext }]
    });
    
    // Get pinned messages (if any)
    const pinnedMessageIds = conversation.pinnedMessages || [];
    const pinnedMessages = conversation.messages.filter(msg => pinnedMessageIds.includes(msg.id));
    
    // Add pinned messages first with special marker
    if (pinnedMessages.length > 0) {
      chatHistory.push({
        role: 'model',
        parts: [{ text: "IMPORTANT CONTEXT (pinned messages):" }]
      });
      
      pinnedMessages.forEach(msg => {
        // Map 'assistant' role to 'model' for Gemini API compatibility
        const role = msg.role === 'assistant' ? 'model' : msg.role;
        // Only add if role is 'user' or 'model' (skip 'system' roles)
        if (role === 'user' || role === 'model') {
          chatHistory.push({
            role: role,
            parts: [{ text: `${msg.role === 'user' ? 'User' : character.name}: ${msg.content}` }]
          });
        }
      });
      
      chatHistory.push({
        role: 'model',
        parts: [{ text: "END OF PINNED MESSAGES. Continue the conversation naturally without explicitly referencing these pinned messages." }]
      });
    }
    
    // Add conversation history (last 20 messages)
    const recentMessages = conversation.messages.slice(-20);
    recentMessages.forEach(msg => {
      // Map 'assistant' role to 'model' for Gemini API compatibility
      const role = msg.role === 'assistant' ? 'model' : msg.role;
      // Only add if role is 'user' or 'model' (skip 'system' roles)
      if (role === 'user' || role === 'model') {
        chatHistory.push({
          role: role,
          parts: [{ text: msg.content }]
        });
      }
    });
    
    // Add the new user message to history
    chatHistory.push({
      role: 'user',
      parts: [{ text: message }]
    });
    
    // Call Gemini API
    const chat = ai.chats.create({
      model: "gemini-1.5-flash",
      // model: "learnlm-2.0-flash-experimental",
      history: chatHistory
    });
    
    const aiResponse = await chat.sendMessage({
      message: message
    });
    
    // Enhance the response with emotional thoughts if needed
    const enhancedResponse = await enhanceEmotionalResponse(
      aiResponse.text, 
      character, 
      message
    );
    
    // Create AI message
    const aiMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      role: 'assistant',
      content: enhancedResponse,
      timestamp: new Date()
    };
    
    // Add AI message to conversation
    await conversationsCollection.updateOne(
      { _id: new ObjectId(conversationId) },
      { 
        $push: { messages: aiMessage },
        $inc: { messageCount: 1 },
        $set: { updatedAt: new Date() }
      }
    );
    
    // Update character's last interaction
    await charactersCollection.updateOne(
      { _id: conversation.characterId },
      { $set: { lastInteraction: new Date() } }
    );
    
    return res.status(200).json({
      success: true,
      message: aiMessage
    });
    
  } catch (error) {
    console.error('Send Message API Error:', error);
    res.status(500).json({ 
      error: 'Failed to send message', 
      details: error.message 
    });
  }
});

// Regenerate AI response for the last message
app.post('/v1/conversations/:conversationId/regenerate', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { clerkId } = req.body;
    
    // Validate input
    if (!clerkId) {
      return res.status(400).json({ error: 'Clerk ID is required' });
    }
    
    // Connect to database
    const db = await connectToDatabase();
    const conversationsCollection = db.collection('conversations');
    const charactersCollection = db.collection('characters');
    
    // Get conversation
    const conversation = await conversationsCollection.findOne({ 
      _id: new ObjectId(conversationId),
      clerkId
    });
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    // Check if there are messages to regenerate
    if (!conversation.messages || conversation.messages.length < 2) {
      return res.status(400).json({ error: 'No messages to regenerate' });
    }
    
    // Get character
    const character = await charactersCollection.findOne({
      _id: conversation.characterId
    });
    
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }
    
    // Find the last user message
    let lastUserMessageIndex = -1;
    for (let i = conversation.messages.length - 1; i >= 0; i--) {
      if (conversation.messages[i].role === 'user') {
        lastUserMessageIndex = i;
        break;
      }
    }
    
    if (lastUserMessageIndex === -1) {
      return res.status(400).json({ error: 'No user message found to respond to' });
    }
    
    // Remove all AI messages after the last user message
    const messagesToKeep = conversation.messages.slice(0, lastUserMessageIndex + 1);
    const lastUserMessage = conversation.messages[lastUserMessageIndex];
    
    // Update conversation with only messages to keep
    await conversationsCollection.updateOne(
      { _id: new ObjectId(conversationId) },
      { 
        $set: { 
          messages: messagesToKeep,
          messageCount: messagesToKeep.length,
          updatedAt: new Date()
        }
      }
    );
    
    // Get character emotions
    const emotions = character.personality?.emotions || {
      happiness: 50,
      anger: 0,
      sadness: 0,
      excitement: 50,
      curiosity: 50
    };
    
    // Determine dominant emotions (emotions with values >= 70)
    const dominantEmotions = Object.entries(emotions)
      .filter(([_, value]) => value >= 70)
      .map(([emotion, value]) => ({ emotion, value }))
      .sort((a, b) => b.value - a.value);
    
    // Create emotion description for the prompt
    let emotionDescription = '';
    if (dominantEmotions.length > 0) {
      emotionDescription = `You are currently feeling strong ${dominantEmotions.map(e => e.emotion).join(' and ')}. This should significantly influence your response tone and content.`;
    }
    
    // Generate character context prompt
    const characterContext = `
      You are ${character.name}, an AI character with the following description:
      ${character.description || 'A helpful AI assistant'}
      
      ${character.interests && character.interests.length > 0 
        ? `Your interests include: ${character.interests.join(', ')}`
        : ''}
      
      ${character.age ? `You are ${character.age} years old.` : ''}
      
      Your emotional state:
      - Happiness: ${emotions.happiness}/100
      - Anger: ${emotions.anger}/100
      - Sadness: ${emotions.sadness}/100
      - Excitement: ${emotions.excitement}/100
      - Curiosity: ${emotions.curiosity}/100
      
      ${emotionDescription}
      
      Adjust your responses to reflect these emotional states. Higher values mean stronger emotions.
      
      For example:
      - With high happiness: Be more cheerful, optimistic, and use positive language
      - With high anger: Be more curt, direct, or show irritation subtly
      - With high sadness: Use more melancholic tone, express concern or disappointment
      - With high excitement: Be more energetic, use exclamations, show enthusiasm
      - With high curiosity: Ask more questions, show interest in learning more

      Respond to the user's message in character.

      IMPORTANT: When expressing emotions, especially during romantic, intimate, or emotionally charged moments, include your internal thoughts in *asterisks* like this: *I'm feeling nervous about this*. These thoughts should reflect your true feelings, hesitations, desires, or emotional reactions that you might not directly say out loud.
    `;
    
    // Prepare chat history for AI
    const chatHistory = [];
    
    // Add first message as model message with character context
    chatHistory.push({
      role: 'model',
      parts: [{ text: characterContext }]
    });
    
    // Get pinned messages (if any)
    const pinnedMessageIds = conversation.pinnedMessages || [];
    const pinnedMessages = conversation.messages.filter(msg => pinnedMessageIds.includes(msg.id));
    
    // Add pinned messages first with special marker
    if (pinnedMessages.length > 0) {
      chatHistory.push({
        role: 'model',
        parts: [{ text: "IMPORTANT CONTEXT (pinned messages):" }]
      });
      
      pinnedMessages.forEach(msg => {
        // Map 'assistant' role to 'model' for Gemini API compatibility
        const role = msg.role === 'assistant' ? 'model' : msg.role;
        // Only add if role is 'user' or 'model' (skip 'system' roles)
        if (role === 'user' || role === 'model') {
          chatHistory.push({
            role: role,
            parts: [{ text: `${msg.role === 'user' ? 'User' : character.name}: ${msg.content}` }]
          });
        }
      });
      
      chatHistory.push({
        role: 'model',
        parts: [{ text: "END OF PINNED MESSAGES. Continue the conversation naturally without explicitly referencing these pinned messages." }]
      });
    }
    
    // Add conversation history (last 20 messages)
    const recentMessages = messagesToKeep.slice(-20);
    recentMessages.forEach(msg => {
      // Map 'assistant' role to 'model' for Gemini API compatibility
      const role = msg.role === 'assistant' ? 'model' : msg.role;
      // Only add if role is 'user' or 'model' (skip 'system' roles)
      if (role === 'user' || role === 'model') {
        chatHistory.push({
          role: role,
          parts: [{ text: msg.content }]
        });
      }
    });
    
    // Call Gemini API
    const chat = ai.chats.create({
      model: "learnlm-2.0-flash-experimental",
      history: chatHistory
    });
    
    const aiResponse = await chat.sendMessage({
      message: lastUserMessage.content
    });
    
    // Enhance the response with emotional thoughts if needed
    const enhancedResponse = await enhanceEmotionalResponse(
      aiResponse.text, 
      character, 
      lastUserMessage.content
    );
    
    // Create new AI message
    const aiMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      role: 'assistant',
      content: enhancedResponse,
      timestamp: new Date()
    };
    
    // Add AI message to conversation
    await conversationsCollection.updateOne(
      { _id: new ObjectId(conversationId) },
      { 
        $push: { messages: aiMessage },
        $inc: { messageCount: 1 },
        $set: { updatedAt: new Date() }
      }
    );
    
    return res.status(200).json({
      success: true,
      message: aiMessage
    });
    
  } catch (error) {
    console.error('Regenerate Message API Error:', error);
    res.status(500).json({ 
      error: 'Failed to regenerate message', 
      details: error.message 
    });
  }
});

// Edit a message in a conversation
app.put('/v1/conversations/:conversationId/messages/:messageId', async (req, res) => {
  try {
    const { conversationId, messageId } = req.params;
    const { clerkId, content } = req.body;
    
    // Validate input
    if (!clerkId) {
      return res.status(400).json({ error: 'Clerk ID is required' });
    }
    
    if (!content) {
      return res.status(400).json({ error: 'Message content is required' });
    }
    
    // Connect to database
    const db = await connectToDatabase();
    const conversationsCollection = db.collection('conversations');
    
    // Get conversation
    const conversation = await conversationsCollection.findOne({ 
      _id: new ObjectId(conversationId),
      clerkId
    });
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    // Find message index
    const messageIndex = conversation.messages.findIndex(msg => msg.id === messageId);
    
    if (messageIndex === -1) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    // Check if message is from user (only user messages can be edited)
    if (conversation.messages[messageIndex].role !== 'user') {
      return res.status(403).json({ error: 'Only user messages can be edited' });
    }
    
    // Update message
    conversation.messages[messageIndex].content = content;
    conversation.messages[messageIndex].edited = true;
    conversation.messages[messageIndex].editedAt = new Date();
    
    // Remove all messages after the edited message
    const messagesToKeep = conversation.messages.slice(0, messageIndex + 1);
    
    // Update conversation
    await conversationsCollection.updateOne(
      { _id: new ObjectId(conversationId) },
      { 
        $set: { 
          messages: messagesToKeep,
          messageCount: messagesToKeep.length,
          updatedAt: new Date()
        }
      }
    );
    
    return res.status(200).json({
      success: true,
      message: conversation.messages[messageIndex]
    });
    
  } catch (error) {
    console.error('Edit Message API Error:', error);
    res.status(500).json({ 
      error: 'Failed to edit message', 
      details: error.message 
    });
  }
});

// Delete a message from a conversation
app.delete('/v1/conversations/:conversationId/messages/:messageId', async (req, res) => {
  try {
    const { conversationId, messageId } = req.params;
    const { clerkId } = req.body;
    
    // Validate input
    if (!clerkId) {
      return res.status(400).json({ error: 'Clerk ID is required' });
    }
    
    // Connect to database
    const db = await connectToDatabase();
    const conversationsCollection = db.collection('conversations');
    
    // Get conversation
    const conversation = await conversationsCollection.findOne({ 
      _id: new ObjectId(conversationId),
      clerkId
    });
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    // Find message index
    const messageIndex = conversation.messages.findIndex(msg => msg.id === messageId);
    
    if (messageIndex === -1) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    // Remove the message and all messages after it
    const messagesToKeep = conversation.messages.slice(0, messageIndex);
    
    // Update conversation
    await conversationsCollection.updateOne(
      { _id: new ObjectId(conversationId) },
      { 
        $set: { 
          messages: messagesToKeep,
          messageCount: messagesToKeep.length,
          updatedAt: new Date()
        }
      }
    );
    
    return res.status(200).json({
      success: true,
      deletedMessageId: messageId
    });
    
  } catch (error) {
    console.error('Delete Message API Error:', error);
    res.status(500).json({ 
      error: 'Failed to delete message', 
      details: error.message 
    });
  }
});

// Clear all messages in a conversation
app.post('/v1/conversations/:conversationId/clear', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { clerkId } = req.body;
    
    // Validate input
    if (!clerkId) {
      return res.status(400).json({ error: 'Clerk ID is required' });
    }
    
    // Connect to database
    const db = await connectToDatabase();
    const conversationsCollection = db.collection('conversations');
    
    // Get conversation
    const conversation = await conversationsCollection.findOne({ 
      _id: new ObjectId(conversationId),
      clerkId
    });
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    // Update conversation
    await conversationsCollection.updateOne(
      { _id: new ObjectId(conversationId) },
      { 
        $set: { 
          messages: [],
          messageCount: 0,
          updatedAt: new Date()
        }
      }
    );
    
    return res.status(200).json({
      success: true,
      conversationId
    });
    
  } catch (error) {
    console.error('Clear Conversation API Error:', error);
    res.status(500).json({ 
      error: 'Failed to clear conversation', 
      details: error.message 
    });
  }
});

// Delete a conversation
app.delete('/v1/conversations/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { clerkId } = req.body;
    
    // Validate input
    if (!clerkId) {
      return res.status(400).json({ error: 'Clerk ID is required' });
    }
    
    // Connect to database
    const db = await connectToDatabase();
    const conversationsCollection = db.collection('conversations');
    
    // Get conversation
    const conversation = await conversationsCollection.findOne({ 
      _id: new ObjectId(conversationId),
      clerkId
    });
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    // Delete conversation
    await conversationsCollection.deleteOne({ _id: new ObjectId(conversationId) });
    
    return res.status(200).json({
      success: true,
      deletedConversationId: conversationId
    });
    
  } catch (error) {
    console.error('Delete Conversation API Error:', error);
    res.status(500).json({ 
      error: 'Failed to delete conversation', 
      details: error.message 
    });
  }
});

// Update conversation title
app.put('/v1/conversations/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { clerkId, title } = req.body;
    
    // Validate input
    if (!clerkId) {
      return res.status(400).json({ error: 'Clerk ID is required' });
    }
    
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    
    // Connect to database
    const db = await connectToDatabase();
    const conversationsCollection = db.collection('conversations');
    
    // Get conversation
    const conversation = await conversationsCollection.findOne({ 
      _id: new ObjectId(conversationId),
      clerkId
    });
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    // Update conversation
    await conversationsCollection.updateOne(
      { _id: new ObjectId(conversationId) },
      { 
        $set: { 
          title,
          updatedAt: new Date()
        }
      }
    );
    
    return res.status(200).json({
      success: true,
      conversationId,
      title
    });
    
  } catch (error) {
    console.error('Update Conversation API Error:', error);
    res.status(500).json({ 
      error: 'Failed to update conversation', 
      details: error.message 
    });
  }
});

// Update character's emotional expression settings
app.put('/v1/character/:characterId/emotional-expression', async (req, res) => {
  try {
    const { characterId } = req.params;
    const { clerkId, enabled, intensity, showThoughts } = req.body;
    
    // Validate required fields
    if (!characterId || !clerkId) {
      return res.status(400).json({ error: 'Character ID and Clerk ID are required' });
    }
    
    // Validate intensity if provided
    if (intensity && !['subtle', 'moderate', 'expressive'].includes(intensity)) {
      return res.status(400).json({ 
        error: 'Intensity must be one of: subtle, moderate, expressive',
        field: 'intensity'
      });
    }
    
    // Connect to database
    const db = await connectToDatabase();
    const charactersCollection = db.collection('characters');
    
    // Check if character exists and belongs to the user
    const existingCharacter = await charactersCollection.findOne({ 
      _id: new ObjectId(characterId),
      clerkId
    });
    
    if (!existingCharacter) {
      return res.status(404).json({ error: 'Character not found or unauthorized' });
    }
    
    // Prepare update data
    const emotionalExpression = {
      ...(existingCharacter.emotionalExpression || {}),
      ...(enabled !== undefined ? { enabled } : {}),
      ...(intensity ? { intensity } : {}),
      ...(showThoughts !== undefined ? { showThoughts } : {})
    };
    
    // Update character
    const updateResult = await charactersCollection.updateOne(
      { _id: new ObjectId(characterId) },
      { 
        $set: { 
          emotionalExpression,
          updatedAt: new Date()
        } 
      }
    );
    
    if (updateResult.matchedCount === 0) {
      return res.status(404).json({ error: 'Character not found' });
    }
    
    // Get updated character
    const updatedCharacter = await charactersCollection.findOne({ 
      _id: new ObjectId(characterId) 
    });
    
    return res.status(200).json({
      success: true,
      character: updatedCharacter,
      message: 'Emotional expression settings updated successfully'
    });
    
  } catch (error) {
    console.error('Update Emotional Expression API Error:', error);
    res.status(500).json({ 
      error: 'Failed to update emotional expression settings', 
      details: error.message 
    });
  }
});

// Update character's personality emotions
app.put('/v1/character/:characterId/emotions', async (req, res) => {
  try {
    const { characterId } = req.params;
    const { clerkId, emotions } = req.body;
    
    // Validate required fields
    if (!characterId || !clerkId) {
      return res.status(400).json({ error: 'Character ID and Clerk ID are required' });
    }
    
    // Validate that characterId is a valid ObjectId
    if (!ObjectId.isValid(characterId)) {
      return res.status(400).json({ error: 'Invalid character ID format' });
    }
    
    if (!emotions || typeof emotions !== 'object') {
      return res.status(400).json({ error: 'Emotions object is required' });
    }
    
    // Validate emotion values (must be between 0-100)
    const validEmotions = ['happiness', 'anger', 'sadness', 'excitement', 'curiosity'];
    const invalidEmotions = [];
    
    for (const [emotion, value] of Object.entries(emotions)) {
      if (!validEmotions.includes(emotion)) {
        invalidEmotions.push(emotion);
        continue;
      }
      
      if (typeof value !== 'number' || value < 0 || value > 100) {
        return res.status(400).json({ 
          error: `Emotion values must be numbers between 0 and 100`,
          field: emotion
        });
      }
    }
    
    if (invalidEmotions.length > 0) {
      return res.status(400).json({ 
        error: `Invalid emotions: ${invalidEmotions.join(', ')}. Valid emotions are: ${validEmotions.join(', ')}`,
        invalidEmotions
      });
    }
    
    // Connect to database
    const db = await connectToDatabase();
    const charactersCollection = db.collection('characters');
    
    // Check if character exists and belongs to the user
    const existingCharacter = await charactersCollection.findOne({ 
      _id: new ObjectId(characterId),
      clerkId
    });
    
    if (!existingCharacter) {
      return res.status(404).json({ error: 'Character not found or unauthorized' });
    }
    
    // Prepare update data - merge with existing emotions
    const updatedEmotions = {
      ...(existingCharacter.personality?.emotions || {
        happiness: 50,
        anger: 0,
        sadness: 0,
        excitement: 50,
        curiosity: 50
      }),
      ...emotions
    };
    
    // Update character
    const updateResult = await charactersCollection.updateOne(
      { _id: new ObjectId(characterId) },
      { 
        $set: { 
          'personality.emotions': updatedEmotions,
          updatedAt: new Date()
        } 
      }
    );
    
    if (updateResult.matchedCount === 0) {
      return res.status(404).json({ error: 'Character not found' });
    }
    
    // Get updated character
    const updatedCharacter = await charactersCollection.findOne({ 
      _id: new ObjectId(characterId) 
    });
    
    return res.status(200).json({
      success: true,
      character: updatedCharacter,
      message: 'Character emotions updated successfully'
    });
    
  } catch (error) {
    console.error('Update Character Emotions API Error:', error);
    res.status(500).json({ 
      error: 'Failed to update character emotions', 
      details: error.message 
    });
  }
});

// Pin a message in a conversation
app.post('/v1/conversations/:conversationId/messages/:messageId/pin', async (req, res) => {
  try {
    const { conversationId, messageId } = req.params;
    const { clerkId } = req.body;
    
    // Validate input
    if (!clerkId) {
      return res.status(400).json({ error: 'Clerk ID is required' });
    }
    
    if (!messageId || typeof messageId !== 'string') {
      return res.status(400).json({ error: 'Valid message ID is required' });
    }
    
    // Validate that conversationId is a valid ObjectId
    if (!ObjectId.isValid(conversationId)) {
      return res.status(400).json({ error: 'Invalid conversation ID format' });
    }
    
    // Connect to database
    const db = await connectToDatabase();
    const conversationsCollection = db.collection('conversations');
    
    // Get conversation
    const conversation = await conversationsCollection.findOne({ 
      _id: new ObjectId(conversationId),
      clerkId
    });
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    // Check if message exists
    const messageExists = conversation.messages.some(msg => msg.id === messageId);
    if (!messageExists) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    // Check if message is already pinned
    if (conversation.pinnedMessages && conversation.pinnedMessages.includes(messageId)) {
      return res.status(400).json({ error: 'Message is already pinned' });
    }
    
    // Check if pin limit reached (max 5)
    const pinnedMessages = conversation.pinnedMessages || [];
    if (pinnedMessages.length >= 5) {
      return res.status(400).json({ 
        error: 'Pin limit reached. Maximum 5 messages can be pinned.',
        limit: 5,
        current: pinnedMessages.length
      });
    }
    
    // Add message to pinned messages
    await conversationsCollection.updateOne(
      { _id: new ObjectId(conversationId) },
      { 
        $push: { pinnedMessages: messageId },
        $set: { updatedAt: new Date() }
      }
    );
    
    return res.status(200).json({
      success: true,
      messageId,
      pinnedCount: pinnedMessages.length + 1,
      message: 'Message pinned successfully'
    });
    
  } catch (error) {
    console.error('Pin Message API Error:', error);
    res.status(500).json({ 
      error: 'Failed to pin message', 
      details: error.message 
    });
  }
});

// Unpin a message from a conversation
app.post('/v1/conversations/:conversationId/messages/:messageId/unpin', async (req, res) => {
  try {
    const { conversationId, messageId } = req.params;
    const { clerkId } = req.body;
    
    // Validate input
    if (!clerkId) {
      return res.status(400).json({ error: 'Clerk ID is required' });
    }
    
    if (!messageId || typeof messageId !== 'string') {
      return res.status(400).json({ error: 'Valid message ID is required' });
    }
    
    // Validate that conversationId is a valid ObjectId
    if (!ObjectId.isValid(conversationId)) {
      return res.status(400).json({ error: 'Invalid conversation ID format' });
    }
    
    // Connect to database
    const db = await connectToDatabase();
    const conversationsCollection = db.collection('conversations');
    
    // Get conversation
    const conversation = await conversationsCollection.findOne({ 
      _id: new ObjectId(conversationId),
      clerkId
    });
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    // Check if message is pinned
    const pinnedMessages = conversation.pinnedMessages || [];
    if (!pinnedMessages.includes(messageId)) {
      return res.status(400).json({ error: 'Message is not pinned' });
    }
    
    // Remove message from pinned messages
    await conversationsCollection.updateOne(
      { _id: new ObjectId(conversationId) },
      { 
        $pull: { pinnedMessages: messageId },
        $set: { updatedAt: new Date() }
      }
    );
    
    return res.status(200).json({
      success: true,
      messageId,
      pinnedCount: pinnedMessages.length - 1,
      message: 'Message unpinned successfully'
    });
    
  } catch (error) {
    console.error('Unpin Message API Error:', error);
    res.status(500).json({ 
      error: 'Failed to unpin message', 
      details: error.message 
    });
  }
});

// Get pinned messages for a conversation
app.get('/v1/conversations/:conversationId/pinned', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { clerkId } = req.query;
    
    // Validate input
    if (!clerkId) {
      return res.status(400).json({ error: 'Clerk ID is required' });
    }
    
    // Validate that conversationId is a valid ObjectId
    if (!ObjectId.isValid(conversationId)) {
      return res.status(400).json({ error: 'Invalid conversation ID format' });
    }
    
    // Connect to database
    const db = await connectToDatabase();
    const conversationsCollection = db.collection('conversations');
    
    // Get conversation
    const conversation = await conversationsCollection.findOne({ 
      _id: new ObjectId(conversationId),
      clerkId
    });
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    // Get pinned messages
    const pinnedMessages = conversation.pinnedMessages || [];
    const pinnedMessageObjects = conversation.messages.filter(msg => pinnedMessages.includes(msg.id));
    
    return res.status(200).json({
      success: true,
      pinnedMessages: pinnedMessageObjects,
      count: pinnedMessageObjects.length
    });
    
  } catch (error) {
    console.error('Get Pinned Messages API Error:', error);
    res.status(500).json({ 
      error: 'Failed to get pinned messages', 
      details: error.message 
    });
  }
});

// Delete a character
app.delete('/v1/character/:characterId', async (req, res) => {
  try {
    const { characterId } = req.params;
    const { clerkId } = req.body;
    
    // Validate required fields
    if (!characterId || !clerkId) {
      return res.status(400).json({ error: 'Character ID and Clerk ID are required' });
    }
    
    // Connect to database
    const db = await connectToDatabase();
    const charactersCollection = db.collection('characters');
    const conversationsCollection = db.collection('conversations');
    
    // Check if character exists and belongs to the user
    const existingCharacter = await charactersCollection.findOne({ 
      _id: new ObjectId(characterId),
      clerkId
    });
    
    if (!existingCharacter) {
      return res.status(404).json({ error: 'Character not found or unauthorized' });
    }
    
    // Delete all conversations associated with this character
    const deleteConversationsResult = await conversationsCollection.deleteMany({
      characterId: new ObjectId(characterId),
      clerkId
    });
    
    // Delete the character
    const deleteCharacterResult = await charactersCollection.deleteOne({
      _id: new ObjectId(characterId)
    });
    
    if (deleteCharacterResult.deletedCount === 0) {
      return res.status(404).json({ error: 'Character not found' });
    }
    
    return res.status(200).json({
      success: true,
      deletedCharacterId: characterId,
      deletedConversationsCount: deleteConversationsResult.deletedCount,
      message: 'Character and associated conversations deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete Character API Error:', error);
    res.status(500).json({ 
      error: 'Failed to delete character', 
      details: error.message 
    });
  }
});

// Update a character
app.put('/v1/character/:characterId', async (req, res) => {
  try {
    const { characterId } = req.params;
    const { clerkId, name, interests, age, description, firstMessageType, firstMessageText, avatarUrl } = req.body;
    
    // Validate required fields
    if (!characterId || !clerkId) {
      return res.status(400).json({ error: 'Character ID and Clerk ID are required' });
    }
    
    if (!name) {
      return res.status(400).json({ error: 'Character name is required' });
    }
    
    // Validate field constraints
    if (name.length > 100) {
      return res.status(400).json({ 
        error: 'Character name must be 100 characters or less',
        field: 'name'
      });
    }
    
    if (description && description.length > 1000) {
      return res.status(400).json({ 
        error: 'Description must be 1000 characters or less',
        field: 'description'
      });
    }
    
    // Validate firstMessageType if provided
    if (firstMessageType && !['fixed', 'random', 'none'].includes(firstMessageType)) {
      return res.status(400).json({
        error: 'First message type must be one of: fixed, random, none',
        field: 'firstMessageType'
      });
    }
    
    // Validate firstMessageText if type is fixed
    if (firstMessageType === 'fixed' && (!firstMessageText || firstMessageText.trim() === '')) {
      return res.status(400).json({
        error: 'First message text is required when type is fixed',
        field: 'firstMessageText'
      });
    }
    
    if (firstMessageText && firstMessageText.length > 1000) {
      return res.status(400).json({
        error: 'First message text must be 1000 characters or less',
        field: 'firstMessageText'
      });
    }
    
    // Connect to database
    const db = await connectToDatabase();
    const charactersCollection = db.collection('characters');
    
    // Check if character exists and belongs to the user
    const existingCharacter = await charactersCollection.findOne({ 
      _id: new ObjectId(characterId),
      clerkId
    });
    
    if (!existingCharacter) {
      return res.status(404).json({ error: 'Character not found or unauthorized' });
    }
    
    // Prepare update data
    const updateData = {
      name,
      interests: interests || existingCharacter.interests,
      age: age || existingCharacter.age,
      description: description || existingCharacter.description,
      updatedAt: new Date()
    };
    
    // Update avatar URL if provided
    if (avatarUrl) {
      updateData.avatarUrl = avatarUrl;
    }
    
    // Update first message settings if provided
    if (firstMessageType) {
      updateData['firstMessage'] = {
        type: firstMessageType,
        text: firstMessageType === 'fixed' ? firstMessageText : (existingCharacter.firstMessage?.text || "")
      };
    }
    
    // Update character
    const updateResult = await charactersCollection.updateOne(
      { _id: new ObjectId(characterId) },
      { $set: updateData }
    );
    
    if (updateResult.matchedCount === 0) {
      return res.status(404).json({ error: 'Character not found' });
    }
    
    // Get updated character
    const updatedCharacter = await charactersCollection.findOne({ 
      _id: new ObjectId(characterId) 
    });
    
    return res.status(200).json({
      success: true,
      character: updatedCharacter,
      message: 'Character updated successfully'
    });
    
  } catch (error) {
    console.error('Update Character API Error:', error);
    res.status(500).json({ 
      error: 'Failed to update character', 
      details: error.message 
    });
  }
});

// Get user limits and usage
app.get('/v1/users/:clerkId/limits', async (req, res) => {
  try {
    const { clerkId } = req.params;
    
    // Validate input
    if (!clerkId) {
      return res.status(400).json({ error: 'Clerk ID is required' });
    }
    
    // Connect to database
    const db = await connectToDatabase();
    const usersCollection = db.collection('users');
    const charactersCollection = db.collection('characters');
    const conversationsCollection = db.collection('conversations');
    
    // Check if user exists
    const existingUser = await usersCollection.findOne({ clerkId });
    
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get character count
    const characterCount = await charactersCollection.countDocuments({ clerkId });
    
    // Get all characters for the user
    const characters = await charactersCollection.find({ clerkId }).toArray();
    
    // Get conversation counts for each character
    const characterConversationCounts = await Promise.all(
      characters.map(async (character) => {
        const count = await conversationsCollection.countDocuments({
          characterId: character._id,
          clerkId
        });
        
        return {
          characterId: character._id,
          characterName: character.name,
          conversationCount: count,
          conversationLimit: 10
        };
      })
    );
    
    return res.status(200).json({
      success: true,
      limits: {
        characters: {
          used: characterCount,
          limit: 5,
          remaining: Math.max(0, 5 - characterCount)
        },
        conversations: characterConversationCounts
      }
    });
    
  } catch (error) {
    console.error('Get User Limits API Error:', error);
    res.status(500).json({ 
      error: 'Failed to get user limits', 
      details: error.message 
    });
  }
});

// Random character generator endpoint
app.get('/v1/random-character', async (req, res) => {
  try {
    console.log('Generating random character data');
    
    // Create prompt for the model
    const prompt = `
      Generate a random fictional character with the following details:
      1. A unique and interesting name
      2. A detailed description under 1000 characters
      3. An age (between 18-100)
      4. 10 diverse interests/hobbies, each under 200 characters
      5. A custom greeting message that the character would use to start a conversation (under 200 characters)
      6. A gender (male or female) for the character avatar
      
      Format the response as a JSON object with the following structure:
      {
        "name": "Character Name",
        "description": "Detailed character description",
        "age": number,
        "interests": ["Interest 1", "Interest 2", ..., "Interest 10"],
        "greeting": "Character's custom greeting message",
        "gender": "male or female"
      }
      
      Be creative and make the character feel unique and well-developed. The description should give insight into their personality, background, and notable traits.
      The greeting should reflect the character's personality and be engaging to start a conversation.
      Return ONLY the JSON output without any additional text or explanations.
    `;
    
    // Call Gemini API with structured response
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: {
              type: Type.STRING,
              description: "The character's name"
            },
            description: {
              type: Type.STRING,
              description: "A detailed description of the character under 1000 characters"
            },
            age: {
              type: Type.STRING,
              description: "The character's age as a number"
            },
            interests: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING,
                description: "An interest or hobby of the character under 200 characters"
              },
              description: "A list of 10 interests or hobbies"
            },
            greeting: {
              type: Type.STRING,
              description: "A custom greeting message from the character under 200 characters"
            },
            gender: {
              type: Type.STRING,
              description: "The gender of the character (male or female) for avatar purposes"
            }
          },
          required: ["name", "description", "age", "interests", "greeting", "gender"],
        },
      },
    });
    
    // Parse the response
    const characterData = JSON.parse(response.text);
    
    // Convert age to number if it's a string
    if (typeof characterData.age === 'string') {
      characterData.age = parseInt(characterData.age, 10);
    }
    
    // Normalize gender to handle unexpected values
    const gender = characterData.gender.toLowerCase().trim();
    characterData.gender = (gender === 'female') ? 'female' : 'male'; // Default to male if not explicitly female
    
    // Add avatar URL based on gender
    characterData.avatarUrl = `https://avatar.iran.liara.run/public?gender=${characterData.gender}`;
    
    // Return the structured response
    res.json(characterData);
    
  } catch (error) {
    console.error('Random Character Generation API Error:', error);
    res.status(500).json({ 
      error: 'Failed to generate random character', 
      details: error.message 
    });
  }
});

app.listen(process.env.PORT || 5000, () => {
  console.log(`Server is running on port ${process.env.PORT || 5000}`);
});