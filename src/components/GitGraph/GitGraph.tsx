import React, { useEffect, useMemo, useRef } from "react";
export interface CommitItem {
  id: string;
  message: string;
  author: string;
  date: string;
  parents: string[];
}

export interface GitGraphSVGProps {
  commits: CommitItem[];
  rowHeight?: number;
  colorPalette?: string[];
  laneWidth?: number;

  renderNode?: (commit: CommitItem) => React.ReactNode;
  renderEdge?: (
    from: CommitItem,
    to: CommitItem,
    defaultPath: string,
  ) => React.ReactNode;
}
type BranchColor = {
  color: string;
  branch: string | null;
  lane: number;
};
export interface _CommitItem extends CommitItem {
  color: string;
  lane: number;
  cx: number;
  cy: number;
  prev: _CommitItem[];
}

//Defaults
const LANE_WIDTH = 50;
const NODE_RADIUS = 5;
const COLOR_PALETTE = ["#3a86ff", "#8338ec", "#ff006e", "#fb5607", "#ffbe0b"];
export const GitGraphSVG: React.FC<GitGraphSVGProps> = ({
  commits,
  rowHeight,
  colorPalette,
  laneWidth,
  renderNode,
  renderEdge,
}) => {
  const lw = laneWidth || LANE_WIDTH;
  const rh = rowHeight || LANE_WIDTH;
  const colorPool: BranchColor[] = (colorPalette || COLOR_PALETTE).map(
    (color, index) => ({
      color,
      branch: null,
      lane: index + 1,
    }),
  );
  function getNewColor(): BranchColor {
    var index = colorPool.findIndex((c) => !c.branch);
    if (index > -1) {
      return colorPool[index];
    } else {
      var c = {
        color: "#" + Math.floor(Math.random() * 16777215).toString(16),
        branch: null,
        lane: colorPool.length + 1,
      };
      colorPool.push(c);
      return c;
    }
  }
  const [lanesCount, setLanesCount] = React.useState(0);
  const _commits = useMemo(() => {
    var _c: _CommitItem[] = [];

    const commitMap = new Map<string, _CommitItem>();

    commits.forEach((commit, index) => {
      var c: _CommitItem = {
        ...commit,
        color: "",
        lane: 0,
        cx: 0,
        cy: 0,
        prev: [], // initialize empty
      };

      var brachColor = colorPool.find((c) => c.branch == commit.id);
      if (!brachColor) {
        brachColor = getNewColor();
      }
      //check parent commit id has color assigned already, if yes then free up the color
      var parentColor = colorPool.find((c) => c.branch == commit.parents[0]);
      if (!parentColor) {
        brachColor.branch = commit.parents[0];
      } else {
        brachColor.branch = null;
      }
      c.color = brachColor.color; //Save color in commit
      c.lane = brachColor.lane;
      c.cx = c.lane * lw - lw / 2;
      c.cy = rh * index + lw / 2;

      var activeLanes = colorPool.reduce((count, c) => {
        return c.branch !== null ? count + 1 : count;
      }, 0);
      if (activeLanes > lanesCount) {
        setLanesCount(activeLanes);
      }
      _c.push(c);

      commitMap.set(c.id, c);
    });
    // STEP 2: Assign prev references
    _c.forEach((commit) => {
      commit.parents.forEach((parentId) => {
        const parentCommit = commitMap.get(parentId);
        if (parentCommit) {
          parentCommit.prev.push(commit);
        }
      });
    });
    return _c;
  }, [commits, rh, lw]);

  function getPath(from: _CommitItem, to: _CommitItem) {
    const x1 = from.cx;
    const y1 = from.cy;
    const x2 = to.cx;
    const y2 = to.cy;

    // Same lane → straight line
    if (x1 === x2) {
      return `M ${x1} ${y1} L ${x2} ${y2}`;
    }

    const direction = y2 > y1 ? 1 : -1;
    const curveHeight = rh * direction;

    const curveEndY = y1 + curveHeight;

    // If total height is smaller than rw → fallback full curve
    if (Math.abs(y2 - y1) <= rh) {
      const midY = (y1 + y2) / 2;
      return `
      M ${x1} ${y1}
      C ${x1} ${midY},
        ${x2} ${midY},
        ${x2} ${y2}
    `;
    }

    return `
    M ${x1} ${y1}
    C ${x1} ${y1 + curveHeight / 2},
      ${x2} ${y1 + curveHeight / 2},
      ${x2} ${curveEndY}
    L ${x2} ${y2}
  `;
  }

  return (
    <svg width={lanesCount * lw + 100} height={rh * _commits.length}>
      {_commits.flatMap((commit) =>
        commit.prev.map((prevCommit) => {
          const path = getPath(commit, prevCommit);

          if (renderEdge) {
            return renderEdge(commit, prevCommit, path);
          }

          return (
            <path
              key={`${commit.id}-${prevCommit.id}`}
              d={path}
              fill="none"
              stroke={
                commit.lane <= prevCommit.lane ? prevCommit.color : commit.color
              }
              strokeWidth={2}
            />
          );
        }),
      )}
      {_commits.map((commit) => {
        if (renderNode) {
          return renderNode(commit);
        }

        return (
          <circle
            key={commit.id}
            cx={commit.cx}
            cy={commit.cy}
            r={NODE_RADIUS}
            fill={commit.color}
          />
        );
      })}
    </svg>
  );
};
