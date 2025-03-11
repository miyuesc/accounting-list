declare module 'dayjs' {
  interface Dayjs {
    format(template?: string): string;
    startOf(unit: string): Dayjs;
    endOf(unit: string): Dayjs;
    year(year?: number): Dayjs;
    toDate(): Date;
  }

  interface DayjsStatic {
    (date?: any): Dayjs;
    extend(plugin: any, option?: any): void;
  }

  const dayjs: DayjsStatic;
  export = dayjs;
}

declare module 'dayjs/plugin/weekOfYear' {
  const plugin: any;
  export = plugin;
}

declare module 'dayjs/plugin/quarterOfYear' {
  const plugin: any;
  export = plugin;
} 