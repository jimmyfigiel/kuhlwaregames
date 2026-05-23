import React, { useState } from "react";

export default function AccordionSection({
  title,
  subtitle = "",
  defaultOpen = false,
  actions = null,
  children,
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="fp-accordion">
      <div className="fp-accordion-head">
        <button className="fp-accordion-toggle" onClick={() => setOpen((v) => !v)}>
          <span className="fp-caret">{open ? "▾" : "▸"}</span>
          <span>
            <span className="fp-accordion-title">{title || "Untitled"}</span>
            {subtitle ? <span className="fp-accordion-subtitle">{subtitle}</span> : null}
          </span>
        </button>
        {actions ? <div className="fp-accordion-actions">{actions}</div> : null}
      </div>
      {open ? <div className="fp-accordion-body">{children}</div> : null}
    </div>
  );
}
