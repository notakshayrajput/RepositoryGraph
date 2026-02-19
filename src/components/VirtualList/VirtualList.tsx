import React, {
  useRef,
  useState,
  useMemo,
  useCallback,
  CSSProperties,
} from "react";
import { classPrefix } from "../../utils/type";

interface VirtualListProps<T> {
  items: T[];
  rowHeight: number;
//   height?: number | string;
  overscan?: number;
  style?: CSSProperties;
  renderRow: (item: T, index: number) => React.ReactNode;
  className?: string;
  prefixCls?: string;
}

export function VirtualList<T>({
  items,
  rowHeight,
//   height,
  overscan = 5,
  className,
  style,
  renderRow,
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
//   const numericHeight =
//     typeof height === "number"
//       ? height
//       : height === undefined
//       ? rowHeight * 10
//       : undefined;

  const totalHeight = items.length * rowHeight;

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    setScrollTop(containerRef.current.scrollTop);
  }, []);

  const visibleCount = useMemo(() => {
    // if (numericHeight !== undefined) {
    //   return Math.ceil(numericHeight / rowHeight);
    // }
    // If height is string like 100vh, estimate using container clientHeight
    return containerRef.current
      ? Math.ceil(containerRef.current.clientHeight / rowHeight)
      : 10;
  }, [ rowHeight]);

  const { startIndex, endIndex } = useMemo(() => {
    const start = Math.floor(scrollTop / rowHeight) - overscan;
    const safeStart = Math.max(0, start);

    const end = safeStart + visibleCount + overscan * 2;
    const safeEnd = Math.min(items.length - 1, end);

    return {
      startIndex: safeStart,
      endIndex: safeEnd,
    };
  }, [scrollTop, visibleCount, rowHeight, items.length, overscan]);

  const visibleItems = useMemo(() => {
    return items.slice(startIndex, endIndex + 1);
  }, [items, startIndex, endIndex]);

  const offsetY = startIndex * rowHeight;

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      style={{
        overflowY: "auto",
        position: "relative",
        ...style,
      }}
      className={`${classPrefix}-virtual-list ${className || ''}`}
    >
      <div
        style={{
          height: totalHeight,
          position: "relative",
        }}
      >
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map((item, i) =>
            renderRow(item, startIndex + i)
          )}
        </div>
      </div>
    </div>
  );
}
