
import React from "react";
import { motion } from "framer-motion";
import { cn } from "../lib/utils";

interface DataTableProps<T> {
  data: T[];
  columns: {
    key: keyof T | string;
    header: string;
    render?: (row: T) => React.ReactNode;
    className?: string;
  }[];
  className?: string;
  rowHoverEffect?: boolean;
  onRowClick?: (row: T) => void;
}

function DataTable<T>({
  data,
  columns,
  className,
  rowHoverEffect = true,
  onRowClick,
}: DataTableProps<T>) {
  return (
    <div className={cn("w-full overflow-auto", className)}>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100 dark:bg-gray-800">
            {columns.map((column, index) => (
              <th
                key={index}
                className={cn(
                  "px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider",
                  column.className
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/30">
          {data.map((row, rowIndex) => (
            <motion.tr
              key={rowIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: rowIndex * 0.05, duration: 0.2 }}
              className={cn(
                rowHoverEffect && "hover:bg-secondary/20",
                onRowClick && "cursor-pointer"
              )}
              onClick={() => onRowClick && onRowClick(row)}
            >
              {columns.map((column, colIndex) => {
                const key = column.key as keyof T;
                return (
                  <td
                    key={colIndex}
                    className={cn("px-4 py-4 text-sm", column.className)}
                  >
                    {column.render
                      ? column.render(row)
                      : (row[key] as React.ReactNode)}
                  </td>
                );
              })}
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;
