import { defineEventHandler, createError } from 'h3';
import { Transaction } from '~/server/models/transaction';
import { connectToDatabase } from '~/server/utils/db';
import { ObjectId } from 'mongodb';

export default defineEventHandler(async (event) => {
  try {
    // 连接数据库
    await connectToDatabase();
    
    // 从认证中间件获取用户ID
    const userId = event.context.user?.id;
    if (!userId) {
      throw createError({
        statusCode: 401,
        statusMessage: '未授权，请先登录',
      });
    }

    // 获取交易记录ID
    const id = event.context.params?.id;
    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: '缺少交易记录ID',
      });
    }

    // 验证ID格式
    if (!ObjectId.isValid(id)) {
      throw createError({
        statusCode: 400,
        statusMessage: '无效的交易记录ID',
      });
    }

    // 查找并删除交易记录
    const result = await Transaction.deleteOne({
      _id: new ObjectId(id),
      userId: userId
    });

    if (result.deletedCount === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: '交易记录不存在或无权删除',
      });
    }

    return {
      success: true,
      statusCode: 200,
      statusMessage: '删除成功',
      data: {
        id
      }
    };

  } catch (error: any) {
    console.error('删除交易记录错误:', error);
    
    if (error.statusCode) {
      throw error;
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: '删除交易记录失败',
    });
  }
});