const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Register a new user
const registerUser = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        // 1. Check if user already exists
        const userExists = await prisma.user.findUnique({ where: { email } });
        if (userExists) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        // 2. Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 3. Create the user
        const newUser = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword, // Save hashed password
                role: role || 'REPORTER' // Default role
            }
        });

        res.status(201).json({ success: true, message: 'User registered successfully', data: { id: newUser.id, name: newUser.name, email: newUser.email } });
    } catch (error) {
        console.error('Error in register:', error);
        res.status(500).json({ success: false, message: 'Server error during registration' });
    }
};

// Login user
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Find the user
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // 2. Check the password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // 3. Generate JWT Token
        // You should use a strong secret in .env, using a simple one here for testing
        const token = jwt.sign(
            { id: user.id, role: user.role }, 
            process.env.JWT_SECRET || 'supersecretkey', 
            { expiresIn: '30d' }
        );

        res.status(200).json({ success: true, token, user: { id: user.id, name: user.name, role: user.role } });
    } catch (error) {
        console.error('Error in login:', error);
        res.status(500).json({ success: false, message: 'Server error during login' });
    }
};

module.exports = {
    registerUser,
    loginUser
};