import type { Kewajiban } from './types';
import { fmt } from './utils';

interface TableFooterProps {
  dataLength: number;
  filteredData: Kewajiban[];
}

export default function TableFooter({ dataLength, filteredData }: TableFooterProps) {
  if (filteredData.length === 0) return null;

  return (
    <div className="mt-3 flex items-center justify-between px-1">
      <p className="text-xs text-slate-400">
        Menampilkan {filteredData.length} dari {dataLength} data
      </p>
      <p className="text-xs text-slate-400">
        Total sisa: <span className="font-semibold text-slate-600 tabular-nums">{fmt(filteredData.reduce((s, d) => s + d.sisa_jumlah, 0))}</span>
      </p>
    </div>
  );
}
