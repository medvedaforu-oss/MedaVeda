import Button from "./Button";

type Props = {
  onAdd: () => void;
};

export default function VideosHeader({ onAdd }: Props) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-xl font-semibold text-gray-800">
          Videos
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Manage all MedVeda Videos
        </p>
      </div>

      <Button
        type="button"
        onClick={onAdd}
        className="min-h-11 shrink-0 self-start focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700"
      >
        + Add Video
      </Button>
    </div>
  );
}
