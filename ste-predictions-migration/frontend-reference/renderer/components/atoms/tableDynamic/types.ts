
export interface ColumnDefinition<T = any> {
  
  key: string;

  header: string;

  width?: string;

  align?: 'left' | 'center' | 'right';
  
  
  render?: (value: any, row: T, rowIndex: number) => React.ReactNode;
  
  
  renderHeader?: () => React.ReactNode;
  

  headerClassName?: string;
  

  cellClassName?: string;
  
  
  wrap?: boolean;
  

  truncate?: boolean;
}


export interface TableDynamicProps<T = any> {

  columns: ColumnDefinition<T>[];

  data: T[];

  className?: string;

  striped?: boolean;

  bordered?: boolean;

  hoverable?: boolean;
  

  emptyMessage?: string;
 
  stickyHeader?: boolean;
  

  maxHeight?: string;
}

export type { ActionButtonProps } from './ActionButton';
export type { StatusBadgeProps } from './StatusBadge';
export type { ContextMenuProps, ContextMenuAction } from './ContextMenu';
