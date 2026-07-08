import React from "react";

type TabsProps = {
  value: string;
  onValueChange(value: string): void;
  values: Array<{ value: string; label: string; disabled?: boolean }>;
};

export function Tabs({ value, onValueChange, values }: TabsProps) {
  return (
    <div className="ui-tabs" role="tablist" aria-label="Dashboard views">
      {values.map((item) => (
        <button
          key={item.value}
          role="tab"
          type="button"
          className="ui-tab"
          aria-selected={item.value === value}
          aria-controls={`panel-${item.value}`}
          disabled={item.disabled}
          onClick={() => onValueChange(item.value)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
