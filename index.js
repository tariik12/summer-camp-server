require("dotenv").config()
const express = require("express");
const app = express()
const cors = require('cors')
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY)
const port = process.env.PORT || 5000


//middleware
app.use(express.json())
app.use(cors())


const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'unauthorized access' });
  }
  const token = authorization.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: true, message: 'unauthorized access' })
    }
    req.decoded = decoded;
    next();
  })
}
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
    // await client.connect();
    // Send a ping to confirm a successful connection

    const usersCollection = client.db('summerCamp').collection('users');
    const classesCollection = client.db('summerCamp').collection('classes');
    const studentCollection = client.db('summerCamp').collection('studentClass');
    const paymentCollection = client.db('summerCamp').collection('paymentClass');



    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '1d'
      })

      res.send({ token })
    })

    //Warning: use VerifyJWT before using verifyAdmin
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email }
      const user = await usersCollection.findOne(query);
      if (user?.role !== 'Admin') {
        return res.status(403).send({ error: true, message: 'forbidden message' })
      }
      next();
    }
    // const verifyInstructor = async (req, res, next) => {
    //   const email = req.decoded.email;
    //   const query = { email: email }
    //   const user = await usersCollection.findOne(query);
    //   if (user?.role !== 'Instructor') {
    //     return res.status(403).send({ error: true, message: 'forbidden message' })
    //   }
    //   next();
    // }
    //users related apis
    app.get('/users', verifyJWT, async (req, res) => {
      const result = await usersCollection.find().toArray()
      res.send(result)
    })



    app.post('/users', async (req, res) => {
      const user = req.body;
      console.log(user)
      const query = { email: user.email }
      const existingUser = await usersCollection.findOne(query)
      console.log('existing user', existingUser)
      if (existingUser) {
        return res.json('user already exist ')

      }
      const result = await usersCollection.insertOne(user)
      res.send(result)
    })
    ////
    app.get('/users/admin/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;
      if (req.decoded.email !== email) {
        return res.send({ admin: false })
      }
      const query = { email: email }
      const user = await usersCollection.findOne(query)
      const result = { admin: user?.role === 'Admin' }
      res.send(result)
    })
    app.get('/users/instructor/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;
      if (req.decoded.email !== email) {
        return res.send({ instructor: false })
      }
      const query = { email: email }
      const user = await usersCollection.findOne(query)
      const result = { instructor: user?.role === 'Instructor' }
      res.send(result)
    })

    app.patch('/users/manageAdminUsers/:id', verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updateRole = req.body;
      console.log(updateRole)
      const updateDoc = {
        $set: {
          role: updateRole.role,
        }
      }
      const result = await usersCollection.updateOne(filter, updateDoc)
      res.send(result)
    })

    // classes
    app.get('/adminManageClasses', verifyJWT, verifyAdmin, async (req, res) => {
      const result = await classesCollection.find().toArray()
      res.send(result)

    })
    app.get('/classes', verifyJWT, async (req, res) => {
      const email = req.query.email;
      console.log(email)
      if (!email) {
        res.send([])
      }

      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(401).send({ error: true, message: 'Forbidden access' })
      }

      const query = { email: email };
      const result = await classesCollection.find(query).toArray();
      res.send(result)
    })

    app.post('/classes', async (req, res) => {
      const singleClass = req.body;
      const result = await classesCollection.insertOne(singleClass)
      res.send(result)
    })
    app.get('/classes', async (req, res) => {
      const result = await classesCollection.find().toArray();
      res.send(result)
    })
    app.get('/classes/:id', verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await classesCollection.findOne(query)
      res.send(result)
    })

    app.patch('/classes/:id', verifyJWT, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updateRole = req.body;
      console.log(updateRole)
      const updateDoc = {
        $set: {
          seats: updateRole.seats,
          price: updateRole.price,
        }
      }
      const result = await classesCollection.updateOne(filter, updateDoc,)
      res.send(result)
    })

    //showClasses
    app.get('/ShowClasses', async (req, res) => {
      const query = { role: 'approved' }
      const result = await classesCollection.find(query).toArray()
      res.send(result)
    })
    app.get('/popularClasses', async (req, res) => {
      const query = { role: 'approved' }
      const result = await classesCollection.find(query).sort({ seatBooking: -1 }).toArray();
      res.send(result);
    })
    app.patch('/ShowClasses/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updateClass = req.body;
      const updateDoc = {
        $set: {
          seats: updateClass.seats,
          seatBooking: updateClass.seatBooking,
        }
      }
      const result = await classesCollection.updateOne(filter, updateDoc)
      res.send(result)
    })

    //showInstructors
    app.get('/ShowInstructor', async (req, res) => {
      // const  role = req.query.role;
      const query = { role: 'Instructor' }
      const result = await usersCollection.find(query).toArray()
      res.send(result)
    })

    // TODO: WILL BE IMPLEMENT AFTER ASSIGNMENT MARK


    //popular instructor

    //   app.get('/popularInstructor', async(req,res) =>{

    //     const result = await paymentCollection.find().sort({seatBooking: -1}).toArray()
    //     const instructorsEmail = { email: { $in: result.map(ema =>ema.instructorEmail)
    //     } }
    //     console.log(instructorsEmail)
    // // const uniqueEmail = [ ({...instructorsEmail})]
    // //   const uniqueEmail = [...new Set([...instructorsEmail])]
    // // console.log('uniq', uniqueEmail)
    //       const instructorrEmail = await usersCollection.find({email:instructorsEmail }).toArray()
    //     res.send(instructorrEmail)

    //   })

    app.patch('/adminManageClasses/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updateRole = req.body;
      console.log(updateRole)
      const updateDoc = {
        $set: {
          role: updateRole.role,
        }
      }
      const result = await classesCollection.updateOne(filter, updateDoc)
      res.send(result)
    })

    //student
    app.post('/studentClass', async (req, res) => {
      const singleClass = req.body;
      const result = await studentCollection.insertOne(singleClass)
      res.send(result)
    })
    app.get('/studentClass', verifyJWT, async (req, res) => {
      const result = await studentCollection.find().toArray()
      res.send(result)
    })
    app.delete('/studentClass/:id', async (req, res) => {
      const id = req.params.id;
      console.log(id)

      const query = { _id: new ObjectId(id) }
      const result = await studentCollection.deleteOne(query)
      res.send(result)

    })
    app.get('/studentClassById/:id', verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await studentCollection.findOne(query)
      res.send(result)
    })
    app.get('/studentClass/:email', verifyJWT, async (req, res) => {
      console.log(req.params.email)
      const result = await studentCollection.find({ studentEmail: req.params.email }).toArray()
      res.send(result)
    })


    app.post('/create-payment-intent', verifyJWT, async (req, res) => {
      const { price } = req.body;
      const amount = price * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });
      return res.send({
        clientSecret: paymentIntent.client_secret
      })
    })
    //payment rel api
    app.post('/payments', verifyJWT, async (req, res) => {
      const payment = req.body;
      const result = await paymentCollection.insertOne(payment)
      console.log(result)
      const query = { _id: new ObjectId(payment.studentSelectedId) }
      const deleteResult = await studentCollection.deleteOne(query)
      res.send({ result, deleteResult })
      console.log({ result, deleteResult })
    })
    app.get('/payments', async (req, res) => {
      console.log(req.params.email)
      const result = await paymentCollection.find().toArray()
      res.send(result)
    })
    app.get('/payments/:email', verifyJWT, async (req, res) => {
      console.log(req.params.email)
      const result = await paymentCollection.find({ studentEmail: req.params.email }).sort({ date: -1 }).toArray()
      res.send(result)
    })
    // await client.db("admin").command({ ping: 1 });
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