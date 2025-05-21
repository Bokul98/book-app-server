// index.js
const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');

const app = express();
const PORT = 3000;

// Middleware to parse urlencoded form data (from forms)
app.use(express.urlencoded({ extended: true }));

// Middleware to parse JSON (e.g., API clients)
app.use(express.json());

// MongoDB URI and client setup
const uri = "mongodb+srv://bokulsorkar96:SThpuhOw92D7s12Y@bokul98.nxtyujp.mongodb.net/?retryWrites=true&w=majority&appName=Bokul98";
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

let recipeCollection;

async function connectToMongo() {
  try {
    await client.connect();
    console.log("✅ Connected to MongoDB!");

    const db = client.db('recipe_data');
    recipeCollection = db.collection('recipe');

    // Start server after DB connection
    app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
    });
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

// POST route to add a recipe and insert into MongoDB
app.post('/add-recipe', async (req, res) => {
  try {
    const {
      image,
      title,
      ingredients,
      instructions,
      cuisine,
      prepTime,
      likeCount,
    } = req.body;

    // Categories checkbox can be string or array or undefined
    let categories = req.body.categories || [];
    if (!Array.isArray(categories)) {
      categories = [categories];
    }

    // Create recipe object with proper types
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

    // Insert into MongoDB
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
    const recipes = await recipeCollection.find().toArray();
    res.status(200).json(recipes);
  } catch (err) {
    res.status(500).json({ error: '❌ Failed to fetch recipes' });
  }
});

// Connect and start the app
connectToMongo();
