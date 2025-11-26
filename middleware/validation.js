// Input validation middleware

const validateProduct = (req, res, next) => {
    const { title, price, description, image } = req.body;

    // Check required fields
    if (!title || !title.trim()) {
        return res.status(400).json({ message: 'Product title is required' });
    }

    if (price === undefined || price === null) {
        return res.status(400).json({ message: 'Product price is required' });
    }

    // Validate price
    const priceNum = Number(price);
    if (isNaN(priceNum) || priceNum < 0) {
        return res.status(400).json({ message: 'Price must be a positive number' });
    }

    if (!description || !description.trim()) {
        return res.status(400).json({ message: 'Product description is required' });
    }

    if (!image || !image.trim()) {
        return res.status(400).json({ message: 'Product image URL is required' });
    }

    // Validate image URL format
    try {
        new URL(image);
    } catch (error) {
        return res.status(400).json({ message: 'Invalid image URL format' });
    }

    // Validate string lengths
    if (title.length > 200) {
        return res.status(400).json({ message: 'Title must be less than 200 characters' });
    }

    if (description.length > 2000) {
        return res.status(400).json({ message: 'Description must be less than 2000 characters' });
    }

    // Sanitize data
    req.body.title = title.trim();
    req.body.description = description.trim();
    req.body.image = image.trim();
    req.body.price = priceNum;

    next();
};

const validateUserRegistration = (req, res, next) => {
    const { name, email, password } = req.body;

    // Check required fields
    if (!name || !name.trim()) {
        return res.status(400).json({ message: 'Name is required' });
    }

    if (!email || !email.trim()) {
        return res.status(400).json({ message: 'Email is required' });
    }

    if (!password) {
        return res.status(400).json({ message: 'Password is required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Invalid email format' });
    }

    // Validate password strength
    if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    if (password.length > 100) {
        return res.status(400).json({ message: 'Password must be less than 100 characters' });
    }

    // Validate name length
    if (name.trim().length < 2) {
        return res.status(400).json({ message: 'Name must be at least 2 characters long' });
    }

    if (name.trim().length > 100) {
        return res.status(400).json({ message: 'Name must be less than 100 characters' });
    }

    // Sanitize data
    req.body.name = name.trim();
    req.body.email = email.trim().toLowerCase();

    next();
};

module.exports = { validateProduct, validateUserRegistration };

