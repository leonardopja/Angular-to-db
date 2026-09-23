import bcrypt from 'bcryptjs';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import jwt from 'jsonwebtoken';
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

const shiftSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    hourlyWage: { type: Number, required: true, min: 1 },
    workplace: { type: String, required: true, trim: true },
    shiftName: { type: String, required: true, minlength: 2, trim: true },
    comments: { type: String, trim: true, default: '' }
}, { timestamps: true });

const Shift = mongoose.model('Shift', shiftSchema);

const authenticate = (request, response, next) => {
    const authorization = request.headers.authorization || '';
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
    if (!token) return response.status(401).json({ message: 'Authentication is required.' });

    try {
        request.user = jwt.verify(token, process.env.JWT_SECRET || 'development-secret');
        return next();
    } catch (_error) {
        return response.status(401).json({ message: 'Your session has expired. Please sign in again.' });
    }
};

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

app.post('/api/auth/login', async (request, response) => {
    try {
        const { email, password } = request.body;
        if (!email || !password) return response.status(400).json({ message: 'Email and password are required.' });
        if (!process.env.MONGODB_URI) return response.status(503).json({ message: 'Database is not configured yet.' });

        const user = await User.findOne({ email: email.toLowerCase().trim() });
        const validPassword = user ? await bcrypt.compare(password, user.password) : false;
        if (!user || !validPassword) return response.status(401).json({ message: 'Invalid email or password.' });

        const token = jwt.sign({ userId: user._id.toString(), email: user.email }, process.env.JWT_SECRET || 'development-secret', { expiresIn: '60m' });
        return response.json({ token, expiresIn: 3600, user: { firstName: user.firstName, lastName: user.lastName, email: user.email } });
    } catch (_error) {
        return response.status(500).json({ message: 'Unable to sign in.' });
    }
});

app.get('/api/shifts', authenticate, async (request, response) => {
    try {
        const shifts = await Shift.find({ userId: request.user.userId }).sort({ date: 1, startTime: 1 });
        return response.json(shifts);
    } catch (_error) {
        return response.status(500).json({ message: 'Unable to load shifts.' });
    }
});

app.post('/api/shifts', authenticate, async (request, response) => {
    try {
        const { date, startTime, endTime, hourlyWage, workplace, shiftName, comments } = request.body;
        if (!date || !startTime || !endTime || !hourlyWage || !workplace || !shiftName) {
            return response.status(400).json({ message: 'All required shift fields must be completed.' });
        }
        const shift = await Shift.create({ userId: request.user.userId, date, startTime, endTime, hourlyWage, workplace, shiftName, comments });
        return response.status(201).json(shift);
    } catch (_error) {
        return response.status(500).json({ message: 'Unable to save the shift.' });
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
