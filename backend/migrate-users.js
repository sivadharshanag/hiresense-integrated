const mongoose = require('mongoose');
require('dotenv').config();

async function migrateUsers() {
  try {
    // Connect to TEST database
    const testUri = process.env.MONGODB_URI.replace('/hiresense?', '/test?');
    console.log('🔍 Connecting to TEST database...');
    await mongoose.connect(testUri);
    
    // Get all collections from test database
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    console.log(`✅ Found ${collectionNames.length} collections in TEST database`);
    console.log('Collections:', collectionNames.join(', '));
    
    // Copy all collections
    const data = {};
    for (const collName of collectionNames) {
      const coll = mongoose.connection.db.collection(collName);
      const docs = await coll.find({}).toArray();
      data[collName] = docs;
      console.log(`📦 Copied ${docs.length} documents from ${collName}`);
    }
    
    await mongoose.connection.close();
    console.log('✅ TEST database closed\n');
    
    // Connect to HIRESENSE database
    console.log('🔍 Connecting to HIRESENSE database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to HIRESENSE database\n');
    
    // Insert data into hiresense database
    for (const [collName, docs] of Object.entries(data)) {
      if (docs.length > 0) {
        const coll = mongoose.connection.db.collection(collName);
        // Check if collection already has data
        const existingCount = await coll.countDocuments();
        
        if (existingCount > 0) {
          console.log(`⚠️  ${collName}: Already has ${existingCount} documents, clearing first...`);
          await coll.deleteMany({});
        }
        
        await coll.insertMany(docs);
        console.log(`✅ Inserted ${docs.length} documents into ${collName}`);
      }
    }
    
    console.log('\n🎉 Migration complete!');
    console.log('All data from TEST database has been copied to HIRESENSE database\n');
    
    // Show user count
    const users = mongoose.connection.db.collection('users');
    const userCount = await users.countDocuments();
    console.log(`👥 Total users in HIRESENSE database: ${userCount}`);
    
    const userList = await users.find({}).project({ email: 1, role: 1, fullName: 1 }).toArray();
    console.log('\nUsers:');
    userList.forEach((user, idx) => {
      console.log(`${idx + 1}. ${user.email} (${user.role}) - ${user.fullName}`);
    });
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

migrateUsers();
