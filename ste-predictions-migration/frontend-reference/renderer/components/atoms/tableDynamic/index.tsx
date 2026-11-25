import React from 'react';
import { TableDynamicProps, ColumnDefinition } from './types';

interface TableHeaderProps<T> {
  columns: ColumnDefinition<T>[];
}

const TableHeader = <T extends Record<string, any>>({ columns }: TableHeaderProps<T>): JSX.Element => {
  return (
    <thead>
      <tr className="bg-dark_green text-light_green">
        {columns.map((column, index) => {
          const alignmentClass = column.align === 'center' 
            ? 'text-center' 
            : column.align === 'right' 
            ? 'text-right' 
            : 'text-left';
          
          return (
            <th 
              key={`header-${column.key}-${index}`}
              scope="col"
              className={`px-4 py-3 ${alignmentClass} font-medium`}
              style={{ width: column.width }}
            >
              {column.renderHeader ? column.renderHeader() : column.header}
            </th>
          );
        })}
      </tr>
    </thead>
  );
};

export const TableDynamic = <T extends Record<string, any>>({
  columns,
  data,
  className = '',
  striped = true,
  bordered = false,
  hoverable = true,
  emptyMessage = 'Nenhum dado disponível'
}: TableDynamicProps<T>): JSX.Element => {

  if (data.length === 0) {
    return (
      <div className={`w-full overflow-x-auto ${className}`}>
        <table className="w-full font-poppins rounded-lg overflow-hidden">
          <TableHeader columns={columns} />
          <tbody>
            <tr>
              <td 
                colSpan={columns.length}
                className="px-4 py-8 text-center text-dark_green bg-white"
              >
                {emptyMessage}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }
  
  return (
    <div className={`w-full overflow-x-auto ${className}`}>
      <table className="w-full font-poppins rounded-lg overflow-hidden">
        <TableHeader columns={columns} />
        <tbody>
          {data.map((row, rowIndex) => {
            const isEvenRow = rowIndex % 2 === 0;
            const rowClasses = [
              'transition-colors',
              striped 
                ? (isEvenRow ? 'bg-white' : 'bg-[var(--color-light_green)]')
                : 'bg-white',
              hoverable ? 'hover:bg-[var(--color-light_green)]/50' : ''
            ].filter(Boolean).join(' ');
            
            return (
              <tr key={`row-${rowIndex}`} className={rowClasses}>
                {columns.map((column, colIndex) => {
                  const alignmentClass = column.align === 'center' 
                    ? 'text-center' 
                    : column.align === 'right' 
                    ? 'text-right' 
                    : 'text-left';
                  
                  // Usar a função render se existir, caso contrário usar o valor direto
                  const cellContent = column.render 
                    ? column.render(row[column.key], row, rowIndex)
                    : row[column.key];
                  
                  return (
                    <td 
                      key={`cell-${rowIndex}-${column.key}-${colIndex}`}
                      className={`px-4 py-3 ${alignmentClass} text-dark_green ${
                        bordered ? 'border border-gray-200' : ''
                      } ${column.cellClassName || ''}`}
                    >
                      {cellContent}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default TableDynamic;