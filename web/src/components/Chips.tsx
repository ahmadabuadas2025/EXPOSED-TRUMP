/** A multi-select row of toggle chips. Empty selection means "all". */
export function Chips<T extends string>({
  label,
  options,
  value,
  onChange,
  render,
}: {
  label: string;
  options: T[];
  value: T[];
  onChange: (v: T[]) => void;
  render?: (v: T) => React.ReactNode;
}) {
  const toggle = (o: T) => onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o]);
  return (
    <fieldset>
      <legend className="eyebrow mb-1.5">{label}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button key={o} type="button" className="chip" aria-pressed={value.includes(o)} onClick={() => toggle(o)}>
            {render ? render(o) : o}
          </button>
        ))}
        {value.length > 0 && (
          <button type="button" className="px-1 text-xs text-muted underline" onClick={() => onChange([])}>
            clear
          </button>
        )}
      </div>
    </fieldset>
  );
}

export function YearRange({
  min,
  max,
  value,
  onChange,
}: {
  min: number;
  max: number;
  value: [number, number];
  onChange: (v: [number, number]) => void;
}) {
  return (
    <fieldset>
      <legend className="eyebrow mb-1.5">
        Years: {value[0]}–{value[1]}
      </legend>
      <div className="flex items-center gap-2">
        <label className="sr-only" htmlFor="yr-from">From year</label>
        <input id="yr-from" type="range" min={min} max={max} value={value[0]} className="w-full accent-[rgb(var(--accent))]"
          onChange={(e) => onChange([Math.min(+e.target.value, value[1]), value[1]])} />
        <label className="sr-only" htmlFor="yr-to">To year</label>
        <input id="yr-to" type="range" min={min} max={max} value={value[1]} className="w-full accent-[rgb(var(--accent))]"
          onChange={(e) => onChange([value[0], Math.max(+e.target.value, value[0])])} />
      </div>
    </fieldset>
  );
}
