import mongoose from 'mongoose';
import { User } from '../models/user.model.js';
import { Role } from '../common/constants/roles.js';

import { env } from '../config/env.js';

async function migrate() {
  try {
    await mongoose.connect(env.MONGODB_URI);
    
    // Tìm các STUDENT chưa bao giờ đăng nhập (lastLoginAt không tồn tại hoặc null)
    const result = await User.updateMany(
      { 
        role: Role.STUDENT,
        $or: [{ lastLoginAt: { $exists: false } }, { lastLoginAt: null }]
      },
      { $set: { forcePasswordChange: true } }
    );
    
    console.log(`Đã cập nhật forcePasswordChange: true cho ${result.modifiedCount} tài khoản sinh viên.`);
    process.exit(0);
  } catch (error) {
    console.error('Lỗi khi migrate:', error);
    process.exit(1);
  }
}

migrate();
