import mongoose from 'mongoose';
import { IUser } from './user';
import { ICategory } from './category';

// 定义基础消费配置模型的接口
export interface IBasicExpense extends mongoose.Document {
  userId: mongoose.Schema.Types.ObjectId;
  categoryId: mongoose.Schema.Types.ObjectId;
  amount: number;
  description: string;
  isActive: boolean;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

// 定义基础消费配置模型的Schema
const basicExpenseSchema = new mongoose.Schema<IBasicExpense>({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  description: {
    type: String,
    trim: true,
    default: '',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
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

// 创建索引以优化查询
basicExpenseSchema.index({ userId: 1 });
basicExpenseSchema.index({ categoryId: 1 });
basicExpenseSchema.index({ isActive: 1 });

// 创建并导出基础消费配置模型
export const BasicExpense = mongoose.model<IBasicExpense>('BasicExpense', basicExpenseSchema);