import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

// 定义用户模型的接口
export interface IUser extends mongoose.Document {
  username: string;
  password: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// 定义用户模型的Schema
const userSchema = new mongoose.Schema<IUser>({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  name: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// 保存前对密码进行哈希处理
userSchema.pre('save', async function(next) {
  // 只有在密码被修改时才重新哈希
  if (!this.isModified('password')) return next();
  
  try {
    // 生成盐并哈希密码
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// 添加比较密码的方法
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// 创建并导出用户模型
export const User = mongoose.model<IUser>('User', userSchema);