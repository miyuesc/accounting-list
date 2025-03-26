import { watchEffect } from 'vue';

export const useTheme = () => {
  const isDark = useState('theme', () => false);

  // 监听系统主题变化
  const watchSystemTheme = () => {
    if (process.client) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const updateTheme = (e: MediaQueryListEvent | MediaQueryList) => {
        isDark.value = e.matches;
        applyTheme(e.matches);
      };
      
      // 初始检查
      updateTheme(mediaQuery);
      
      // 监听变化
      mediaQuery.addEventListener('change', updateTheme);
      
      // 清理函数
      return () => mediaQuery.removeEventListener('change', updateTheme);
    }
  };

  // 应用主题
  const applyTheme = (dark: boolean) => {
    if (process.client) {
      document.documentElement.classList.toggle('dark', dark);
    }
  };

  // 切换主题
  const toggleTheme = () => {
    isDark.value = !isDark.value;
    applyTheme(isDark.value);
  };

  // 设置主题
  const setTheme = (dark: boolean) => {
    isDark.value = dark;
    applyTheme(dark);
  };

  // 在客户端初始化时监听系统主题
  if (process.client) {
    watchSystemTheme();
  }

  // 监听主题变化
  watchEffect(() => {
    applyTheme(isDark.value);
  });

  return {
    isDark,
    toggleTheme,
    setTheme,
  };
}; 