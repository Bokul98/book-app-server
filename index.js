const express = require('express');
const cors = require('cors');
require('dotenv').config();
const path = require('path');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb'); // ✅ SINGLE import

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB URI
const uri = process.env.MONGODB_URI;

// MongoDB client setup
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

async function run() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('recipe_data');
    const recipeCollection = db.collection('recipe');

    // Health Check
    app.get('/health', async (req, res) => {
      try {
        await client.db('admin').command({ ping: 1 });
        res.status(200).json({ status: 'OK', mongodb: 'Connected' });
      } catch (err) {
        res.status(500).json({ status: 'Error', mongodb: 'Disconnected', error: err.message });
      }
    });

    // Serve form page
    app.get('/add', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'form.html'));
    });

    // Add recipe
    app.post('/add-recipe', async (req, res) => {
      try {
        const {
          userId,
          image,
          title,
          ingredients,
          instructions,
          cuisine,
          prepTime,
          likeCount,
          categories = []
        } = req.body;

        const cats = Array.isArray(categories) ? categories : [categories];

        const newRecipe = {
          userId,
          image,
          title,
          ingredients,
          instructions,
          cuisine,
          prepTime: Number(prepTime),
          likeCount: Number(likeCount) || 0,
          categories: cats,
          createdAt: new Date()
        };

        const result = await recipeCollection.insertOne(newRecipe);
        console.log('Recipe inserted with ID:', result.insertedId);
        res.status(201).send('Recipe successfully added!');
      } catch (error) {
        console.error('Error inserting recipe:', error);
        res.status(500).send('Failed to add recipe');
      }
    });

    // Get all recipes
    app.get('/get-recipes', async (req, res) => {
      try {
        const recipes = await recipeCollection.find().toArray();
        res.status(200).json(recipes);
      } catch (err) {
        console.error('Error fetching recipes:', err.message);
        res.status(500).json({ error: `Failed to fetch recipes: ${err.message}` });
      }
    });

    // Get single recipe
    app.get('/get-recipe/:id', async (req, res) => {
      try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
          return res.status(400).json({ error: 'Invalid recipe ID format' });
        }

        const recipe = await recipeCollection.findOne({ _id: new ObjectId(id) });

        if (!recipe) {
          return res.status(404).json({ error: 'Recipe not found' });
        }

        res.status(200).json(recipe);
      } catch (err) {
        console.error('Error fetching recipe details:', err.message);
        res.status(500).json({ error: `Failed to fetch recipe details: ${err.message}` });
      }
    });

    app.patch('/recipes/:id/like', async (req, res) => {
      const { id } = req.params;

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Invalid recipe ID' });
      }

      try {
        const result = await recipeCollection.findOneAndUpdate(
          { _id: new ObjectId(id) },
          { $inc: { likeCount: 1 } },
          { returnDocument: 'after' }
        );

        if (!result.value) {
          return res.status(404).json({ message: 'Recipe not found' });
        }

        res.status(200).json(result.value);
      } catch (error) {
        console.error('Error incrementing like:', error);
        res.status(500).json({ message: 'Internal server error' });
      }
    });




    // PUT: Update a recipe by ID
    // ✅ Correct Update Recipe Route
    app.put('/update-recipe/:id', async (req, res) => {
      const { id } = req.params;

      if (!ObjectId.isValid(id)) {
        return;
      }

      let {
        title,
        image,
        cuisine,
        prepTime,
        categories,
        ingredients,
        instructions,
        likeCount,
      } = req.body;

      if (categories && !Array.isArray(categories)) categories = [categories];
      if (ingredients && !Array.isArray(ingredients)) ingredients = [ingredients];

      const updateData = {
        title,
        image,
        cuisine,
        prepTime: prepTime !== undefined ? Number(prepTime) : undefined,
        categories,
        ingredients,
        instructions,
        likeCount: likeCount !== undefined ? Number(likeCount) : undefined,
      };

      Object.keys(updateData).forEach(
        (key) => updateData[key] === undefined && delete updateData[key]
      );

      const result = await recipeCollection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: updateData },
        { returnDocument: 'after' }
      );

      res.status(200).json(result.value);
    });







    // Delete recipe
    app.delete('/delete-recipe/:id', async (req, res) => {
      const { id } = req.params;

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid recipe ID' });
      }

      try {
        const result = await recipeCollection.deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 0) {
          return res.status(404).json({ error: 'Recipe not found or already deleted' });
        }

        res.status(200).json({ message: 'Recipe deleted successfully' });
      } catch (err) {
        console.error('Error deleting recipe:', err.message);
        res.status(500).json({ error: 'Failed to delete recipe' });
      }
    });

  } catch (err) {
    console.error('MongoDB connection failed:', err);
    process.exit(1);
  }
}

run().catch(console.dir);

// Home Route
app.get('/', (req, res) => {
  res.send('Welcome to the Recipe Book API!');
});

// Global error handlers
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
