import { defineEventHandler, createError } from 'h3';
import { Category } from '~/server/models/category';
import { Transaction } from '~/server/models/transaction';
import { connectToDatabase } from '~/server/utils/db';

export default defineEventHandler(async (event) => {
  try {
    // 连接数据库
    await connectToDatabase();
    
    // 获取类别ID
    const id = event.context.params?.id;
    
    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: '类别ID是必需的',
      });
    }
    
    // 查找类别
    const category = await Category.findById(id);
    
    if (!category) {
      throw createError({
        statusCode: 404,
        statusMessage: '类别不存在',
      });
    }
    
    // 检查是否有子类别
    const childCategories = await Category.findOne({ parentId: id });
    
    if (childCategories) {
      throw createError({
        statusCode: 400,
        statusMessage: '无法删除有子类别的类别，请先删除所有子类别',
      });
    }
    
    // 检查是否有关联的交易记录
    const transactions = await Transaction.findOne({ categoryId: id });
    
    if (transactions) {
      throw createError({
        statusCode: 400,
        statusMessage: '无法删除有关联交易记录的类别',
      });
    }
    
    // 删除类别
    await Category.findByIdAndDelete(id);
    
    return {
      success: true,
      message: '类别已成功删除',
    };
  } catch (error: any) {
    console.error('删除类别错误:', error);
    
    if (error.statusCode) {
      throw error;
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: '删除类别时发生错误',
    });
  }
}); 