const express = require("express");
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express()
require("dotenv").config()
const port = process.env.PORT || 5000
const cors = require('cors')

app.use(express.json())
app.use(cors())


app.get('/', (req, res) => {
    res.send('summer server is running')
})

const uri = `mongodb+srv://${process.env.DB_NAME}:${process.env.DB_PASS}@cluster0.nlw4swl.mongodb.net/?retryWrites=true&w=majority`;

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
    // Send a ping to confirm a successful connection

    const usersCollection = client.db('summerCamp').collection('users');


    app.post('/users',async(req,res) =>{
        const user = req.body;
        console.log(user)
        const query = {email: user.email}
        const existingUser = await usersCollection.findOne(query)
        console.log('existing user',existingUser)
        if(existingUser){
          return res.json('user already exist ')
          
        }
        const result = await usersCollection.insertOne(user)
        res.send(result)
      })
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.listen(port, () => {
    console.log('summer port console is running')
})