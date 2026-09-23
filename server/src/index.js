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
    birthDate: { type: Date, required: true },
    role: { type: String, enum: ['worker', 'admin'], default: 'worker' }
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

const requireAdmin = (request, response, next) => {
    if (request.user.role !== 'admin') return response.status(403).json({ message: 'Administrator access is required.' });
    return next();
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

        const token = jwt.sign({ userId: user._id.toString(), email: user.email, role: user.role }, process.env.JWT_SECRET || 'development-secret', { expiresIn: '60m' });
        return response.json({ token, expiresIn: 3600, user: { firstName: user.firstName, lastName: user.lastName, email: user.email, birthDate: user.birthDate, role: user.role } });
    } catch (_error) {
        return response.status(500).json({ message: 'Unable to sign in.' });
    }
});

app.get('/api/me', authenticate, async (request, response) => {
    try {
        const user = await User.findById(request.user.userId).select('-password');
        if (!user) return response.status(404).json({ message: 'User profile was not found.' });
        return response.json(user);
    } catch (_error) {
        return response.status(500).json({ message: 'Unable to load the profile.' });
    }
});

app.put('/api/me', authenticate, async (request, response) => {
    try {
        const { email, password, passwordConfirmation, firstName, lastName, birthDate } = request.body;
        if (!email || !firstName || !lastName || !birthDate) {
            return response.status(400).json({ message: 'Email, name and birth date are required.' });
        }
        if (password && (password.length < 6 || password !== passwordConfirmation)) {
            return response.status(400).json({ message: 'New passwords must match and contain at least 6 characters.' });
        }

        const updates = { email, firstName, lastName, birthDate };
        if (password) updates.password = await bcrypt.hash(password, 12);
        const user = await User.findByIdAndUpdate(request.user.userId, updates, { new: true, runValidators: true }).select('-password');
        if (!user) return response.status(404).json({ message: 'User profile was not found.' });
        return response.json({ message: 'Your profile was updated successfully.', user });
    } catch (error) {
        if (error.code === 11000) return response.status(409).json({ message: 'An account with this email already exists.' });
        return response.status(500).json({ message: 'Unable to update the profile.' });
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

app.put('/api/shifts/:id', authenticate, async (request, response) => {
    try {
        const { date, startTime, endTime, hourlyWage, workplace, shiftName, comments } = request.body;
        if (!date || !startTime || !endTime || !hourlyWage || !workplace || !shiftName) {
            return response.status(400).json({ message: 'All required shift fields must be completed.' });
        }
        const shift = await Shift.findOneAndUpdate(
            { _id: request.params.id, userId: request.user.userId },
            { date, startTime, endTime, hourlyWage, workplace, shiftName, comments },
            { new: true, runValidators: true }
        );
        if (!shift) return response.status(404).json({ message: 'Shift was not found.' });
        return response.json(shift);
    } catch (_error) {
        return response.status(500).json({ message: 'Unable to update the shift.' });
    }
});

app.get('/api/admin/shifts', authenticate, requireAdmin, async (request, response) => {
    try {
        const shifts = await Shift.find().populate('userId', 'firstName lastName email').sort({ date: 1, startTime: 1 });
        return response.json(shifts);
    } catch (_error) {
        return response.status(500).json({ message: 'Unable to load all shifts.' });
    }
});

app.get('/api/admin/workers', authenticate, requireAdmin, async (request, response) => {
    try {
        const workers = await User.find({ role: 'worker' }).select('-password').sort({ lastName: 1, firstName: 1 });
        return response.json(workers);
    } catch (_error) {
        return response.status(500).json({ message: 'Unable to load workers.' });
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
