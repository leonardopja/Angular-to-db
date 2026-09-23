import bcrypt from 'bcryptjs';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:4200' }));
app.use(express.json());

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    firstName: { type: String, required: true, minlength: 2, trim: true },
    lastName: { type: String, required: true, minlength: 2, trim: true },
    birthDate: { type: Date, required: true }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

app.get('/api/health', (_request, response) => {
    response.json({ status: 'ok', database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
});

app.post('/api/auth/register', async (request, response) => {
    try {
        const { email, password, passwordConfirmation, firstName, lastName, birthDate } = request.body;
        if (!email || !password || !passwordConfirmation || !firstName || !lastName || !birthDate) {
            return response.status(400).json({ message: 'All registration fields are required.' });
        }
        if (password !== passwordConfirmation) return response.status(400).json({ message: 'Passwords must match.' });
        if (password.length < 6) return response.status(400).json({ message: 'Password must contain at least 6 characters.' });
        if (!process.env.MONGODB_URI) return response.status(503).json({ message: 'Database is not configured yet.' });
        const hashedPassword = await bcrypt.hash(password, 12);
        const user = await User.create({ email, password: hashedPassword, firstName, lastName, birthDate });
        return response.status(201).json({ message: `Welcome, ${user.firstName}! Your account was created.` });
    } catch (error) {
        if (error.code === 11000) return response.status(409).json({ message: 'An account with this email already exists.' });
        return response.status(500).json({ message: 'Unable to create the account.' });
    }
});

const start = async () => {
    if (process.env.MONGODB_URI) {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB Atlas');
    } else {
        console.warn('MONGODB_URI is not configured. The API is running without a database connection.');
    }

    app.listen(port, () => {
        console.log(`API listening on http://localhost:${port}`);
    });
};

start().catch((error) => {
    console.error('Could not start API:', error.message);
    process.exit(1);
});
