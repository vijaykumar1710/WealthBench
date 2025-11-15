interface CategoryItem {
  name: string;
  value: number;
}

interface CategoryRowProps {
  items: CategoryItem[];
  onAdd: () => void;
  onUpdate: (index: number, key: "name" | "value", value: string | number) => void;
  onRemove: (index: number) => void;
  namePlaceholder: string;
  valuePlaceholder: string;
  title: string;
}

export default function CategoryRow({
  items,
  onAdd,
  onUpdate,
  onRemove,
  namePlaceholder,
  valuePlaceholder,
  title,
}: CategoryRowProps) {
  const inputClass = "border rounded-md p-2 w-full text-gray-900 bg-white";
  const labelClass = "block text-sm font-medium text-gray-600 mb-1";

  return (
    <div className="rounded-xl border p-4 shadow-sm bg-white">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        <button
          type="button"
          onClick={onAdd}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm"
        >
          + Add {title.slice(0, -1)}
        </button>
      </div>

      <div className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No items added yet</p>
        ) : (
          items.map((item, index) => (
            <div key={index} className="flex gap-3 items-end">
              <div className="flex-1">
                <label className={labelClass}>{namePlaceholder}</label>
                <input
                  type="text"
                  placeholder={namePlaceholder}
                  value={item.name}
                  onChange={(e) => onUpdate(index, "name", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="w-40">
                <label className={labelClass}>Value</label>
                <input
                  type="number"
                  placeholder={valuePlaceholder}
                  value={item.value || ""}
                  onChange={(e) => onUpdate(index, "value", parseFloat(e.target.value) || 0)}
                  step="0.01"
                  className={inputClass}
                />
              </div>
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors mb-0.5"
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

