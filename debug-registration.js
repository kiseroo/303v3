const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

/**
 * ENHANCED CONSOLE LOGGING
 * For better visibility and organization of important information
 */
const logDebug = (message, type = 'info') => {
  const timestamp = new Date().toLocaleTimeString();
  let icon = '📋';
  let color = '\x1b[32m'; // Default neon green
  
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
    case 'test':
      icon = '🧪';
      break;
    case 'db':
      icon = '💾';
      break;
  }
  
  console.log(`${color}[${timestamp}] ${icon}  ${message}\x1b[0m`);
};

// Helper function to encrypt data
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

// Connect to the database
const db = new sqlite3.Database(path.join(__dirname, 'database.sqlite'));
logDebug('════════════════════════════════════════════', 'test');
logDebug('➤ TEST USER CREATION STARTED', 'test');
logDebug('════════════════════════════════════════════', 'test');
logDebug('Connected to database', 'db');

// Test data
const testUser = {
  email: 'test@example.com',
  password: 'password123',
  father_name: 'TestFather',
  first_name: 'TestUser',
  address: 'Test Address',
  phone: '1234567890',
  passport_reg_number: 'TEST123'
};

logDebug('Creating test user with following details:', 'test');
Object.entries(testUser).forEach(([key, value]) => {
  logDebug(`  ${key.padEnd(20, ' ')}: ${value}`, 'test');
});

// Generate a registration number
db.get('SELECT COUNT(*) as count FROM users', [], (err, row) => {
  if (err) {
    logDebug(`Error generating registration number: ${err.message}`, 'error');
    return;
  }
    
  // Create a new registration number
  const count = row ? row.count + 1 : 1;
  const reg_number = `#${count}`;
  
  logDebug(`Generated registration number: ${reg_number}`, 'db');

  // Hash the password
  bcrypt.hash(testUser.password, 10, (err, hashedPassword) => {
    if (err) {
      logDebug(`Error hashing password: ${err.message}`, 'error');
      return;
    }

    logDebug(`Password hashed successfully: ${hashedPassword.substring(0, 20)}...`, 'encrypt');

    try {
      // Encrypt user data
      logDebug('┌─ Starting user data encryption...', 'encrypt');
      const encryptedEmail = encryptData(testUser.email, hashedPassword);
      const encryptedFatherName = encryptData(testUser.father_name, hashedPassword);
      const encryptedFirstName = encryptData(testUser.first_name, hashedPassword);
      const encryptedAddress = encryptData(testUser.address, hashedPassword);
      const encryptedPhone = encryptData(testUser.phone, hashedPassword);
      const encryptedRegNumber = encryptData(reg_number, hashedPassword);
      
      // Handle passport_reg_number carefully
      let encryptedPassportRegNumber = null;
      if (testUser.passport_reg_number) {
        encryptedPassportRegNumber = encryptData(testUser.passport_reg_number, hashedPassword);
      }

      logDebug('└─ All user data encrypted successfully', 'success');
      
      // Insert the test user into the database
      logDebug('Preparing to insert test user into database', 'db');
      const stmt = db.prepare(`INSERT INTO users (
        email, password, father_name, first_name, address, phone, reg_number, passport_reg_number
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
      
      stmt.run(
        encryptedEmail,
        hashedPassword,
        encryptedFatherName,
        encryptedFirstName,
        encryptedAddress,
        encryptedPhone,
        encryptedRegNumber,
        encryptedPassportRegNumber,
        function(err) {
          if (err) {
            logDebug(`Error inserting user: ${err.message}`, 'error');
          } else {
            logDebug(`Test user inserted successfully with ID: ${this.lastID}`, 'success');
            logDebug(`Registration number: ${reg_number}`, 'success');
            logDebug('User data stored in database:', 'db');
            logDebug(`  ID               : ${this.lastID}`, 'db');
            logDebug(`  Email (encrypted): ${encryptedEmail.substring(0, 30)}...`, 'encrypt');
            logDebug(`  Father (encrypted): ${encryptedFatherName.substring(0, 30)}...`, 'encrypt');
            logDebug(`  Name (encrypted) : ${encryptedFirstName.substring(0, 30)}...`, 'encrypt');
            logDebug(`  Reg# (encrypted) : ${encryptedRegNumber.substring(0, 30)}...`, 'encrypt');
          }
          
          stmt.finalize();
          logDebug('Database statement finalized', 'db');
          db.close();
          logDebug('Database connection closed', 'db');
          logDebug('════════════════════════════════════════════', 'test');
          logDebug('➤ TEST USER CREATION COMPLETED', 'success');
          logDebug('════════════════════════════════════════════', 'test');
        }
      );
    } catch (error) {
      logDebug(`Error during encryption or insertion: ${error.message}`, 'error');
      db.close();
      logDebug('Database connection closed due to error', 'error');
      logDebug('════════════════════════════════════════════', 'error');
      logDebug('➤ TEST USER CREATION FAILED', 'error');
      logDebug('════════════════════════════════════════════', 'error');
    }
  });
});