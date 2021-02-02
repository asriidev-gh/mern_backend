const mongoose = require('mongoose');

const connectDB = async () => {
	let mongoDB;
	if (process.env.MONGODB_ATLAST) {
		mongoDB = process.env.MONGODB_ATLAST;
	} else {
		const { MONGODB_ATLAST } = require("../secrets");
		mongoDB = MONGODB_ATLAST;
	}
	try {
		const connect = await mongoose.connect(mongoDB, {
			useNewUrlParser: true,
			useCreateIndex: true,
			useUnifiedTopology: true,
			useFindAndModify: false,
			keepAlive: true,
		});
		console.log(`MONGODB Connected... ${connect.connection.host}`);
	} catch (err) {
		console.log(`Error: ${err.message}`);
		process.exit(1);
	}
};

module.exports = connectDB;