const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://yareyaregiorno:KMEAwznhQ7d90GKw@fyp.tfhftqb.mongodb.net/?retryWrites=true&w=majority&appName=FYP';

class MongoDatabase {
    constructor() {
        this.connect();
    }

    async connect() {
        try {
            await mongoose.connect(MONGODB_URI, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
            });
            console.log('✅ Connected to MongoDB Atlas');
        } catch (error) {
            console.error('❌ MongoDB connection error:', error);
            process.exit(1);
        }
    }

    async disconnect() {
        try {
            await mongoose.disconnect();
            console.log('📴 Disconnected from MongoDB');
        } catch (error) {
            console.error('❌ Error disconnecting from MongoDB:', error);
        }
    }

    // Helper methods to match the SQLite interface
    async run(query, params = []) {
        // This will be handled by Mongoose models
        throw new Error('Use Mongoose models instead of raw queries');
    }

    async get(query, params = []) {
        // This will be handled by Mongoose models
        throw new Error('Use Mongoose models instead of raw queries');
    }

    async all(query, params = []) {
        // This will be handled by Mongoose models
        throw new Error('Use Mongoose models instead of raw queries');
    }

    async runTransaction(operations) {
        const session = await mongoose.startSession();
        try {
            await session.withTransaction(async () => {
                for (const operation of operations) {
                    await operation.execute(session);
                }
            });
        } finally {
            await session.endSession();
        }
    }

    async close() {
        await this.disconnect();
    }
}

module.exports = MongoDatabase;
