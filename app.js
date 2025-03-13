const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
app.use(bodyParser.json());

// Connect to database
const db = new sqlite3.Database(path.join(__dirname, 'database.sqlite'));


const logDebug = (message, type = 'info') => {
  const timestamp = new Date().toLocaleTimeString();
  let icon = '📋';
  let color = '\x1b[32m'; 
  
  switch(type) {
    case 'success':
      icon = '✅';
      break;
    case 'error':
      icon = '❌';
      color = '\x1b[31m'; // Red
      break;
    case 'warn':
      icon = '⚠️';
      color = '\x1b[33m'; // Yellow
      break;
    case 'encrypt':
      icon = '🔒';
      break;
    case 'decrypt':
      icon = '🔓';
      break;
    case 'login':
      icon = '🔑';
      break;
    case 'register':
      icon = '📝';
      break;
    case 'db':
      icon = '💾';
      break;
  }
  
  console.log(`${color}[${timestamp}] ${icon}  ${message}\x1b[0m`);
};


db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password TEXT,
    father_name TEXT,
    first_name TEXT,
    address TEXT,
    phone TEXT UNIQUE,
    reg_number TEXT UNIQUE,
    passport_reg_number TEXT
  )`);
  
});

/**
 * ENCRYPTION FUNCTIONS
 * Used to securely store and retrieve user data
 */
function encryptData(data, password) {
  const key = crypto.createHash('sha256').update(password).digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const result = iv.toString('hex') + ':' + encrypted;
  logDebug(`ENCRYPTED: "${data}" -> "${result.substring(0, 20)}..."`, 'encrypt');
  return result;
}

function decryptData(data, password) {
  const key = crypto.createHash('sha256').update(password).digest();
  const parts = data.split(':');
  const iv = Buffer.from(parts.shift(), 'hex');
  const encryptedText = parts.join(':');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  logDebug(`DECRYPTED: "${data.substring(0, 20)}..." -> "${decrypted}"`, 'decrypt');
  return decrypted;
}


function generateRegistrationNumber() {
  return new Promise((resolve, reject) => {
    db.get('SELECT COUNT(*) as count FROM users', [], (err, row) => {
      if (err) reject(err);
      const count = row ? row.count + 1 : 1;
      const regNumber = `#${count}`;
      logDebug(`Generated registration number: ${regNumber}`, 'db');
      resolve(regNumber);
    });
  });
}

function checkUserExists(email, phone) {
  return new Promise((resolve, reject) => {
    logDebug(`Checking if user exists: email=${email}, phone=${phone}`, 'db');
    db.all('SELECT * FROM users', (err, rows) => {
      if (err) reject(err);
      
      let emailExists = false;
      let phoneExists = false;

      for (const row of rows) {
        try {
          const decryptedEmail = decryptData(row.email, row.password);
          if (decryptedEmail === email) {
            emailExists = true;
            logDebug(`Email already exists: ${email}`, 'warn');
            break;
          }

          const decryptedPhone = decryptData(row.phone, row.password);
          if (decryptedPhone === phone) {
            phoneExists = true;
            logDebug(`Phone already exists: ${phone}`, 'warn');
            break;
          }
        } catch (e) {
          logDebug(`Error decrypting user data: ${e.message}`, 'error');
          continue;
        }
      }
      
      logDebug(`User exists check result: emailExists=${emailExists}, phoneExists=${phoneExists}`, 'info');
      resolve({ emailExists, phoneExists });
    });
  });
}

// Middleware - Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

/**
 * ROUTES
 */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Register endpoint
app.post('/register', async (req, res) => {
  const { email, password, father_name, first_name, address, phone, passport_reg_number } = req.body;
  
  logDebug('════════════════════════════════════════════', 'register');
  logDebug('➤ NEW REGISTRATION ATTEMPT', 'register');
  logDebug('════════════════════════════════════════════', 'register');
  logDebug(`Email: ${email}`, 'register');
  logDebug(`Name: ${first_name} ${father_name}`, 'register');
  logDebug(`Address: ${address}`, 'register');
  logDebug(`Phone: ${phone}`, 'register');
  logDebug(`Passport: ${passport_reg_number || 'none'}`, 'register');
  
  // Validate input
  if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
    logDebug('Registration failed: Invalid email format', 'error');
    return res.status(400).send('Invalid email format');
  }
  if (!/^[А-Яа-яЁёӨөҮүҢңA-Za-z\s]+$/.test(father_name) || 
      !/^[А-Яа-яЁёӨөҮүҢңA-Za-z\s]+$/.test(first_name) || 
      !/^[А-Яа-яЁёӨөҮүҢңA-Za-z\s]+$/.test(address)) {
    logDebug('Registration failed: Invalid personal information format', 'error');
    return res.status(400).send('Personal information must be in Cyrillic or Latin');
  }

  try {
    // Check if email or phone already exists
    const { emailExists, phoneExists } = await checkUserExists(email, phone);
    
    if (emailExists) {
      logDebug('Registration failed: Email already registered', 'error');
      return res.status(400).send('Email already registered');
    }

    if (phoneExists) {
      logDebug('Registration failed: Phone number already registered', 'error');
      return res.status(400).send('Phone number already registered');
    }

    // Generate registration number
    const reg_number = await generateRegistrationNumber();
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    logDebug(`Hashed password: ${hashedPassword.substring(0, 20)}...`, 'encrypt');
    
    // Encrypt user data
    logDebug('Starting user data encryption...', 'encrypt');
    const encryptedEmail = encryptData(email, hashedPassword);
    const encryptedFatherName = encryptData(father_name, hashedPassword);
    const encryptedFirstName = encryptData(first_name, hashedPassword);
    const encryptedAddress = encryptData(address, hashedPassword);
    const encryptedPhone = encryptData(phone, hashedPassword);
    const encryptedRegNumber = encryptData(reg_number, hashedPassword);
    
    let encryptedPassportRegNumber = null;
    if (passport_reg_number && passport_reg_number.trim() !== '') {
      encryptedPassportRegNumber = encryptData(passport_reg_number, hashedPassword);
    }

    // Insert user into database
    logDebug('Inserting user into database', 'db');
    db.run(`INSERT INTO users 
      (email, password, father_name, first_name, address, phone, reg_number, passport_reg_number) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
      [encryptedEmail, hashedPassword, encryptedFatherName, encryptedFirstName, encryptedAddress, 
       encryptedPhone, encryptedRegNumber, encryptedPassportRegNumber], 
      function(err) {
        if (err) {
          logDebug(`Registration error: ${err.message}`, 'error');
          return res.status(500).send('Error saving user: ' + err.message);
        }
        logDebug(`User registered successfully with ID: ${this.lastID}, reg number: ${reg_number}`, 'success');
        logDebug('════════════════════════════════════════════', 'register');
        res.status(201).send(`User registered successfully with registration number: ${reg_number}`);
    });
  } catch (error) {
    logDebug(`Registration exception: ${error.message}`, 'error');
    return res.status(500).send('Error processing registration data');
  }
});

// Login endpoint
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  
  logDebug('════════════════════════════════════════════', 'login');
  logDebug('➤ NEW LOGIN ATTEMPT', 'login');
  logDebug('════════════════════════════════════════════', 'login');
  logDebug(`Email: ${email}`, 'login');

  db.all('SELECT * FROM users', (err, rows) => {
    if (err) {
      logDebug(`Login error: ${err.message}`, 'error');
      return res.status(500).send('Internal server error');
    }

    logDebug(`Found ${rows.length} users in database`, 'db');
    
    // Find user by email
    let user = null;
    for (const row of rows) {
      try {
        const decryptedEmail = decryptData(row.email, row.password);
        logDebug(`Checking user: ${decryptedEmail}`, 'login');
        if (decryptedEmail === email) {
          user = row;
          logDebug(`User found by email: ${email}`, 'success');
          break;
        }
      } catch (e) {
        logDebug(`Error decrypting email: ${e.message}`, 'error');
        continue;
      }
    }

    if (!user) {
      logDebug(`Login failed: User not found for email: ${email}`, 'error');
      logDebug('════════════════════════════════════════════', 'login');
      return res.status(400).send('Invalid email or password');
    }

    // Verify password
    logDebug('Verifying password', 'login');
    bcrypt.compare(password, user.password, (err, result) => {
      if (err || !result) {
        logDebug(`Login failed: Invalid password for email: ${email}`, 'error');
        logDebug('════════════════════════════════════════════', 'login');
        return res.status(400).send('Invalid email or password');
      }

      logDebug(`Login successful for email: ${email}`, 'success');
      try {
        // Decrypt user data
        logDebug('Decrypting user data', 'decrypt');
        const userData = {
          email: decryptData(user.email, user.password),
          father_name: decryptData(user.father_name, user.password),
          first_name: decryptData(user.first_name, user.password),
          address: decryptData(user.address, user.password),
          phone: decryptData(user.phone, user.password),
          reg_number: decryptData(user.reg_number, user.password),
        };
        
        if (user.passport_reg_number) {
          try {
            userData.passport_reg_number = decryptData(user.passport_reg_number, user.password);
          } catch (e) {
            logDebug(`Error decrypting passport number: ${e.message}`, 'error');
          }
        }

        logDebug('User data decrypted successfully', 'success');
        logDebug('════════════════════════════════════════════', 'login');
        res.status(200).json(userData);
      } catch (e) {
        logDebug(`Login error processing user data: ${e.message}`, 'error');
        logDebug('════════════════════════════════════════════', 'login');
        return res.status(500).send('Error processing user data');
      }
    });
  });
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logDebug('════════════════════════════════════════════', 'success');
  logDebug(`🚀 Server is running on port ${PORT}`, 'success');
  logDebug('════════════════════════════════════════════', 'success');
});

module.exports = {
  encryptData,
  decryptData,
  generateRegistrationNumber,
  checkUserExists
};