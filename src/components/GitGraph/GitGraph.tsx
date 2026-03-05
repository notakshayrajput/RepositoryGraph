import React, {
  forwardRef,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { svgUtils } from "./util";
export interface ICommitItem {
  id: string;
  message: string;
  author: string;
  date: string;
  parents: string[];
  meta?: any;
}
export interface GitGraphProps {
  commits: ICommitItem[];
  colorPalette?: string[];
  padding?: {left:number,right:number,bottom:number,top:number} | number;
  rowHeight?: number;
  laneWidth?: number;
  style?: React.CSSProperties;
  renderNode?: (
    x: number,
    y: number,
    color: string,
    commit: ICommitItem,
  ) => ReactNode;
  renderEdge?: (d: string, color: string) => ReactNode;
  getMergeCurve?: (x1: number, y1: number, x2: number, y2: number) => string;
  getBranchSplitCurve?: (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
  ) => string;
}
type Branch = {
  color: string;
  xIndex: number;
  lastxy: {
    x: number;
    y: number;
  };
  pathStr: string;
  toBeClosed?: string[];
};

type BranchPool = Record<string, Branch>;
type CompletedPath = {
  d: string;
  color: string;
};
const DEFAULT_COLORPALETTE = [
  "#3a86ff",
  "#8338ec",
  "#ff006e",
  "#fb5607",
  "#ffbe0b",
  "#3affbd",
  "#adec38",
  "#ff009d",
  "#fb7507",
  "#0b38ff",
];
const DEFAULT_ROWHEIGHT = 35;
const DEFAULT_LANEWIDTH = 35;
const DEFAULT_OFFSETX = 25;
const DEFAULT_OFFSETY = 25;
const DEFAULT_EDGEWIDTH = 2;
// const GitGraph: React.FC<GitGraphProps> = (props) => {
const GitGraph = forwardRef<SVGSVGElement, GitGraphProps>((props, ref) => {
  const {
    commits,
    colorPalette: _colorPalette,
    rowHeight: _rowHeight,
    laneWidth: _laneWidth,
    style,
    renderNode,
    renderEdge,
    getMergeCurve,
    getBranchSplitCurve,
    padding
  } = props;
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [svgWidth, setSVGWidth] = React.useState(0);
  let computedWidth = 0;
  const colorPalette = _colorPalette || DEFAULT_COLORPALETTE;
  const rowHeight = _rowHeight || DEFAULT_ROWHEIGHT;
  const laneWidth = _laneWidth || DEFAULT_LANEWIDTH;
  const _padding = typeof padding === 'number' ? {left:padding,right:padding,bottom:padding,top:padding} : padding || {left:DEFAULT_OFFSETX,right:DEFAULT_OFFSETX,bottom:DEFAULT_OFFSETY,top:DEFAULT_OFFSETY};
  const { nodes, edges } = useMemo<{
    nodes: ReactNode[];
    edges: ReactNode[];
  }>(() => {
    // if (!svgRef.current) return {nodes:[],edges:[]};

    const nodes: React.ReactNode[] = [];
    const edges: React.ReactNode[] = [];
    // const layerLines = svgRef.current.querySelector("#layer-lines")!;
    // const layerPoints = svgRef.current.querySelector("#layer-points")!;
    // layerLines.innerHTML = "";
    // layerPoints.innerHTML = "";
    // --- State & Config ---
    let branchPool: BranchPool = {};
    let completedPaths: CompletedPath[] = [];
    let colorCounter = 0;

    function getCurveTop(x1: number, y1: number, x2: number, y2: number) {
      computedWidth = Math.max(computedWidth, x2, x1);
      if (getMergeCurve) return getMergeCurve(x1, y1, x2, y2);
      else return svgUtils.getCurveTop(x1, y1, x2, y2);
    }
    function getCurveBottom(x1: number, y1: number, x2: number, y2: number) {
      computedWidth = Math.max(computedWidth, x2, x1);
      if (getBranchSplitCurve) return getBranchSplitCurve(x1, y1, x2, y2);
      return svgUtils.getCurveBottom(x1, y1, x2, y2);
    }
    function drawFinalPath(
      edges: React.ReactNode[],
      d: string,
      color: string,
      width = 2,
    ) {
      if (renderEdge) {
        let path = renderEdge(d, color);
        edges.push(path);
      } else {
        let path = svgUtils.drawFinalPath(d, color, width);

        edges.push(path);
      }
    }
    function drawPoint(
      nodes: React.ReactNode[],
      x: number,
      y: number,
      color: string,
      commit: ICommitItem,
    ) {
      computedWidth = Math.max(computedWidth, x);
      if (renderNode) {
        let node = renderNode(x, y, color, commit);
        nodes.push(node);
      } else {
        let node = svgUtils.drawPoint(x, y, color, commit);
        nodes.push(node);
      }
    }
    function assignNewBranch() {
      const activeBranches = Object.values(branchPool);
      const occupied = new Set(activeBranches.map((b: any) => b.xIndex));
      let lane = 0;
      while (occupied.has(lane)) lane++;
      return {
        color: colorPalette[colorCounter++ % colorPalette.length],
        xIndex: lane,
      };
    }

    function compactLanes() {
      const activeKeys = Object.keys(branchPool);
      const occupiedLanes = new Set();
      activeKeys
        .filter((k) => k.startsWith("merge_"))
        .forEach((k) => {
          occupiedLanes.add(branchPool[k].xIndex);
        });
      const realBranches = activeKeys
        .filter((k) => !k.startsWith("merge_"))
        .map((k) => branchPool[k]);
      realBranches.sort((a, b) => a.xIndex - b.xIndex);
      for (const branch of realBranches) {
        let targetLane = 0;
        while (occupiedLanes.has(targetLane)) {
          targetLane++;
        }
        if (targetLane < branch.xIndex) {
          branch.xIndex = targetLane;
        }
        occupiedLanes.add(branch.xIndex);
      }
    }

    function drawActiveBranches(currentY: number, skipCommitId: string) {
      let skipKeys = new Set<string>();
      let terminatingBranch = branchPool[skipCommitId];
      if (terminatingBranch) {
        skipKeys.add(skipCommitId);
        if (terminatingBranch.toBeClosed)
          terminatingBranch.toBeClosed.forEach((k: string) => skipKeys.add(k));
      }

      Object.keys(branchPool).forEach((key) => {
        if (skipKeys.has(key)) return;
        const info = branchPool[key];
        const targetX = info.xIndex * laneWidth + _padding.left;
        if (info.lastxy.y !== currentY) {
          if (info.lastxy.x !== targetX) {
            info.pathStr += getCurveTop(
              info.lastxy.x,
              info.lastxy.y,
              targetX,
              currentY,
            );
          } else {
            info.pathStr += ` L ${targetX} ${currentY}`;
          }
          info.lastxy = { x: targetX, y: currentY };
        }
      });
    }

    function processNode(commit: any) {
      let arrivingBranch = branchPool[commit.id];
      let currentLane = 0;
      let currentColor = "";

      if (!arrivingBranch) {
        let newBranch = assignNewBranch();
        currentLane = newBranch.xIndex;
        currentColor = newBranch.color;
      } else {
        currentLane = arrivingBranch.xIndex;
        currentColor = arrivingBranch.color;
      }

      const x = currentLane * laneWidth + _padding.left;
      const y = commit.meta.yIndex * rowHeight + _padding.top;

      drawActiveBranches(y, commit.id);

      if (arrivingBranch) {
        if (arrivingBranch.lastxy.y !== y || arrivingBranch.lastxy.x !== x) {
          arrivingBranch.pathStr += getCurveBottom(
            arrivingBranch.lastxy.x,
            arrivingBranch.lastxy.y,
            x,
            y,
          );
        }
        completedPaths.push({
          d: arrivingBranch.pathStr,
          color: arrivingBranch.color,
        });

        if (arrivingBranch.toBeClosed) {
          arrivingBranch.toBeClosed.forEach((key: string) => {
            let mergingBranch = branchPool[key];
            if (mergingBranch) {
              if (
                mergingBranch.lastxy.y !== y ||
                mergingBranch.lastxy.x !== x
              ) {
                mergingBranch.pathStr += getCurveBottom(
                  mergingBranch.lastxy.x,
                  mergingBranch.lastxy.y,
                  x,
                  y,
                );
              }
              completedPaths.push({
                d: mergingBranch.pathStr,
                color: mergingBranch.color,
              });
              delete branchPool[key];
            }
          });
        }
        delete branchPool[commit.id];
      }
      drawPoint(nodes, x, y, currentColor, commit);

      if (commit.parents.length > 0) {
        let primaryParentId = commit.parents[0];
        if (!branchPool[primaryParentId]) {
          branchPool[primaryParentId] = {
            color: currentColor,
            xIndex: currentLane,
            lastxy: { x, y },
            pathStr: `M ${x} ${y}`, // Creates a fresh string for the parent
          };
        } else {
          let existing = branchPool[primaryParentId];
          if (currentLane < existing.xIndex) {
            let dummyKey = `merge_${commit.id}_${primaryParentId}_${existing.xIndex}`;
            branchPool[dummyKey] = existing;
            branchPool[primaryParentId] = {
              color: currentColor,
              xIndex: currentLane,
              lastxy: { x, y },
              pathStr: `M ${x} ${y}`, // Creates a fresh string
              toBeClosed: existing.toBeClosed
                ? [...existing.toBeClosed, dummyKey]
                : [dummyKey],
            };
            delete existing.toBeClosed;
          } else {
            let dummyKey = `merge_${commit.id}_${primaryParentId}_${currentLane}`;
            branchPool[dummyKey] = {
              color: currentColor,
              xIndex: currentLane,
              lastxy: { x, y },
              pathStr: `M ${x} ${y}`, // Creates a fresh string
            };
            if (!branchPool[primaryParentId].toBeClosed)
              branchPool[primaryParentId].toBeClosed = [];
            branchPool[primaryParentId].toBeClosed.push(dummyKey);
          }
        }
        for (let i = 1; i < commit.parents.length; i++) {
          let parentId = commit.parents[i];
          let targetLane = currentLane + i;
          Object.values(branchPool).forEach((b) => {
            if (b.xIndex >= targetLane) b.xIndex++;
          });

          let newColor = colorPalette[colorCounter++ % colorPalette.length];
          let incomingBranch = {
            color: newColor,
            xIndex: targetLane,
            lastxy: { x, y },
            pathStr: `M ${x} ${y}`, // Creates a fresh string
          };

          if (!branchPool[parentId]) {
            branchPool[parentId] = incomingBranch;
          } else {
            let dummyKey = `merge_${commit.id}_${parentId}_${targetLane}`;
            incomingBranch.color = branchPool[parentId].color;
            branchPool[dummyKey] = incomingBranch;
            if (!branchPool[parentId].toBeClosed)
              branchPool[parentId].toBeClosed = [];
            branchPool[parentId].toBeClosed.push(dummyKey);
          }
        }
      }

      compactLanes();
    }

    commits.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    commits.forEach((commit, index) => {
      if (commit.meta == null) {
        commit.meta = { yIndex: index, prev: [] };
      }
      commit.meta.yIndex = index;
      commit.parents.forEach((parentId) => {
        var parentIndex = commits.findIndex((c) => c.id === parentId);
        if (parentIndex > -1) {
          var parent = commits[parentIndex];
          if (parent.meta == null) {
            parent.meta = { yIndex: parentIndex, prev: [] };
          }
          if(parent.meta.prev.indexOf(commit.id) < 0) parent.meta.prev.push(commit.id);
        }
      });
    });

    commits.forEach((commit) => {
      processNode(commit);
    });

    completedPaths.forEach((path) => {
      drawFinalPath(edges, path.d, path.color, DEFAULT_EDGEWIDTH);
    });
    return { nodes, edges };
  }, [{ ...props }]);

  useEffect(() => {
    setSVGWidth(computedWidth + _padding.right);
  }, [computedWidth]);
  return (
    <>
      <svg
        ref={ref}
        height={rowHeight * commits.length + _padding.bottom}
        width={svgWidth}
        style={style}
      >
        <g id="layer-lines">{edges}</g>
        <g id="layer-points">{nodes}</g>
      </svg>
    </>
  );
});

export { GitGraph };
