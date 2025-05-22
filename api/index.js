require('dotenv').config();
const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const uri = process.env.MONGODB_URI;

const client = new MongoClient(uri || '', {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  connectTimeoutMS: 30000,
  socketTimeoutMS: 60000,
  maxPoolSize: 10,
  retryWrites: true,
  retryReads: true,
  serverSelectionTimeoutMS: 15000,
});

let recipeCollection;

async function connectToMongo() {
  if (!uri) {
    console.warn('⚠️ MONGODB_URI is not set. Skipping DB connection.');
    return;
  }

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB!');
    const db = client.db('recipe_data');
    recipeCollection = db.collection('recipe');
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err);
  }
}

app.get('/', (req, res) => {
  res.send('👋 Welcome to the Recipe Books API!');
});

app.get('/add', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'form.html'));
});

app.get('/health', async (req, res) => {
  try {
    if (!recipeCollection) throw new Error('MongoDB not connected');
    await client.db('admin').command({ ping: 1 });
    res.status(200).json({ status: 'OK', mongodb: 'Connected' });
  } catch (err) {
    res.status(500).json({ status: 'Error', mongodb: 'Disconnected', error: err.message });
  }
});

app.post('/add-recipe', async (req, res) => {
  try {
    if (!recipeCollection) throw new Error('MongoDB not connected');

    const {
      image,
      title,
      ingredients,
      instructions,
      cuisine,
      prepTime,
      likeCount,
    } = req.body;

    let categories = req.body.categories || [];
    if (!Array.isArray(categories)) categories = [categories];

    const newRecipe = {
      image,
      title,
      ingredients,
      instructions,
      cuisine,
      prepTime: Number(prepTime),
      categories,
      likeCount: Number(likeCount) || 0,
      createdAt: new Date(),
    };

    const result = await recipeCollection.insertOne(newRecipe);
    console.log('✅ Recipe inserted with ID:', result.insertedId);
    res.status(201).send('Recipe successfully added!');
  } catch (error) {
    console.error('❌ Error inserting recipe:', error);
    res.status(500).send('Failed to add recipe');
  }
});

app.get('/get-recipes', async (req, res) => {
  try {
    if (!recipeCollection) throw new Error('MongoDB collection not initialized.');
    const recipes = await recipeCollection.find().toArray();
    res.status(200).json(recipes);
  } catch (err) {
    console.error('❌ Error in /get-recipes:', err.message);
    res.status(500).json({ error: `Failed to fetch recipes: ${err.message}` });
  }
});

process.on('uncaughtException', (err) => {
  console.error('❗ Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('❗ Unhandled Rejection:', err);
});

async function startServer() {
  await connectToMongo();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
  });
}

startServer();
