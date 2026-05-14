interface Props {
  value: string;
  onChange: (v: string) => void;
}

export function MarkupEditor({ value, onChange }: Props) {
  return (
    <div className="editor-pane">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
      />
    </div>
  );
}
