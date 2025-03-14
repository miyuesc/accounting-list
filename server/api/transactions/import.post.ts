import { defineEventHandler, readMultipartFormData, createError, H3Error } from 'h3';
// 采用动态导入方式避免类型问题
// import { read, utils } from 'xlsx';
import { connectToDatabase } from '~/server/utils/db';
import { Transaction } from '~/server/models/transaction';
import { Category } from '~/server/models/category';
import { Types } from 'mongoose';
import dayjs from 'dayjs';

// 定义类型接口
interface CategoryMapItem {
  id: any; // 使用any来处理不同类型的ObjectId兼容性问题
  name: string;
  type: string;
  parentId: any | null;
}

interface ImportError {
  row: number;
  message: string;
  data: string;
}

interface ImportResults {
  succeeded: number;
  failed: number;
  errors: ImportError[];
}

export default defineEventHandler(async (event) => {
  try {
    // 验证用户身份
    const userId = event.context.user?.id;
    if (!userId) {
      throw createError({
        statusCode: 401,
        statusMessage: '未授权，请先登录',
      });
    }

    // 读取上传的文件
    const formData = await readMultipartFormData(event);
    if (!formData || formData.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: '未找到上传的文件',
      });
    }

    // 获取Excel文件
    const fileField = formData.find(field => field.name === 'file');
    if (!fileField || !fileField.data) {
      throw createError({
        statusCode: 400,
        statusMessage: '未找到有效的Excel文件',
      });
    }

    // 动态导入xlsx库
    const xlsx = await import('xlsx');
    
    // 解析Excel文件
    const workbook = xlsx.read(fileField.data);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(worksheet, { header: 1, raw: false });

    // 连接数据库
    await connectToDatabase();

    // 验证表头
    if (rows.length < 2) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Excel文件格式不正确，至少需要一个标题行和一行数据',
      });
    }

    // 获取表头行并标准化
    const headers = (rows[0] as any[]).map((header: any) => String(header).trim());
    
    // 确定必要列的索引
    const typeIndex = headers.findIndex((h: string) => h.includes('收入') || h.includes('支出') || h.toLowerCase().includes('type'));
    const amountIndex = headers.findIndex((h: string) => h.includes('金额') || h.toLowerCase().includes('amount'));
    const dateIndex = headers.findIndex((h: string) => h.includes('日期') || h.toLowerCase().includes('date'));
    const parentCategoryIndex = headers.findIndex((h: string) => h.includes('父级类别') || h.includes('父类别') || h.toLowerCase().includes('parent category'));
    const childCategoryIndex = headers.findIndex((h: string) => h.includes('子级类别') || h.includes('子类别') || h.toLowerCase().includes('child category'));
    const descriptionIndex = headers.findIndex((h: string) => h.includes('备注') || h.includes('描述') || h.toLowerCase().includes('description'));

    // 验证必要列是否存在
    if (typeIndex === -1 || amountIndex === -1 || dateIndex === -1 || parentCategoryIndex === -1) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Excel文件格式不正确，缺少必要的列（收入/支出、金额、日期、父级类别）',
      });
    }

    // 获取用户已有的类别
    const existingCategories = await Category.find({ userId }).lean();
    const categoryMap = new Map<string, CategoryMapItem>();
    
    // 构建类别映射，优先使用名称的精确匹配
    existingCategories.forEach(category => {
      // 将类别名称（去除空格）作为键
      const normName = category.name.trim().toLowerCase();
      categoryMap.set(normName, {
        id: category._id,
        name: category.name,
        type: category.type,
        parentId: category.parentId
      });
    });

    // 处理数据行
    const results: ImportResults = {
      succeeded: 0,
      failed: 0,
      errors: []
    };

    // 从第二行开始处理（跳过表头）
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i] as any[];
      
      try {
        // 跳过空行
        if (!row || row.length === 0 || !row[typeIndex]) {
          continue;
        }

        // 解析基本数据
        const typeValue = String(row[typeIndex] || '').trim();
        const type = typeValue === '收入' ? 'income' : typeValue === '支出' ? 'expense' : typeValue.toLowerCase();
        
        // 验证交易类型
        if (type !== 'income' && type !== 'expense') {
          throw new Error(`交易类型无效，必须是"收入"或"支出"，当前值: ${typeValue}`);
        }

        // 解析金额
        const amountValue = row[amountIndex];
        const amount = parseFloat(String(amountValue).replace(/,/g, ''));
        if (isNaN(amount) || amount <= 0) {
          throw new Error(`金额无效，必须是大于0的数值，当前值: ${amountValue}`);
        }

        // 解析日期
        let transactionDate: Date;
        const dateValue = row[dateIndex];
        try {
          // 尝试多种方式解析日期
          if (typeof dateValue === 'number') {
            // Excel日期是自1900年1月1日起的天数，需要转换
            const excelEpoch = new Date(1900, 0, 1);
            excelEpoch.setDate(excelEpoch.getDate() + dateValue - 2); // Excel bug: 认为1900是闰年
            transactionDate = excelEpoch;
          } else {
            transactionDate = dayjs(String(dateValue)).toDate();
          }
          
          // 验证日期是否有效
          if (isNaN(transactionDate.getTime())) {
            throw new Error();
          }
          
          // 只保留年月日
          transactionDate = dayjs(transactionDate).startOf('day').toDate();
        } catch (e) {
          throw new Error(`日期格式无效，当前值: ${dateValue}`);
        }

        // 解析父级类别
        const parentCategoryName = String(row[parentCategoryIndex] || '').trim();
        if (!parentCategoryName) {
          throw new Error('父级类别不能为空');
        }

        // 解析子级类别（可选）
        const childCategoryName = childCategoryIndex >= 0 ? String(row[childCategoryIndex] || '').trim() : '';

        // 解析备注（可选）
        const description = descriptionIndex >= 0 ? String(row[descriptionIndex] || '').trim() : '';

        // 处理类别逻辑
        let categoryId: any; // 使用any类型来处理不同类型的ObjectId
        
        // 标准化类别名称
        const normParentName = parentCategoryName.toLowerCase();
        const normChildName = childCategoryName.toLowerCase();
        
        // 查找或创建所需的类别
        if (childCategoryName) {
          // 存在子级类别的情况
          const fullCategoryName = `${normParentName}/${normChildName}`;
          
          // 检查子类别是否已存在
          if (categoryMap.has(normChildName)) {
            // 子类别存在，直接使用
            categoryId = categoryMap.get(normChildName)!.id;
          } else {
            // 子类别不存在，需要先查找或创建父类别
            let parentCategoryId: any;
            
            if (categoryMap.has(normParentName)) {
              // 父类别存在
              parentCategoryId = categoryMap.get(normParentName)!.id;
            } else {
              // 创建父类别
              const newParentCategory = new Category({
                userId,
                name: parentCategoryName,
                type,
                level: 1
              });
              
              await newParentCategory.save();
              
              // 更新映射
              parentCategoryId = newParentCategory._id;
              categoryMap.set(normParentName, {
                id: parentCategoryId,
                name: parentCategoryName,
                type,
                parentId: null
              });
            }
            
            // 创建子类别
            const newChildCategory = new Category({
              userId,
              name: childCategoryName,
              type,
              level: 2,
              parentId: parentCategoryId
            });
            
            await newChildCategory.save();
            
            // 更新映射
            categoryId = newChildCategory._id;
            categoryMap.set(normChildName, {
              id: categoryId,
              name: childCategoryName,
              type,
              parentId: parentCategoryId
            });
          }
        } else {
          // 只有父级类别的情况
          if (categoryMap.has(normParentName)) {
            // 类别已存在
            categoryId = categoryMap.get(normParentName)!.id;
          } else {
            // 创建新类别
            const newCategory = new Category({
              userId,
              name: parentCategoryName,
              type,
              level: 1
            });
            
            await newCategory.save();
            
            // 更新映射
            categoryId = newCategory._id;
            categoryMap.set(normParentName, {
              id: categoryId,
              name: parentCategoryName,
              type,
              parentId: null
            });
          }
        }

        // 创建交易记录
        const transaction = new Transaction({
          userId,
          categoryId,
          amount,
          description: description,
          transactionDate,
          type
        });

        await transaction.save();
        results.succeeded++;
      } catch (error: any) {
        results.failed++;
        
        // 收集错误信息
        results.errors.push({
          row: i + 1, // 行号从1开始计数
          message: error.message || '数据处理错误',
          data: Array.isArray(row) ? row.join(', ') : String(row)
        });
      }
    }

    return {
      success: true,
      data: results
    };
  } catch (error: any) {
    console.error('导入Excel交易记录错误:', error);
    
    // 判断是否已经是HTTP错误
    if ((error as H3Error).statusCode) {
      throw error;
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: error.message || '导入Excel文件时发生错误',
    });
  }
}); 