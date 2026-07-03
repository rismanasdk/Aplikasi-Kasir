import React, { useEffect, useState } from 'react';
import { BISection, NarasiBox, EmptyState, Skeleton } from './SharedComponents';
import { generateAiExecutive } from '../biApi';

const ExecutiveDashboard: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        // For now, request empty aggregated payload; backend will use available data
        const res = await generateAiExecutive({});
        setData(res);
      } catch (err: any) {
        setError(err?.message || 'Gagal memuat executive dashboard');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) return <Skeleton rows={6} />;
  if (error) return <EmptyState message={error} />;
  if (!data) return <EmptyState message="Tidak ada data executive tersedia." />;

  return (
    <div className="space-y-4">
      <BISection title="Executive Summary">
        <h2 className="text-lg font-semibold">{data.status}</h2>
        <p className="text-sm text-gray-600 mt-2">{data.executive_summary}</p>
      </BISection>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <BISection title="Prioritas">
          {data.prioritas && data.prioritas.length ? (
            <ul className="list-disc pl-5">
              {data.prioritas.map((p: string, i: number) => (
                <li key={i} className="text-sm text-gray-700">{p}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">Tidak ada prioritas terdeteksi.</p>
          )}
        </BISection>

        <BISection title="Peluang">
          {data.peluang && data.peluang.length ? (
            <ul className="list-disc pl-5">
              {data.peluang.map((p: string, i: number) => (
                <li key={i} className="text-sm text-gray-700">{p}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">Tidak ada peluang terdeteksi.</p>
          )}
        </BISection>

        <BISection title="Risiko">
          {data.risiko && data.risiko.length ? (
            <ul className="list-disc pl-5">
              {data.risiko.map((p: string, i: number) => (
                <li key={i} className="text-sm text-gray-700">{p}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">Tidak ada risiko terdeteksi.</p>
          )}
        </BISection>
      </div>

      <BISection title="Aksi Minggu Ini">
        {data.aksi_minggu_ini && data.aksi_minggu_ini.length ? (
          <ul className="list-disc pl-5">
            {data.aksi_minggu_ini.map((a: string, i: number) => (
              <li key={i} className="text-sm text-gray-700">{a}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">Tidak ada aksi rekomendasi.</p>
        )}
      </BISection>

      <BISection title="Narasi">
        <NarasiBox text={data.narasi || ''} />
      </BISection>
    </div>
  );
};

export default ExecutiveDashboard;
