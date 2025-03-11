import { defineNuxtPlugin } from 'nuxt/app';
import tailwindConfig from '~/tailwind.config.js';

export default defineNuxtPlugin(() => {
  // 安全地访问颜色配置
  const colors = tailwindConfig?.theme?.extend?.colors || {};
  
  return {
    provide: {
      tailwindColors: colors,
    },
  };
}); 