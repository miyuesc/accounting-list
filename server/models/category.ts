import mongoose from 'mongoose';

// 定义账单类型字典模型的接口
export interface ICategory extends mongoose.Document {
  name: string;          // 类型名称
  parentId: mongoose.Schema.Types.ObjectId | null; // 父类型ID，顶级类型为null
  level: number;        // 层级，从1开始（1=一级类型，2=二级类型，以此类推）
  path: string;         // 类型路径，格式为"id1,id2,..."，用于快速查询层级关系
  type: string;         // 类型：income(收入) 或 expense(支出)
  createdAt: Date;
  updatedAt: Date;
}

// 定义账单类型字典模型的Schema
const categorySchema = new mongoose.Schema<ICategory>(
  {
    name: {
      type: String,
      required: [true, '类型名称是必需的'],
      trim: true,
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
    },
    level: {
      type: Number,
      required: true,
      min: 1,
      max: 3, // 最多支持3级分类
    },
    path: {
      type: String,
      required: false,
    },
    type: {
      type: String,
      enum: ['income', 'expense'],
      required: [true, '类型是必需的'],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // 自动添加 createdAt 和 updatedAt 字段
  }
);

// 保存前更新路径和层级
categorySchema.pre('save', async function(next) {
  try {
    // 如果是新文档或者父类型已更改
    if (this.isNew || this.isModified('parentId')) {
      // 如果有父类型，则更新路径和层级
      if (this.parentId) {
        const parentCategory = await mongoose.model<ICategory>('Category').findById(this.parentId);
        if (!parentCategory) {
          throw new Error('父类型不存在');
        }
        
        // 确保子类别与父类别的类型一致
        this.type = parentCategory.type;
        
        // 更新路径和层级
        this.path = parentCategory.path ? `${parentCategory.path},${this._id}` : `${this._id}`;
        this.level = parentCategory.level + 1;
      } else {
        // 顶级类型
        this.path = `${this._id}`;
        this.level = 1;
      }
    }
    next();
  } catch (error: any) {
    next(error);
  }
});

// 更新时自动更新updatedAt字段
categorySchema.pre('findOneAndUpdate', function() {
  this.set({ updatedAt: new Date() });
});

// 创建索引以优化查询
categorySchema.index({ parentId: 1 });
categorySchema.index({ level: 1 });
categorySchema.index({ path: 1 });
categorySchema.index({ type: 1 });

// 创建并导出账单类型字典模型
export const Category = mongoose.model<ICategory>('Category', categorySchema);