type Props = {
  title: string;
  value: string;
  icon: string;
  color: string;
  error?: string;
};

export default function StatCard({
  title,
  value,
  icon,
  color,
  error,
}: Props) {
  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <div className="flex justify-between items-center">

        <div>
          <p className="text-gray-500">
            {title}
          </p>

          <h2 className="text-3xl font-bold mt-2">
            {value}
          </h2>
          {error && <p role="alert" className="mt-2 text-xs text-red-600">{error}</p>}
        </div>

        <div
          className="text-4xl"
          style={{ color }}
        >
          {icon}
        </div>

      </div>
    </div>
  );
}