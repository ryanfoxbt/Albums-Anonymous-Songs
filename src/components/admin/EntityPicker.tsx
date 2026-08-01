"use client";

import { useEffect, useState, useTransition } from "react";

type Option = { id: string; name: string };
type CreateResult = { id: string; name: string } | { error: string };

export function EntityPicker({
  name,
  label,
  fieldClass,
  initialOptions,
  defaultSelectedId,
  onCreate,
  onPendingChange,
}: {
  name: string;
  label: string;
  fieldClass: string;
  initialOptions: Option[];
  defaultSelectedId?: string;
  onCreate: (name: string) => Promise<CreateResult>;
  onPendingChange?: (pending: boolean) => void;
}) {
  const [options, setOptions] = useState(initialOptions);
  const [selectedId, setSelectedId] = useState(defaultSelectedId ?? "");
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    onPendingChange?.(isPending);
  }, [isPending, onPendingChange]);

  const handleAdd = () => {
    setError("");
    startTransition(async () => {
      const result = await onCreate(newName);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setOptions((current) =>
        [...current, result].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setSelectedId(result.id);
      setNewName("");
      setAdding(false);
    });
  };

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-black/60 dark:text-white/60" htmlFor={name}>
        {label}
      </label>
      <div className="flex gap-1">
        <select
          id={name}
          name={name}
          required
          value={selectedId}
          onChange={(event) => setSelectedId(event.target.value)}
          className={fieldClass}
        >
          <option value="" disabled>
            Select {label.toLowerCase()}
          </option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setAdding((current) => !current)}
          aria-label={`Add new ${label.toLowerCase()}`}
          aria-expanded={adding}
          className="shrink-0 rounded-lg border border-black/15 px-2.5 text-sm font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
        >
          +
        </button>
      </div>

      {adding && (
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder={`New ${label.toLowerCase()} name`}
            className={fieldClass}
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={isPending || !newName.trim()}
            className="shrink-0 rounded-lg border border-black/15 px-3 py-2 text-sm hover:bg-black/5 disabled:opacity-50 dark:border-white/20 dark:hover:bg-white/10"
          >
            {isPending ? "Adding..." : "Add"}
          </button>
        </div>
      )}

      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
