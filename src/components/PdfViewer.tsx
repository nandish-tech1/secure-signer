import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
}

export type PageDim = { width: number; height: number };

export function PdfViewer({
  fileUrl,
  onLoaded,
  renderOverlay,
  pageWidth,
  showThumbnails = false,
  showControls = false,
}: {
  fileUrl: string;
  onLoaded?: (numPages: number) => void;
  renderOverlay?: (page: number, dim: PageDim) => React.ReactNode;
  pageWidth?: number;
  showThumbnails?: boolean;
  showControls?: boolean;
}) {
  const [numPages, setNumPages] = useState(0);
  const [dims, setDims] = useState<Record<number, PageDim>>({});
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [zoom, setZoom] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const scrollerRef = useRef<HTMLDivElement>(null);
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

  const baseWidth = pageWidth ?? Math.max(280, Math.min(900, containerWidth || 720));
  const effectiveWidth = Math.round(baseWidth * zoom);

  function scrollToPage(p: number) {
    const el = pageRefs.current[p];
    if (el && scrollerRef.current) {
      scrollerRef.current.scrollTo({ top: el.offsetTop - 8, behavior: "smooth" });
    }
  }

  const controls = showControls ? (
    <div className="flex items-center justify-center gap-2 py-2 border-b border-border bg-background/60 sticky top-0 z-10">
      <button type="button" onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(2)))} className="h-7 w-7 rounded hover:bg-muted inline-flex items-center justify-center" aria-label="Zoom out">
        <ZoomOut className="h-4 w-4" />
      </button>
      <span className="text-xs tabular-nums w-12 text-center">{Math.round(zoom * 100)}%</span>
      <button type="button" onClick={() => setZoom((z) => Math.min(2.5, +(z + 0.1).toFixed(2)))} className="h-7 w-7 rounded hover:bg-muted inline-flex items-center justify-center" aria-label="Zoom in">
        <ZoomIn className="h-4 w-4" />
      </button>
      <button type="button" onClick={() => setZoom(1)} className="h-7 w-7 rounded hover:bg-muted inline-flex items-center justify-center" aria-label="Fit width">
        <Maximize2 className="h-4 w-4" />
      </button>
      {numPages > 0 && (
        <span className="ml-3 text-xs text-muted-foreground">Page {currentPage} / {numPages}</span>
      )}
    </div>
  ) : null;

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
        <div className="flex">
          {showThumbnails && numPages > 0 ? (
            <aside className="w-24 shrink-0 border-r border-border bg-secondary/40 overflow-auto max-h-[calc(100vh-220px)]">
              <div className="p-2 space-y-2">
                {Array.from({ length: numPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => { setCurrentPage(p); scrollToPage(p); }}
                    className={`block w-full rounded border-2 overflow-hidden transition ${currentPage === p ? "border-accent" : "border-transparent hover:border-muted-foreground/40"}`}
                    aria-label={`Go to page ${p}`}
                  >
                    <div className="bg-card pointer-events-none">
                      <Page pageNumber={p} width={72} renderAnnotationLayer={false} renderTextLayer={false} />
                    </div>
                    <div className="text-[10px] text-center py-0.5 text-muted-foreground bg-background/60">{p}</div>
                  </button>
                ))}
              </div>
            </aside>
          ) : null}
          <div className="flex-1 min-w-0">
            {controls}
            <div ref={scrollerRef} className={showControls ? "overflow-auto max-h-[calc(100vh-220px)] py-3" : ""}>
              <div className="space-y-6 flex flex-col items-center">
                {Array.from({ length: numPages }, (_, i) => i + 1).map((p) => (
                  <div
                    key={p}
                    ref={(el) => { pageRefs.current[p] = el; }}
                    className="relative inline-block bg-card shadow-elegant rounded-md overflow-hidden border border-border"
                    style={{ boxShadow: "var(--shadow-elegant)" }}
                  >
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
            </div>
          </div>
        </div>
      </Document>
    </div>
  );
}