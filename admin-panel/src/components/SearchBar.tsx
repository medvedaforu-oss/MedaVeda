type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export default function SearchBar({
  value,
  onChange,
  placeholder = "Search notes...",
}: Props) {
  return (
    <input aria-label={placeholder}
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full md:w-80 border rounded-lg px-4 py-2 outline-none"
    />
  );
}