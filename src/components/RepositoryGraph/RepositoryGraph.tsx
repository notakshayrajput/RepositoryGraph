import React from "react";
import { VirtualList } from "../VirtualList/VirtualList";
import { classPrefix } from "../../utils/type";
export interface RepositoryGraphProps {
  rowHeight?: number;
  // height?: number | string;
  items?:React.ReactNode[];
  style?: React.CSSProperties;
  className?: string;
  prefixCls?: string;
}
export const RepositoryGraph = (props: RepositoryGraphProps) => {
  const items = props.items || Array.from({ length: 10000 }, (_, i) => `Commit 1${i}`);

  return (
    <VirtualList
      items={items}
      rowHeight={props.rowHeight || 40}
      // height={props.height}
      renderRow={(item, index) => (
        <div
          key={index}
          style={{
            height: 40,
            borderBottom: "1px solid #eee",
            display: "flex",
            alignItems: "center",
            paddingLeft: 12,
          }}
        >
          {item}
        </div>
      )}
      className={`${classPrefix}-repository-graph ${props.className || ''}`}
      prefixCls={props.prefixCls}
      style={props.style}
    />
  );
};
