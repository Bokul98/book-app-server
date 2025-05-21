const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// MongoDB URI from environment variable
const uri = process.env.MONGODB_URI || "mongodb+srv://bokulsorkar96:SThpuhOw92D7s12Y@bokul98.nxtyujp.mongodb.net/recipe_data?retryWrites=true&w=majority";

const client = new MongoClient(uri, {
  tls: true,
  tlsAllowInvalidCertificates: false, // Set to true for debugging only
  minDHSize: 2048,
  serverApi: ServerApiVersion.v1,
  connectTimeoutMS: 30000,
  maxPoolSize: 10,
  loggerLevel: 'debug', // Enable debug logging
});

let recipeCollection;

async function connectToMongo() {
  try {
    await client.connect();
    console.log("✅ Connected to MongoDB!");
    console.log("MongoDB driver version:", require('mongodb').version);
    const db = client.db('recipe_data');
    recipeCollection = db.collection('recipe');
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err);
  }
}

// Serve the HTML form
app.get('/add', (req, res) => {
  res.sendFile(__dirname + '/public/form.html');
});

// Home route
app.get('/', (req, res) => {
  res.send('👋 Welcome to the Recipe Book API!');
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
    console.log("Recipe inserted with ID:", result.insertedId);
    res.status(201).send('Recipe successfully added!');
  } catch (error) {
    console.error("Error inserting recipe:", error);
    res.status(500).send('Failed to add recipe');
  }
});

// GET all recipes
app.get('/get-recipes', async (req, res) => {
  try {
    if (!recipeCollection) {
      throw new Error('MongoDB not connected');
    }
    const recipes = await recipeCollection.find().toArray();
    res.status(200).json(recipes);
  } catch (err) {
    res.status(500).json({ error: '❌ Failed to fetch recipes' });
  }
});

// Error handling
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});

// Connect to MongoDB
connectToMongo();