type Props = {
  label: string;
  loading: boolean;
  error: string | null;
  onRetry: () => Promise<void>;
};

export default function LookupStatus({ label, loading, error, onRetry }: Props) {
  return (
    <>
      {loading && <p role="status" className="mb-2 text-sm text-gray-500">Loading {label}...</p>}
      {error && (
        <div role="alert" className="mb-3 text-sm text-red-600">
          <p>{label}: {error}</p>
          <button type="button" onClick={() => { void onRetry(); }}>Retry {label}</button>
        </div>
      )}
    </>
  );
}
