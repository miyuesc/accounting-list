import { BasicExpense } from '~/server/models/basicExpense';

// PUT 方法 - 更新基础消费
export default defineEventHandler(async (event) => {
  const method = event.method;
  const id = getRouterParam(event, 'id');

  // 处理 PUT 请求
  if (method === 'PUT') {
    try {
      const body = await readBody(event);
      
      // 数据验证
      if (!body.categoryId || body.amount === undefined) {
        return {
          success: false,
          message: '缺少必要参数'
        };
      }
      
      // 更新数据库记录
      const result = await BasicExpense.findByIdAndUpdate(
        id, 
        { ...body, updatedAt: new Date() },
        { new: true }
      );
      
      if (!result) {
        return {
          success: false,
          message: '未找到基础消费记录'
        };
      }
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('更新基础消费错误:', error);
      return {
        success: false,
        message: error.message || '更新基础消费失败'
      };
    }
  }
  
  // 处理 DELETE 请求
  if (method === 'DELETE') {
    try {
      const result = await BasicExpense.findByIdAndDelete(id);
      
      if (!result) {
        return {
          success: false,
          message: '未找到基础消费记录'
        };
      }
      
      return {
        success: true,
        message: '成功删除基础消费记录'
      };
    } catch (error) {
      console.error('删除基础消费错误:', error);
      return {
        success: false,
        message: error.message || '删除基础消费失败'
      };
    }
  }
  
  // 如果不是 PUT 或 DELETE 请求，返回错误
  return {
    success: false,
    message: '不支持的请求方法'
  };
}); 