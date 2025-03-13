const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to the database
const db = new sqlite3.Database(path.join(__dirname, 'database.sqlite'));

// Query all tables
db.all(`SELECT name FROM sqlite_master WHERE type='table'`, [], (err, rows) => {
  if (err) {
    console.error('Error querying database tables:', err);
  } else {
    console.log('Tables in database:');
    console.log(rows);
  }
  
  db.close();
}); 