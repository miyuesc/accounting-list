import mongoose from 'mongoose';
import { IUser } from './user';
import { ICategory } from './category';

// 定义交易类型枚举
export enum TransactionType {
  EXPENSE = 'expense', // 支出
  INCOME = 'income',   // 收入
}

// 定义账单记录模型的接口
export interface ITransaction extends mongoose.Document {
  userId: mongoose.Schema.Types.ObjectId;
  categoryId: mongoose.Schema.Types.ObjectId;
  amount: number;
  description: string;
  transactionDate: Date;
  type: 'income' | 'expense';
  createdAt: Date;
  updatedAt: Date;
}

// 定义账单记录模型的Schema
const transactionSchema = new mongoose.Schema<ITransaction>({
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
  },
  description: {
    type: String,
    trim: true,
    default: '',
  },
  transactionDate: {
    type: Date,
    required: true,
    default: Date.now,
  },
  type: {
    type: String,
    enum: ['income', 'expense'],
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
transactionSchema.index({ userId: 1 });
transactionSchema.index({ categoryId: 1 });
transactionSchema.index({ transactionDate: 1 });
transactionSchema.index({ type: 1 });

// 创建并导出账单记录模型
export const Transaction = mongoose.model<ITransaction>('Transaction', transactionSchema);