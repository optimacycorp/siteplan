import { Button } from "@/components/ui/Button";

import styles from "./LayoutComparisonTable.module.css";

export type LayoutComparisonRow = {
  id: string;
  name: string;
  lots: number;
  efficiency: number;
  units: number;
  roi?: number | null;
  selected?: boolean;
};

type LayoutComparisonTableProps = {
  rows: LayoutComparisonRow[];
  onSelect?: (id: string) => void;
};

export function LayoutComparisonTable({ rows, onSelect }: LayoutComparisonTableProps) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Layout</th>
            <th>Lots</th>
            <th>Efficiency</th>
            <th>Units</th>
            <th>ROI</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr className={row.selected ? styles.rowSelected : ""} key={row.id}>
              <td>{row.name}</td>
              <td>{row.lots}</td>
              <td>{row.efficiency.toFixed(1)}%</td>
              <td>{row.units}</td>
              <td>{row.roi != null ? `${row.roi.toFixed(1)}%` : "Pending"}</td>
              <td>
                <Button onClick={() => onSelect?.(row.id)} type="button" variant={row.selected ? "secondary" : "ghost"}>
                  {row.selected ? "Selected" : "Use layout"}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
