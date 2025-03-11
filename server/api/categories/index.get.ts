import { defineEventHandler, getQuery, createError } from 'h3';
import { Category } from '~/server/models/category';
import { connectToDatabase } from '~/server/utils/db';

// 树形结构类别类型
interface TreeCategory {
  _id: string;
  name: string;
  level: number;
  type: string;
  children?: TreeCategory[];
  parentId?: string | null;
}

// 将列表转换为树形结构
const buildCategoryTree = (categories: any[]): TreeCategory[] => {
  const categoryMap = new Map<string, TreeCategory>();
  const rootCategories: TreeCategory[] = [];
  
  // 首先创建所有节点的映射
  categories.forEach(category => {
    categoryMap.set(category._id.toString(), {
      _id: category._id.toString(),
      name: category.name,
      level: category.level,
      type: category.type,
      children: [],
      parentId: category.parentId ? category.parentId.toString() : null
    });
  });
  
  // 构建树形结构
  categories.forEach(category => {
    const categoryId = category._id.toString();
    const categoryNode = categoryMap.get(categoryId);
    
    if (category.parentId) {
      // 如果有父节点，将当前节点添加到父节点的子节点列表中
      const parentId = category.parentId.toString();
      const parentNode = categoryMap.get(parentId);
      
      if (parentNode) {
        if (!parentNode.children) {
          parentNode.children = [];
        }
        parentNode.children.push(categoryNode!);
      }
    } else {
      // 如果没有父节点，则是根节点
      rootCategories.push(categoryNode!);
    }
  });
  
  return rootCategories;
};

export default defineEventHandler(async (event) => {
  try {
    // 连接数据库
    await connectToDatabase();
    
    // 获取查询参数
    const query = getQuery(event);
    const level = query.level ? parseInt(query.level as string) : undefined;
    const parentId = query.parentId as string;
    const type = query.type as string;  // 收入或支出类型
    const treeView = query.treeView === 'true';  // 是否返回树形结构
    
    // 构建查询条件
    const filter: any = {};
    
    if (level !== undefined) {
      filter.level = level;
    }
    
    if (type && (type === 'income' || type === 'expense')) {
      filter.type = type;
    }
    
    if (parentId) {
      filter.parentId = parentId;
    } else if (parentId === '') {
      // 如果parentId为空字符串，查询顶级类别
      filter.parentId = null;
    }
    
    // 查询类别列表
    let categories;
    
    if (treeView) {
      // 如果是树形视图，需要查询所有类别
      // 为了构建完整的树，我们需要忽略 level 和 parentId 过滤条件
      const treeFilter = { ...filter };
      delete treeFilter.level;
      delete treeFilter.parentId;
      
      categories = await Category.find(treeFilter).sort({ type: 1, name: 1 });
      
      // 将列表转换为树形结构
      const categoryTree = buildCategoryTree(categories);
      
      return {
        success: true,
        data: categoryTree,
      };
    } else {
      // 普通列表视图
      categories = await Category.find(filter).sort({ name: 1 });
      
      return {
        success: true,
        data: categories,
      };
    }
  } catch (error: any) {
    console.error('获取类别列表错误:', error);
    throw createError({
      statusCode: 500,
      statusMessage: '获取类别列表时发生错误',
    });
  }
});