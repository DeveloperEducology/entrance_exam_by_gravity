const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

const uri = process.env.MONGODB_URI;

console.log('URI:', uri ? 'Loaded' : 'Missing');

async function run() {
    console.log('Connecting to DB...');
    const client = new MongoClient(uri);
    await client.connect();

    // Determine db name from URI or use default
    const db = client.db();

    const usersCol = db.collection('users');

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('Admin123!', salt);

    console.log('Creating Super Admin...');
    await usersCol.updateOne(
        { email: 'superadmin@wexls.com' },
        {
            $set: {
                id: 'sys-super-admin',
                name: 'Global Super Admin',
                email: 'superadmin@wexls.com',
                password_hash: hash,
                role: 'admin',
                status: 'active', // super admin needs no approval
                created_at: new Date()
            }
        },
        { upsert: true }
    );

    console.log('Creating School Admin...');
    await usersCol.updateOne(
        { email: 'schooladmin@wexls.com' },
        {
            $set: {
                id: 'sys-school-admin',
                name: 'Springfield High Principal',
                email: 'schooladmin@wexls.com',
                password_hash: hash,
                role: 'school_admin',
                status: 'active',
                created_at: new Date()
            }
        },
        { upsert: true }
    );

    console.log('Admins created successfully!');
    await client.close();
    process.exit(0);
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
