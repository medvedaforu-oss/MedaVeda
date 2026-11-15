type Props = {
  value: string;
  onChange: (value: string) => void;
};

export default function OrderFilter({ value, onChange }: Props) {
  return (
    <select aria-label="Order status"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="border rounded-lg px-4 py-2"
    >
      <option value="">All Statuses</option>
      <option value="created">Created</option>
      <option value="pending">Pending</option>
      <option value="cancelled">Cancelled</option>
      <option value="paid">Paid</option>
      <option value="failed">Failed</option>
      <option value="refunded">Refunded</option>
    </select>
  );
}
