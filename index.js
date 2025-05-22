const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// MongoDB URI from environment variable
const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('❌ MONGODB_URI environment variable is not set');
  process.exit(1);
}

const client = new MongoClient(uri, {
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
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB!');
    console.log('MongoDB driver version:', require('mongodb/package.json').version);
    const db = client.db('recipe_data');
    recipeCollection = db.collection('recipe');
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err);
    throw err; // Rethrow to handle in startServer
  }
}

// Serve the HTML form
app.get('/add', (req, res) => {
  res.sendFile(__dirname + '/public/form.html');
});

// Home route
app.get('/', (req, res) => {
  res.send('👋 Welcome to the Recipe Books API!');
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    if (!recipeCollection) {
      throw new Error('MongoDB not connected');
    }
    await client.db('admin').command({ ping: 1 });
    res.status(200).json({ status: 'OK', mongodb: 'Connected' });
  } catch (err) {
    res.status(500).json({ status: 'Error', mongodb: 'Disconnected', error: err.message });
  }
});

// POST route to add a recipe
app.post('/add-recipe', async (req, res) => {
  try {
    if (!recipeCollection) {
      throw new Error('MongoDB not connected');
    }
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
    if (!Array.isArray(categories)) {
      categories = [categories];
    }

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

// GET all recipes
app.get('/get-recipes', async (req, res) => {
  try {
    if (!recipeCollection) {
      throw new Error('MongoDB collection not initialized. Ensure MongoDB is connected.');
    }
    const recipes = await recipeCollection.find().toArray();
    res.status(200).json(recipes);
  } catch (err) {
    console.error('❌ Error in /get-recipes:', err.message);
    res.status(500).json({ error: `Failed to fetch recipes: ${err.message}` });
  }
});

// Error handling
process.on('uncaughtException', (err) => {
  console.error('❗ Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('❗ Unhandled Rejection:', err);
});

// Start server after MongoDB connection
async function startServer() {
  try {
    await connectToMongo();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Failed to start server due to MongoDB connection error:', err);
    process.exit(1);
  }
}

startServer();