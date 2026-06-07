import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
}

export type PageDim = { width: number; height: number };

export function PdfViewer({
  fileUrl,
  onLoaded,
  renderOverlay,
  pageWidth,
}: {
  fileUrl: string;
  onLoaded?: (numPages: number) => void;
  renderOverlay?: (page: number, dim: PageDim) => React.ReactNode;
  pageWidth?: number;
}) {
  const [numPages, setNumPages] = useState(0);
  const [dims, setDims] = useState<Record<number, PageDim>>({});
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const update = () => setContainerWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [mounted]);
  if (!mounted) return <div className="text-sm text-muted-foreground">Loading viewer…</div>;

  const effectiveWidth = pageWidth ?? Math.max(280, Math.min(900, containerWidth || 720));

  return (
    <div ref={containerRef} className="w-full">
    <Document
      file={fileUrl}
      onLoadSuccess={({ numPages }) => {
        setNumPages(numPages);
        onLoaded?.(numPages);
      }}
      onLoadError={(err) => console.error("PDF load error", err)}
      loading={<div className="text-sm text-muted-foreground py-6">Loading document…</div>}
    >
      <div className="space-y-6 flex flex-col items-center">
        {Array.from({ length: numPages }, (_, i) => i + 1).map((p) => (
          <div key={p} className="relative inline-block bg-card shadow-elegant rounded-md overflow-hidden border border-border" style={{ boxShadow: "var(--shadow-elegant)" }}>
            <Page
              pageNumber={p}
              width={effectiveWidth}
              onLoadSuccess={(page) =>
                setDims((d) => ({ ...d, [p]: { width: page.width, height: page.height } }))
              }
              renderAnnotationLayer={false}
              renderTextLayer={false}
            />
            {dims[p] && renderOverlay && (
              <div className="absolute inset-0">{renderOverlay(p, dims[p])}</div>
            )}
          </div>
        ))}
      </div>
    </Document>
    </div>
  );
}