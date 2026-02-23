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
  const colorPool: BranchColor[] =useMemo(() => (colorPalette || COLOR_PALETTE).map(
    (color, index) => ({
      color,
      branch: null,
      lane: index + 1,
    }),
  ),[colorPalette,commits]);
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
function getPath(
  from: _CommitItem,
  to: _CommitItem) {

  const ax = from.cx
  const ay = from.cy;

  const bx = to.cx;
  const by = to.cy;

  const laneWidth = lw+lw*0.01;
  const rowHeight = rh+rh*0.01;

  const dx = bx - ax;
  const dy = by - ay;

  const xDirection = Math.sign(dx);
  const yDirection = Math.sign(dy);

  const totalLaneShiftX = Math.abs(dx);
  const totalLaneShiftY = Math.abs(dy);
  const steps = Math.min(
    Math.floor(totalLaneShiftX / laneWidth),
    Math.floor(totalLaneShiftY / rowHeight),
  );
  const stepHeight = rowHeight * yDirection;
  const curveSize = laneWidth * 1; //1=no offset

  let currentX = ax;
  let currentY = ay;

  let d = `M ${currentX} ${currentY} `;

  // Step lane-by-lane
  for (let i = 0; i < steps; i++) {
    const nextX = currentX + xDirection * laneWidth;
    const nextY = currentY + stepHeight;

    const c1x = currentX;
    const c1y = currentY + yDirection * curveSize;

    const c2x = nextX;
    const c2y = nextY - yDirection * curveSize;

    d += `C ${c1x} ${c1y}, ${c2x} ${c2y}, ${nextX} ${nextY} `;

    currentX = nextX;
    currentY = nextY;
  }

  const remainingDx = bx - currentX;
  const remainingDy = by - currentY;

  const xDir = Math.sign(remainingDx);
  const yDir = Math.sign(remainingDy);

  const curveStrength = laneWidth * 1; //1 = no offset

  const c1x = currentX;
  const c1y = currentY + yDir * curveStrength;

  const c2x = bx;
  const c2y = by - yDir * curveStrength;

  d += `C ${c1x} ${c1y}, ${c2x} ${c2y}, ${bx} ${by}`;
  return d;
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
