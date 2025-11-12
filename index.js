const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.n2kdiwk.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

app.get('/', (req, res) => {
    res.send('Social development server is running!!');
})

async function run() {
    try {
        await client.connect();

        const db = client.db('social_db');
        const treesCollection = db.collection('trees');
        const joinedEventsCollection = db.collection('joinedEvents');
        const eventsCollection = db.collection('events');

        // tree collection APIs
        app.post('/trees', async (req, res) => {
            const newTrees = req.body;
            const result = await treesCollection.insertOne(newTrees);
            res.send(result);
        })

        // app.get('/trees', async (req, res) => {
        //     const today = new Date();
        //     const cursor = treesCollection.find({
        //         event_date: { $gte: today.toISOString().split('T')[0] }
        //     });
        //     const result = await cursor.toArray();
        //     res.send(result);
        // });

        app.get('/trees', async (req, res) => {
            try {
                const today = new Date().toISOString().split('T')[0];
                const { type, search } = req.query;

                const query = {
                    event_date: { $gte: today }
                };

                if (type && type !== 'All') {
                    query.event_type = type;
                }

                if (search) {
                    query.event_title = { $regex: search, $options: 'i' };
                }

                const result = await treesCollection.find(query).toArray();
                res.send(result);
            } catch (error) {
                console.error('Error fetching filtered events:', error);
                res.status(500).send({ message: 'Failed to fetch events' });
            }
        });

        app.get('/trees/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await treesCollection.findOne(query);
            res.send(result);
        })

        app.delete('/trees/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await treesCollection.deleteOne(query);
            res.send(result);
        })

        // events collection APIs
        app.post('/events', async (req, res) => {
            const event = req.body;
            const result = await eventsCollection.insertOne(event);
            res.send(result);
        });

        app.get('/events', async (req, res) => {
            const cursor = eventsCollection.find();
            const result = await cursor.toArray();
            res.send(result)
        })

        app.get('/events/:id', async (req, res) => {
            try {
                const id = req.params.id;
                const query = { _id: new ObjectId(id) };
                const result = await eventsCollection.findOne(query);

                if (!result) {
                    return res.status(404).send({ message: 'Event not found' });
                }

                res.send(result);

            } catch (error) {
                console.error('Error fetching event by ID:', error);
                res.status(500).send({ message: 'Failed to fetch event', error });
            }
        });


        app.patch('/events/:id', async (req, res) => {
            try {
                const id = req.params.id;
                const updatedEvent = req.body;

                const filter = { _id: new ObjectId(id) };
                const updateDoc = {
                    $set: {
                        event_title: updatedEvent.event_title,
                        description: updatedEvent.description,
                        event_type: updatedEvent.event_type,
                        thumbnail: updatedEvent.thumbnail,
                        location: updatedEvent.location,
                        event_date: updatedEvent.event_date
                    }
                };

                const result = await eventsCollection.updateOne(filter, updateDoc);
                res.send(result);

            } catch (error) {
                console.error('Error updating event:', error);
                res.status(500).send({ message: 'Failed to update event', error });
            }
        });



        // User joins an event collection APIs
        app.post('/join-event', async (req, res) => {
            const { userId, userName, userEmail, eventId, eventTitle, eventDate } = req.body;

            if (!userId || !eventId) {
                return res.status(400).send({ message: 'Missing user or event info' });
            }

            const joinData = {
                userId,
                userName,
                userEmail,
                eventId: new ObjectId(eventId),
                eventTitle,
                eventDate,
                joinedAt: new Date(),
            };

            const result = await joinedEventsCollection.insertOne(joinData);
            res.send(result);
        });

        app.get('/join-event', async (req, res) => {
            const cursor = joinedEventsCollection.find();
            const result = await cursor.toArray();
            res.send(result)
        });

        app.get('/join-event/:id', async (req, res) => {
            try {
                const id = req.params.id;
                const query = { _id: new ObjectId(id) };
                const result = await joinedEventsCollection.findOne(query);

                if (!result) {
                    return res.status(404).send({ message: 'Joined event not found' });
                }

                res.send(result);

            } catch (error) {
                console.error('Error fetching joined event by ID:', error);
                res.status(500).send({ message: 'Failed to fetch joined event', error });
            }
        });

        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {

    }
}
run().catch(console.dir);

app.listen(port, () => {
    console.log(`Social server is running on port: ${port}`);
})