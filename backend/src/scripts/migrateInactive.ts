import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { User } from '../models/user.model.js';
import { UserStatus } from '../common/constants/statuses.js';

async function main() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(env.MONGODB_URI);
  console.log('Connected.');

  console.log('Finding ACTIVE users who have never logged in (lastLoginAt is null)...');
  const result = await User.updateMany(
    { status: UserStatus.ACTIVE, lastLoginAt: { $exists: false } },
    { $set: { status: UserStatus.INACTIVE } }
  );
  
  const result2 = await User.updateMany(
    { status: UserStatus.ACTIVE, lastLoginAt: null },
    { $set: { status: UserStatus.INACTIVE } }
  );

  console.log(`Updated ${result.modifiedCount + result2.modifiedCount} users to INACTIVE.`);

  console.log('Done!');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
