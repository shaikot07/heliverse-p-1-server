const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_user}:${process.env.DB_PASS}@cluster0.loifkbc.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

async function run() {
    try {
        await client.connect();
        const userCollection = client.db('heliverse-p-1-project').collection('users');
        const teamCollection = client.db('heliverse-p-1-project').collection('team');
        // User-related API with pagination, search, and filters
        app.get('/users', async (req, res) => {
            const pageSize = 20;
            const currentPage = parseInt(req.query.page) || 1;
            const skip = (currentPage - 1) * pageSize;

            const searchTerm = req.query.name || '';
            // console.log("this seach name",searchTerm);
            const searchCriteria = searchTerm ? { name: { $regex: new RegExp(searchTerm, 'i') } } : "data not found";

            const filterCriteria = {};
            req.query.domain && (filterCriteria.domain = req.query.domain);
            req.query.gender && (filterCriteria.gender = req.query.gender);
            req.query.availability && (filterCriteria.availability = req.query.availability);

            const combinedCriteria = {};
            if (searchTerm) {
                combinedCriteria.$and = [
                    searchCriteria,
                    filterCriteria
                ];
            } else {
                Object.assign(combinedCriteria, filterCriteria);
            }

            const users = await userCollection
                .find(combinedCriteria)
                .skip(skip)
                .limit(pageSize)
                .toArray();

            const totalUsers = await userCollection.countDocuments(combinedCriteria);
            const totalPages = Math.ceil(totalUsers / pageSize);

            res.json({ users, totalPages });
        });

        // User creation with existing user check
        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email };
            const existingUser = await userCollection.findOne(query);

            if (existingUser) {
                return res.send({ message: 'User already exists', insertedId: null });
            }

            const result = await userCollection.insertOne(user);
            res.send(result);
        });
        // post team member 
        app.post('/add-to-team', async (req, res) => {
            const item = req.body;
            const result = await teamCollection.insertOne(item);
            res.send(result)
        });
        //   get team membar acoding to email 
        app.get('/team-data/user', async (req, res) => {
            const email = req.query.email;
            // console.log("its a my card", email);
            const query = { authorEmail: email }
            const result = await teamCollection.find(query).toArray();
            console.log(result);
            res.send(result)
        })
        //  delete one article by id 
        app.delete('/team-data/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await teamCollection.deleteOne(query);
            res.send(result)
        })
        // Ping MongoDB
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // await client.close();
    }
}

run().catch(console.dir);

// Testing route
app.get('/', (req, res) => {
    res.send('Simple CRUD Is RUNNING');
});

app.listen(port, () => {
    console.log(`Simple CRUD is Running on Port,${port}`);
});
