import React, { useEffect, useMemo, useState } from "react";

import { CompactField } from "./CompactField";

function buildRulesViewerUrl(localPdfUrl, page, pageOffset) {
  if (!localPdfUrl) return "";

  const printedPage = Math.max(1, Number(page || 1));
  const offset = Number(pageOffset || 0);
  const pdfPage = Math.max(1, printedPage + offset);

  return `${localPdfUrl}#page=${pdfPage}`;
}

export default function RulesPanel({
  roomId,
  crew,
  rulesPage,
  localPdfUrl,
  localPdfName,
  onLoadLocalPdf,
  onClearLocalPdf,
  onRulesPageChange,
  onSaveCrew,
}) {
  const [error, setError] = useState("");

  const pageStorageKey = `five-parsecs-rules-page-${roomId || "unknown"}`;
  const offsetStorageKey = `five-parsecs-rules-page-offset-${roomId || "unknown"}`;

  const pageOffset = Number(crew?.rulesPageOffset ?? localStorage.getItem(offsetStorageKey) ?? 0);

  useEffect(() => {
    const savedPage = Number(localStorage.getItem(pageStorageKey) || 0);

    if (savedPage > 0) {
      onRulesPageChange(savedPage);
    } else if (crew?.rulesCurrentPage) {
      onRulesPageChange(Number(crew.rulesCurrentPage || 1));
    }
  }, [pageStorageKey, crew?.rulesCurrentPage, onRulesPageChange]);

  const viewerUrl = useMemo(() => {
    return buildRulesViewerUrl(
      localPdfUrl,
      rulesPage || crew?.rulesCurrentPage || 1,
      pageOffset
    );
  }, [localPdfUrl, rulesPage, crew?.rulesCurrentPage, pageOffset]);

  function chooseRulesPdf(file) {
    setError("");

    if (!file) return;

    if (file.type !== "application/pdf") {
      setError("Please choose a PDF file.");
      return;
    }

    onLoadLocalPdf(file);
  }

  function changePage(value) {
    const nextPage = Math.max(1, Number(value || 1));

    onRulesPageChange(nextPage);
    localStorage.setItem(pageStorageKey, String(nextPage));

    if (crew && onSaveCrew) {
      onSaveCrew({
        ...crew,
        rulesCurrentPage: nextPage,
      });
    }
  }

  function changeOffset(value) {
    const nextOffset = Number(value || 0);

    localStorage.setItem(offsetStorageKey, String(nextOffset));

    if (crew && onSaveCrew) {
      onSaveCrew({
        ...crew,
        rulesPageOffset: nextOffset,
      });
    }
  }

  if (!crew) {
    return (
      <div className="fp-panel">
        <div className="fp-muted">
          Create an adventure before using the rules tab.
        </div>
      </div>
    );
  }

  const printedPage = Number(rulesPage || crew.rulesCurrentPage || 1);
  const pdfPage = Math.max(1, printedPage + pageOffset);

  return (
    <div className="fp-panel">
      <div className="fp-accordion">
        <div className="fp-accordion-head">
          <div className="fp-accordion-toggle">
            <span className="fp-caret">▾</span>

            <div>
              <div className="fp-accordion-title">Rules PDF</div>

              <div className="fp-accordion-subtitle">
                Choose a local PDF on this device, or use your physical book.
              </div>
            </div>
          </div>
        </div>

        <div className="fp-accordion-body">
          <div className="fp-grid">
            <CompactField
              label="Printed Rules Page"
              type="number"
              value={printedPage}
              onChange={changePage}
            />

            <CompactField
              label="PDF Page Offset"
              type="number"
              value={pageOffset}
              onChange={changeOffset}
            />
          </div>

          <div className="fp-rules-page-help">
            Printed page {printedPage} opens PDF page {pdfPage}.
          </div>

          <div className="fp-actions">
            <label className="fp-file-upload">
              <span className="fp-btn fp-primary">Choose Local Rules PDF</span>

              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];

                  chooseRulesPdf(file);

                  e.target.value = "";
                }}
              />
            </label>

            {localPdfUrl && (
              <>
                <button
                  className="fp-btn"
                  onClick={() =>
                    window.open(viewerUrl, "_blank", "noopener,noreferrer")
                  }
                >
                  Open Page in New Tab
                </button>

                <button className="fp-btn fp-danger" onClick={onClearLocalPdf}>
                  Clear Local PDF
                </button>
              </>
            )}
          </div>

          {error && <div className="fp-error">{error}</div>}

          {localPdfName ? (
            <div className="fp-rules-local-name">
              Loaded on this device: {localPdfName}
            </div>
          ) : (
            <div className="fp-muted">
              No PDF selected on this device. You can still use the page
              reference with your physical book.
            </div>
          )}
        </div>
      </div>

      {localPdfUrl ? (
        <div className="fp-rules-viewer-wrap">
          <iframe
            key={viewerUrl}
            className="fp-rules-viewer"
            title="Five Parsecs Local Rules PDF"
            src={viewerUrl}
          />
        </div>
      ) : (
        <div className="fp-rules-book-card">
          <div className="fp-rules-book-title">Use Your Book</div>

          <div className="fp-rules-book-page">
            Current page reference: p. {printedPage}
          </div>

          <div className="fp-rules-book-page">
            PDF page with offset: {pdfPage}
          </div>

          <div className="fp-muted">
            The Turn tab can still jump here and set the correct page number.
            Choose a local PDF only if you want the rules visible in the app.
          </div>
        </div>
      )}
    </div>
  );
}