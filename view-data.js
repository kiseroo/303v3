const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to the database
const db = new sqlite3.Database(path.join(__dirname, 'database.sqlite'));

// Query all users
db.all(`SELECT * FROM users`, [], (err, rows) => {
  if (err) {
    console.error('Error querying database:', err);
  } else {
    console.log('Users data:');
    console.log(JSON.stringify(rows, null, 2));
    console.log(`Total records: ${rows.length}`);
  }
  
  db.close();
}); 