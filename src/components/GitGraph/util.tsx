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
      drawFinalPath( d: string, color: string, width = 2) {
        return (
          <path d={d} stroke={color} strokeWidth={width} fill="none"></path>
        )
        // const path = document.createElementNS(
        //   "http://www.w3.org/2000/svg",
        //   "path",
        // );
        // path.setAttribute("d", d.replace(/\s+/g, " ").trim());
        // path.setAttribute("stroke", color);
        // path.setAttribute("stroke-width", width.toString());
        // path.setAttribute("fill", "none");
        // path.classList.add("commit-edge");
        // return path;
      },
      drawPoint(
        x: number,
        y: number,
        color: string,
        commit: ICommitItem,
      ) {
        return (
          <circle cx={x} cy={y} r={5.0} fill={color} stroke="none"></circle>
        )
        // const circle = document.createElementNS(
        //   "http://www.w3.org/2000/svg",
        //   "circle",
        // );
        // circle.setAttribute("cx", x.toString());
        // circle.setAttribute("cy", y.toString());
        // circle.setAttribute("r", 5.0.toString());
        // circle.setAttribute("fill", color);
        // circle.setAttribute("stroke", "none");
        // return circle;
      },
    };
    export {svgUtils};