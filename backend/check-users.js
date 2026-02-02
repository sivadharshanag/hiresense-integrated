const mongoose = require('mongoose');
require('dotenv').config();

const userSchema = new mongoose.Schema({
  email: String,
  fullName: String,
  role: String,
  createdAt: Date
});

const User = mongoose.model('User', userSchema);

async function checkUsers() {
  try {
    // Check both databases
    const databases = [
      process.env.MONGODB_URI,
      process.env.MONGODB_URI.replace('/hiresense?', '/test?')
    ];
    
    for (const dbUri of databases) {
      const dbName = dbUri.includes('/test?') ? 'test' : 'hiresense';
      console.log(`\n🔍 Checking database: ${dbName}`);
      
      await mongoose.connect(dbUri);
      console.log('✅ Connected');
      
      const users = await User.find({}).select('email fullName role createdAt');
      console.log(`📊 Total users: ${users.length}`);
      
      if (users.length > 0) {
        console.log('\nUsers:');
        users.forEach((user, idx) => {
          console.log(`${idx + 1}. Email: ${user.email}`);
          console.log(`   Name: ${user.fullName}`);
          console.log(`   Role: ${user.role}`);
          console.log(`   Created: ${user.createdAt}\n`);
        });
      }
      
      await mongoose.connection.close();
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkUsers();
