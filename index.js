const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const stripe = require('stripe')(process.env.PAYMENT_KEY)
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;


// middleware
app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ error: true, message: 'Unauthorized Access' });
    }

    const token = authorization.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ error: true, message: 'Unauthorized Access' })
        }
        req.decoded = decoded;
        next();
    })
}


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
        const paymentCollection = client.db("summerCampDB").collection("payments");





        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '365d' })
            res.send({ token })
        })

        // admin verify
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email }
            const user = await usersCollection.findOne(query);
            if (user?.role !== "admin") {
                return res.status(403).send({ error: true, message: 'forbidden' })

            }
            next();

        }
        // Instructor verify
        const verifyInstructor = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email }
            const user = await usersCollection.findOne(query);
            if (user?.role !== "instructor") {
                return res.status(403).send({ error: true, message: 'forbidden' })

            }
            next();

        }
        // student verify
        const verifyStudent = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email }
            const user = await usersCollection.findOne(query);
            if (user?.role !== "student") {
                return res.status(403).send({ error: true, message: 'forbidden' })

            }
            next();

        }

        // users collection

        app.get('/users', verifyJWT, verifyAdmin, verifyStudent, async (req, res) => {
            const result = await usersCollection.find().toArray();
            res.send(result)
        })
        // here
        // 
        app.post('/users', async (req, res) => {
            //    here
            const user = {
                name: req.body.name,
                email: req.body.email,
                role: 'student',
            }
            const existingUser = await usersCollection.findOne(user)
            // console.log('existing user', existingUser)
            if (existingUser) {
                return res.send({ alert: 'user already exit' })
            }
            const result = await usersCollection.insertOne(user);
            res.send(result);
        });

        app.get('/users/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            if (req.decoded.email !== email) {
                res.send({ student: false })
            }
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            const result = { student: user?.role === 'student' }
            console.log(result)
            res.send(result);
        })
        app.get('/users/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            if (req.decoded.email !== email) {
                res.send({ admin: false })
            }
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            const result = { admin: user?.role === 'admin' }
            console.log(result)
            res.send(result);
        })


        app.patch('/users/admin/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    role: 'admin'
                },
            };
            const result = await usersCollection.updateOne(filter, updateDoc);
            res.send(result)

        })

        // here
        app.get('/users/instructor/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            if (req.decoded.email !== email) {
                res.send({ instructor: false })
            }
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            const result = { instructor: user?.role === 'instructor' }
            console.log(result)
            res.send(result);
        })

        app.patch('/users/instructor/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    role: 'instructor'
                },
            };
            const result = await usersCollection.updateOne(filter, updateDoc);
            res.send(result)

        })

        // approve,pending doing will be here
        // classes collection  
        app.get('/classes', async (req, res) => {
            const result = await classesCollection.find().toArray();
            res.send(result)
        })

        app.post('/classes', async (req, res) => {
            const classItem = {
                image: req.body.image,
                class_name: req.body.class_name,
                instructor_name: req.body.instructor_name,
                instructor_name: req.body.instructor_email,
                available_seats: req.body.available_seats,
                price: req.body.price,
                status: 'pending'
            }
            const result = await classesCollection.insertOne(classItem)
            res.send(result);
        })

        app.patch('/classes/approve/:id', async (req, res) => {
            const id = req.params.id;

            const filter = {
                _id: new ObjectId(id),
                status: 'pending'
            };
            const updateDoc = {
                $set: {
                    status: 'approve',
                },
            };
            const result = await classesCollection.updateOne(filter, updateDoc);
            res.send(result);
        })

        app.patch('/classes/deny/:id', async (req, res) => {
            const id = req.params.id;

            const filter = {
                _id: new ObjectId(id),
                status: 'pending'
            };
            const updateDoc = {
                $set: {
                    status: 'deny',
                },
            };
            const result = await classesCollection.updateOne(filter, updateDoc);
            res.send(result);
        })




        // instructor collection

        app.get('/instructors', async (req, res) => {
            const result = await instructorsCollection.find().toArray();
            res.send(result)
        })


        app.get('/manageclasses', async (req, res) => {
            const result = await classesCollection.find({ status: "pending" }).toArray();
            res.send(result);
        });



        // select classes collection

        app.get('/selects', verifyJWT, async (req, res) => {
            const email = req.query.email;
            console.log(email)
            if (!email) {
                res.send([]);
            }

            const decodedEmail = req.decoded.email;
            // console.log(decodedEmail)
            if (email !== decodedEmail) {
                return res.status(403).send({ error: true, message: 'Forbidden Access' })
            }
            const query = { email: email };
            console.log(query);
            const result = await selectCollection.find(query).toArray();
            res.send(result)
        });

        app.post('/selects', async (req, res) => {
            const data = req.body;
            // console.log(data);
            const result = await selectCollection.insertOne(data);
            res.send(result);
        });

        app.delete('/selects/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await selectCollection.deleteOne(query);
            res.send(result);
        })

        // payment
        app.post('/create-payment-intent', verifyJWT, async (req, res) => {
            const { price } = req.body;
            const amount = parseInt(price * 100);
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']

            })
            res.send({
                clientSecret: paymentIntent.client_secret
            })
        })

        // payment related api
        app.post('/payments', verifyJWT, async (req, res) => {
            const payment = req.body;
            const insertResult = await paymentCollection.insertOne(payment);
            // const itemId = new ObjectId(payment.cartItem.id);
            const query = { _id: new ObjectId(payment.selectItem) };


            const deleteResult = await selectCollection.deleteOne(query);
            res.send({ insertResult, deleteResult });


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
