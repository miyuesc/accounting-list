import { connectToDatabase } from '../utils/db';
import { Category } from '../models/category';
import { Transaction } from '../models/transaction';
import { User } from '../models/user';
import mongoose from 'mongoose';

/**
 * 迁移脚本：为现有类别添加用户ID
 * 
 * 此脚本会：
 * 1. 获取所有没有userId的类别
 * 2. 查找使用这些类别的交易记录，找出对应的用户ID
 * 3. 将类别与用户关联起来
 * 4. 如果一个类别被多个用户使用，为每个用户创建一个类别副本
 */
async function migrateCategories() {
  try {
    console.log('开始迁移类别数据...');
    
    // 连接数据库
    await connectToDatabase();
    
    // 找出所有没有userId的类别
    const categoriesToMigrate = await Category.find({
      $or: [
        { userId: { $exists: false } },
        { userId: null }
      ]
    });
    
    console.log(`找到 ${categoriesToMigrate.length} 个需要迁移的类别`);
    
    if (categoriesToMigrate.length === 0) {
      console.log('没有需要迁移的类别，退出');
      process.exit(0);
    }
    
    // 获取所有用户
    const users = await User.find({});
    
    if (users.length === 0) {
      console.log('没有找到用户，退出');
      process.exit(1);
    }
    
    console.log(`找到 ${users.length} 个用户`);
    
    // 为每个需要迁移的类别找到关联的用户
    for (const category of categoriesToMigrate) {
      console.log(`处理类别: ${category.name} (${category._id})`);
      
      // 查找使用此类别的交易记录
      const transactions = await Transaction.find({ categoryId: category._id });
      
      // 提取不同的用户ID
      const userIds = [...new Set(transactions.map(t => t.userId.toString()))];
      
      console.log(`类别 ${category.name} 被 ${userIds.length} 个用户使用`);
      
      if (userIds.length === 0) {
        // 如果没有交易使用此类别，分配给第一个用户
        console.log(`类别 ${category.name} 没有关联交易，分配给第一个用户`);
        
        category.userId = users[0]._id;
        await category.save();
      } else if (userIds.length === 1) {
        // 如果只有一个用户使用此类别，直接分配
        console.log(`类别 ${category.name} 只被一个用户使用，直接分配`);
        
        category.userId = new mongoose.Types.ObjectId(userIds[0]);
        await category.save();
      } else {
        // 如果多个用户使用此类别，为每个用户创建副本
        console.log(`类别 ${category.name} 被多个用户使用，创建副本`);
        
        // 首先，将原类别分配给第一个用户
        category.userId = new mongoose.Types.ObjectId(userIds[0]);
        await category.save();
        
        // 然后，为其他用户创建副本
        for (let i = 1; i < userIds.length; i++) {
          const userId = userIds[i];
          
          // 创建类别副本
          const categoryCopy = new Category({
            name: category.name,
            type: category.type,
            level: category.level,
            parentId: category.parentId,
            userId: new mongoose.Types.ObjectId(userId)
          });
          
          await categoryCopy.save();
          
          console.log(`为用户 ${userId} 创建了类别 ${category.name} 的副本`);
          
          // 更新此用户的交易记录以使用新类别
          await Transaction.updateMany(
            { userId: userId, categoryId: category._id },
            { $set: { categoryId: categoryCopy._id } }
          );
        }
      }
    }
    
    console.log('类别迁移完成！');
    process.exit(0);
  } catch (error) {
    console.error('迁移过程中出错:', error);
    process.exit(1);
  }
}

// 运行迁移
migrateCategories(); 