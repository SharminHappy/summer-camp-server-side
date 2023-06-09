const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;


// middleware
app.use(cors());
app.use(express.json());







const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.sjqbtzt.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();


        const usersCollection = client.db("summerCampDB").collection("users");
        const classesCollection = client.db("summerCampDB").collection("classes");
        const instructorsCollection = client.db("summerCampDB").collection("instructors");
        const selectCollection = client.db("summerCampDB").collection("selects");


        // users collection
        app.post('/users',async(req,res)=>{
            const user=req.body;
            console.log(user);
            const query={email:user.email}
            const existingUser=await usersCollection.findOne(query)
            console.log('existing user',existingUser)
            if(existingUser){
                return res.send({alert: 'user already exit'})
            }
            const result=await usersCollection.insertOne(user);
            res.send(result)
        })
        
        // classes collection  
        app.get('/classes', async (req, res) => {
            const result = await classesCollection.find().toArray();
            res.send(result)
        })


        // instructor collection

        app.get('/instructors', async (req, res) => {
            const result = await instructorsCollection.find().toArray();
            res.send(result)
        })


        // select classes collection

        app.get('/selects', async (req, res) => {
            const email = req.query.email;
            console.log(email)
            if (!email) {
                res.send([]);
            }
            const query = { email: email };
            const result = await selectCollection.find(query).toArray();
            res.send(result)
        });

        app.post('/selects', async (req, res) => {
            const data = req.body;
            console.log(data);
            const result = await selectCollection.insertOne(data);
            res.send(result);
        });

        app.delete('/selects/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await selectCollection.deleteOne(query);
            res.send(result);
        })




        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);







app.get('/', (req, res) => {
    res.send('summer camp starting')
})

app.listen(port, () => {
    console.log(`Summer Camp School is starting Soon on Port ${port}`);
})
