import type { ICommitItem } from "./GitGraph";

 const svgUtils = {
      getCurveTop(x1: number, y1: number, x2: number, y2: number) {
        const curveOffset = Math.min(15, Math.abs(y2 - y1) / 2);
        let d = ` C ${x1} ${y1 + curveOffset}, ${x2} ${
          y1 + curveOffset
        }, ${x2} ${y1 + curveOffset * 2}`;
        if (y1 + curveOffset * 2 < y2) d += ` L ${x2} ${y2}`;
        return d;
      },
      getCurveBottom(x1: number, y1: number, x2: number, y2: number) {
        const curveOffset = Math.min(15, Math.abs(y2 - y1) / 2);
        let d = "";
        if (y2 - curveOffset * 2 > y1) d += ` L ${x1} ${y2 - curveOffset * 2}`;
        d += ` C ${x1} ${y2 - curveOffset}, ${x2} ${
          y2 - curveOffset
        }, ${x2} ${y2}`;
        return d;
      },
      drawFinalPath( d: string, color: string, width = 2,from: ICommitItem, to: ICommitItem,) {
        return (
          <path key={`${from.id}-${to.id}`} d={d} stroke={color} strokeWidth={width} fill="none"></path>
        )
      },
      drawPoint(
        x: number,
        y: number,
        color: string,
        commit: ICommitItem,
      ) {
        return (
          <circle key={commit.id} cx={x} cy={y} r={5.0} fill={color} stroke="none"></circle>
        )
      },
    };
    export {svgUtils};