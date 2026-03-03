import React, { useEffect, useMemo, useRef } from "react";
/**
 * @deprecated This component is deprecated and will be removed in a future release.
 * Use `GitGraph` instead.
*/
export interface CommitItem {
  id: string;
  message: string;
  author: string;
  date: string;
  parents: string[];
}
/**
 * @deprecated This component is deprecated and will be removed in a future release.
 * Use `GitGraph` instead.
*/
export interface GitGraphSVGProps {
  commits: CommitItem[];
  rowHeight?: number;
  colorPalette?: string[];
  laneWidth?: number;

  renderNode?: (commit: _CommitItem, index?: number) => React.ReactNode;
  renderEdge?: (
    from: _CommitItem,
    to: _CommitItem,
    commits: _CommitItem[],
    index?: number,
  ) => React.ReactNode;
}
type BranchColor = {
  color: string;
  branch: string | null;
  lane: number;
  index: number;
};
export interface _CommitItem extends CommitItem {
  color: string;
  lane: number;
  cx: number;
  cy: number;
  prev: _CommitItem[];
  index: number;
}

//Defaults
const LANE_WIDTH = 50;
const NODE_RADIUS = 5;
const COLOR_PALETTE = ["#3a86ff", "#8338ec", "#ff006e", "#fb5607", "#ffbe0b"];
/**
 * @deprecated This component is deprecated and will be removed in a future release.
 * Use `GitGraph` instead.
*/
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
  const colorPool: BranchColor[] = useMemo(
    () =>
      (colorPalette || COLOR_PALETTE).map((color, index) => ({
        color,
        branch: null,
        lane: index + 1,
        index,
      })),
    [colorPalette, commits],
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
        index,
      };
      colorPool.push(c);
      return c;
    }
  }
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
        index
      };
      var branchColor = colorPool.find((c) => c.branch == commit.id);
      if (!branchColor) {
        branchColor = getNewColor();
      } else {
        //Free up any other color that has same branch id// when two branches emerge from same parent branch
        colorPool.forEach((c) => {
          if (c.branch === commit.id && c.index !== branchColor?.index) {
            c.branch = null;
          }
        });
      }

      for (const parent of commit.parents) {
        const parentColor = colorPool.find((c) => c.branch === parent);
        if (!parentColor) {
          // || parentColor.index > branchColor.index) {
          if (branchColor.branch == commit.id) branchColor.branch = parent;
          else {
            var color = colorPool.find((c) => !c.branch);
            if (!color) color = getNewColor();
            color.branch = parent;
          }
          //   break;
        } else {
          branchColor.branch = parent;
        }
      }

      c.color = branchColor.color; //Save color in commit
      c.lane = branchColor.lane;
      c.cx = c.lane * lw - lw / 2;
      c.cy = rh * index + lw / 2;
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
    return `M ${from.cx} ${from.cy} L ${to.cx} ${to.cy}`;
    // Implement the path generation logic in future, for now just connect straight lines
    //   const offset = 3 * (from.lane - to.lane);
    const ax = from.cx;
    const ay = from.cy;

    const bx = to.cx;
    const by = to.cy;

    const laneWidth = lw / 1; // lw * 0.01;
    const rowHeight = (rh + rh * 0.01) / 1;

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
  const lanesCount = useMemo(() => {
    return Math.max(..._commits.map((c) => c.lane), 0);
  }, [_commits]);
  const width = useMemo(() => {
    return lanesCount * lw + 100;
  }, [lanesCount, lw]);
  return (
    <svg width={width} height={rh * _commits.length}>
      {_commits.flatMap((commit) =>
        commit.prev.map((prevCommit, index) => {
          if (renderEdge) {
            return renderEdge(commit, prevCommit, _commits,index);
          }
          const path = getPath(commit, prevCommit);

          return (
            <path
              key={`${commit.id}-${prevCommit.id}_${index}`}
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
      {_commits.map((commit, index) => {
        if (renderNode) {
          return renderNode(commit, index);
        }

        return (
          <circle
            key={`${commit.id}_${index}`}
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
