import { BasicExpense } from '~/server/models/basicExpense';

// PUT 方法 - 更新基础消费
export default defineEventHandler(async (event) => {
  const method = event.method;
  const id = getRouterParam(event, 'id');

  // 处理 PUT 请求
  if (method === 'PUT') {
    try {
      const body = await readBody(event);
      
      // 确保有userId参数
      if (!body.userId) {
        return {
          success: false,
          message: '缺少用户ID参数'
        };
      }
      
      // 查找现有记录
      const existingRecord = await BasicExpense.findById(id);
      
      if (!existingRecord) {
        return {
          success: false,
          message: '未找到基础消费记录'
        };
      }
      
      // 准备更新数据 - 只使用提供的字段更新
      const updateData: any = {
        updatedAt: new Date()
      };
      
      // 检查各个可更新字段是否存在
      if (body.isActive !== undefined) updateData.isActive = body.isActive;
      if (body.amount !== undefined) updateData.amount = body.amount;
      if (body.description !== undefined) updateData.description = body.description;
      if (body.categoryId !== undefined) updateData.categoryId = body.categoryId;
      if (body.startDate !== undefined) updateData.startDate = new Date(body.startDate);
      if (body.endDate !== undefined) updateData.endDate = new Date(body.endDate);
      
      // 添加详细日志
      console.log('基础消费更新请求:', {
        id,
        body,
        updateData
      });
      
      // 更新记录
      const result = await BasicExpense.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true }
      );
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('更新基础消费错误:', {
        error,
        requestBody: body,
        id
      });
      
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