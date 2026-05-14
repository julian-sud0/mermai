interface Props {
  value: string;
  onChange: (v: string) => void;
  collapsed?: boolean;
}

export function MarkupEditor({ value, onChange, collapsed }: Props) {
  return (
    <div className={`editor-pane${collapsed ? " collapsed" : ""}`}>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
      />
    </div>
  );
}
