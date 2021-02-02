const express = require('express')
const connectDB = require('./database/db');
const cors = require('cors')

require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

connectDB();

// Import Routes
const authRoute = require("./routes/auth");
const ebooksRoute = require("./routes/ebooks");

// const exercisesRouter = require('./routes/exercises');
// const usersRouter = require('./routes/users');

// app.use('/exercises', exercisesRouter);
// app.use('/api/users', usersRouter);
app.use("/api/user", authRoute);
app.use("/api/ebooks",ebooksRoute);

const PORT = process.env.PORT || 5000;
app.listen(PORT, ()=>{
	console.log(`Server is running on port: ${PORT}`);
});