import { useState, useRef, useEffect, useCallback } from "react";

/* ════════════════════════════════════════════════════
   OPEN ICONS — Playground v0.12
   ════════════════════════════════════════════════════ */

const SYS = `system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif`;

const DARK = {
  bg:"#090909", s1:"#0F0F0F", s2:"#161616", s3:"#1C1C1C",
  bd:"#222", bd2:"#2E2E2E",
  fg:"#E8E8E8", fgd:"#6A6A6A", fgm:"#343434",
  acc:"#FF6B2B", accbg:"#1C0C04", accfg:"#FF9468",
  green:"#3FEF9A", blue:"#4B9EFF", isLight:false,
};
const LIGHT = {
  bg:"#F0EEE9", s1:"#FAFAF8", s2:"#F0EDE7", s3:"#E5E1D9",
  bd:"#D6D2CA", bd2:"#C0BBB2",
  fg:"#1C1B18", fgd:"#7A756C", fgm:"#B4AFA5",
  acc:"#C94B0A", accbg:"#FEF1EA", accfg:"#A33D07",
  green:"#157A4A", blue:"#2060BB", isLight:true,
};

// KO is baked into each weight — not user-adjustable
const BASE_WC = {
  300: { sw:1,   name:"Light",   code:"Lt", spacing:2.0, koMult:1.25 },
  400: { sw:1.5, name:"Regular", code:"Rg", spacing:2.0, koMult:1.2  },
  600: { sw:2,   name:"Bold",    code:"Bd", spacing:2.5, koMult:1.0  },
};

const REGISTRY = {
  document:       { label:"Document",      cat:"Files",   hasFill:true  },
  share:          { label:"Share",         cat:"Actions", hasFill:false },
  globe:          { label:"Globe",         cat:"Nav",     hasFill:true  },
  warning:        { label:"Warning",       cat:"Status",  hasFill:true  },
  error:          { label:"Error",         cat:"Status",  hasFill:true  },
  close:          { label:"Close",         cat:"Actions", hasFill:false },
  plus:           { label:"Plus",          cat:"Actions", hasFill:false },
  checkbox:       { label:"Checkbox",      cat:"Forms",   hasFill:false },
  checkboxFilled: { label:"Checkbox Fill", cat:"Forms",   hasFill:true  },
  arrowRight:     { label:"Arrow Right",   cat:"Nav",     hasFill:false },
  chevronRight:   { label:"Chevron Right", cat:"Nav",     hasFill:false },
  more:           { label:"More",          cat:"Actions", hasFill:false },
  editBox:        { label:"Edit Box",      cat:"Actions", hasFill:true  },
  imageAdd:       { label:"Image Add",     cat:"Media",   hasFill:true  },
  fileCopy:       { label:"File Copy",     cat:"Files",   hasFill:true  },
};
const IDS = Object.keys(REGISTRY);

// ── Axis token system ──────────────────────────────────────
const DEFAULT_AXES = {
  terminalCap:       "round",  // round | square
  terminalJoin:      "round",  // round | miter
  cornerRadius:      2,        // 0–6 px
  tension:           0.552,    // 0=chamfer  0.552=circle  1=squircle  2=hyperellipse
  chevronAngle:      90,       // 40–150° tip angle
  dotScale:          1.0,      // 0.5–2.0×
  parallelGap:       2.5,      // edge-to-edge px between co-directional strokes
  endpointClearance: 0,        // px retreat at both ends of every line segment
};

// Which icons respond to each axis (for proof-sheet highlighting)
const AXIS_SENSITIVITY = {
  terminalCap:       ["share","close","plus","arrowRight","chevronRight","editBox"],
  terminalJoin:      ["close","arrowRight","chevronRight"],
  cornerRadius:      ["checkbox","checkboxFilled","document","share","warning","editBox","imageAdd","fileCopy"],
  tension:           ["checkbox","checkboxFilled","document","share","warning","editBox","imageAdd","fileCopy"],
  chevronAngle:      ["chevronRight","arrowRight","share"],
  dotScale:          ["more"],
  parallelGap:       ["document"],
  endpointClearance: ["arrowRight","share","close","plus","checkboxFilled","document","chevronRight","editBox","imageAdd"],
};
// ── Geometry helpers ───────────────────────────────────────

// Rounded / tension-shaped polygon.
// tension=0: chamfer  0.552: circle arc  1: squircle  2: hyperellipse
function corneredPoly(pts, r, tension) {
  if (tension === undefined) tension = 0.552;
  const f = n => +n.toFixed(3);
  if (r <= 0) return pts.map((p,i)=>(i===0?'M':'L')+f(p[0])+','+f(p[1])).join('')+'Z';
  const n = pts.length; let d = '';
  for (let i = 0; i < n; i++) {
    const prev=pts[(i-1+n)%n], curr=pts[i], next=pts[(i+1)%n];
    const v1x=prev[0]-curr[0], v1y=prev[1]-curr[1];
    const v2x=next[0]-curr[0], v2y=next[1]-curr[1];
    const l1=Math.hypot(v1x,v1y), l2=Math.hypot(v2x,v2y);
    const u1x=v1x/l1, u1y=v1y/l1, u2x=v2x/l2, u2y=v2y/l2;
    const dot=Math.max(-1,Math.min(1,u1x*u2x+u1y*u2y));
    const halfAng=Math.acos(dot)/2;
    const t=Math.min(r/Math.tan(halfAng), l1/2, l2/2);
    const t1x=f(curr[0]+u1x*t), t1y=f(curr[1]+u1y*t);
    const t2x=f(curr[0]+u2x*t), t2y=f(curr[1]+u2y*t);
    d += (i===0) ? `M${t1x},${t1y}` : `L${t1x},${t1y}`;
    if (tension <= 0) {
      d += `L${t2x},${t2y}`;
    } else {
      const h1x=f(t1x+tension*(curr[0]-t1x)), h1y=f(t1y+tension*(curr[1]-t1y));
      const h2x=f(t2x+tension*(curr[0]-t2x)), h2y=f(t2y+tension*(curr[1]-t2y));
      d += `C${h1x},${h1y} ${h2x},${h2y} ${t2x},${t2y}`;
    }
  }
  return d+'Z';
}

function corneredRect(x, y, w, h, r, tension) {
  if (tension === undefined) tension = 0.552;
  return corneredPoly([[x,y],[x+w,y],[x+w,y+h],[x,y+h]], r, tension);
}

// Document shape — fold corner stays sharp, other 3 corners use tension.
function documentBodyPath(r, tension) {
  if (tension === undefined) tension = 0.552;
  r = Math.min(r, 4);
  const f = n => +n.toFixed(3);
  if (r <= 0) return "M5,2H14L19,7V22H5Z";
  const ten = Math.max(0, tension);
  const crv = (t1x,t1y, cx,cy, t2x,t2y) => {
    if (ten <= 0) return `L${f(t2x)},${f(t2y)}`;
    const h1x=f(t1x+ten*(cx-t1x)), h1y=f(t1y+ten*(cy-t1y));
    const h2x=f(t2x+ten*(cx-t2x)), h2y=f(t2y+ten*(cy-t2y));
    return `C${h1x},${h1y} ${h2x},${h2y} ${f(t2x)},${f(t2y)}`;
  };
  return (
    `M5,${f(2+r)}` + crv(5,2+r, 5,2, 5+r,2)      // top-left
    + `H14L19,7`                                    // fold (sharp)
    + `V${f(22-r)}` + crv(19,22-r, 19,22, 19-r,22) // bottom-right
    + `H${f(5+r)}`  + crv(5+r,22,  5,22,  5,22-r)  // bottom-left
    + `Z`
  );
}

// Share base U-shape — open at top, 4 corners use tension.
function shareBasePath(r, tension) {
  if (tension === undefined) tension = 0.552;
  r = Math.min(r, 4.5);
  const f = n => +n.toFixed(3);
  if (r <= 0) return "M8,12H4V21H20V12H16";
  const ten = Math.max(0, tension);
  const crv = (t1x,t1y, cx,cy, t2x,t2y) => {
    if (ten <= 0) return `L${f(t2x)},${f(t2y)}`;
    const h1x=f(t1x+ten*(cx-t1x)), h1y=f(t1y+ten*(cy-t1y));
    const h2x=f(t2x+ten*(cx-t2x)), h2y=f(t2y+ten*(cy-t2y));
    return `C${h1x},${h1y} ${h2x},${h2y} ${f(t2x)},${f(t2y)}`;
  };
  return (
    `M8,12H${f(4+r)}`
    + crv(4+r,12,  4,12,  4,12+r)   // TL
    + `V${f(21-r)}`
    + crv(4,21-r,  4,21,  4+r,21)   // BL
    + `H${f(20-r)}`
    + crv(20-r,21, 20,21, 20,21-r)  // BR
    + `V${f(12+r)}`
    + crv(20,12+r, 20,12, 20-r,12)  // TR
    + `H16`
  );
}

function chevronGeom(tipAngle, cx, cy, halfSpan) {
  if (cx===undefined) cx=12; if (cy===undefined) cy=12; if (halfSpan===undefined) halfSpan=6;
  const rad=Math.max(0.02,(tipAngle/2)*Math.PI/180);
  const armLen=+(halfSpan/Math.tan(rad)).toFixed(2);
  const tipX=Math.min(19, +(cx+armLen/2).toFixed(2));
  const tailX=Math.max(5,  +(cx-armLen/2).toFixed(2));
  return { tipX, tailX, points:`${tailX},${cy-halfSpan} ${tipX},${cy} ${tailX},${cy+halfSpan}` };
}

function arrowRightGeom(tipAngle, cy, halfSpan) {
  if (cy===undefined) cy=12; if (halfSpan===undefined) halfSpan=5.5;
  const rad=Math.max(0.02,(tipAngle/2)*Math.PI/180);
  const armLen=Math.min(+(halfSpan/Math.tan(rad)).toFixed(2), 9); // cap depth so narrow angles don't overwhelm
  const tipX=20, tailX=Math.max(6, +(tipX-armLen).toFixed(2));
  return { tipX, tailX, points:`${tailX},${cy-halfSpan} ${tipX},${cy} ${tailX},${cy+halfSpan}` };
}

function shareArrowGeom(tipAngle) {
  const halfSpan=4;
  const rad=Math.max(0.02,(tipAngle/2)*Math.PI/180);
  const armLen=Math.min(+(halfSpan/Math.tan(rad)).toFixed(2), 8); // cap depth for narrow angles
  const tipY=4, tailY=Math.min(10, +(tipY+armLen).toFixed(2));
  return { tipY, tailY, points:`${12-halfSpan},${tailY} 12,${tipY} ${12+halfSpan},${tailY}` };
}

function taperLinePath(x1,y1,x2,y2,sw) {
  const dx=x2-x1, dy=y2-y1, len=Math.hypot(dx,dy);
  if (len<0.01) return '';
  const ux=dx/len, uy=dy/len, px=-uy*sw/2, py=ux*sw/2, ext=sw/2;
  const f=n=>+n.toFixed(3);
  return (
    `M${f(x1-ux*ext)},${f(y1-uy*ext)}`
    +`L${f(x1+px)},${f(y1+py)}L${f(x2+px)},${f(y2+py)}`
    +`L${f(x2+ux*ext)},${f(y2+uy*ext)}`
    +`L${f(x2-px)},${f(y2-py)}L${f(x1-px)},${f(y1-py)}Z`
  );
}

const WARN_PTS = [[12,2],[22,21],[2,21]];

let _uid = 0;

// ── SVG Paths ──────────────────────────────────────────────
function Paths({ id, sw, ks, isFill, fg, bg, skeleton, axes }) {
  if (skeleton === undefined) skeleton = false;
  if (axes === undefined) axes = DEFAULT_AXES;
  const uidRef = useRef(null);
  if (uidRef.current === null) uidRef.current = ++_uid;
  const u = uidRef.current;

  const cap  = skeleton ? "round" : axes.terminalCap;
  const join = skeleton ? "round" : axes.terminalJoin;
  const taper = cap === "taper" && !skeleton;
  const tn  = axes.tension;
  const cr  = axes.cornerRadius;
  const pg  = axes.parallelGap;
  const ec  = skeleton ? 0 : axes.endpointClearance;
  const sc  = skeleton ? 0 : (axes.strokeContrast ?? 0);

  // Effective stroke weight by angle — implements strokeContrast axis
  const eSW = (x1,y1,x2,y2) => {
    if (sc === 0) return sw;
    const vertness = Math.abs(Math.sin(Math.atan2(y2-y1, x2-x1)));
    return +Math.max(0.2, sw*(1 - sc*(1-vertness))).toFixed(3);
  };

  // sp: closed-shape stroke (contrast not applied — angle varies continuously)
  const sp = skeleton
    ? { stroke:"#FF6B2B", strokeWidth:0.4, strokeLinecap:"round", strokeLinejoin:"round", fill:"none" }
    : { stroke:fg, strokeWidth:sw, strokeLinecap:taper?"round":cap, strokeLinejoin:join, fill:"none" };

  // kp: knockout for fill-mode interiors
  const kp = skeleton
    ? { stroke:"#4B9EFF", strokeWidth:0.35, strokeLinecap:"round", strokeLinejoin:"round", fill:"none" }
    : { stroke:bg, strokeWidth:ks, strokeLinecap:cap, strokeLinejoin:join };

  // L: line primitive — endpointClearance + taper
  // e1/e2 override clearance at start/end independently (default = ec)
  const L = (x1,y1,x2,y2, e1, e2) => {
    if (e1===undefined) e1=ec; if (e2===undefined) e2=ec;
    const dx=x2-x1, dy=y2-y1, len=Math.hypot(dx,dy);
    if (len<0.01) return null;
    const ux=dx/len, uy=dy/len;
    const ax1=+(x1+ux*e1).toFixed(3), ay1=+(y1+uy*e1).toFixed(3);
    const ax2=+(x2-ux*e2).toFixed(3), ay2=+(y2-uy*e2).toFixed(3);
    const esw = eSW(x1,y1,x2,y2);
    if (taper) return <path d={taperLinePath(ax1,ay1,ax2,ay2,esw)} fill={fg} stroke="none"/>;
    return <line x1={ax1} y1={ay1} x2={ax2} y2={ay2}
      stroke={fg} strokeWidth={esw} strokeLinecap={cap} strokeLinejoin={join} fill="none"/>;
  };

  // V: chevron/arrowhead — arms as a single <path> with tension-shaped tip joint.
  // Tension 0 → flat chamfer cut at tip; 0.552 → circular arc; >1 → outward bulge past tip.
  // strokeLinecap={cap} applies to tail endpoints (free ends). Tip is shaped by bezier.
  const V = (pts) => {
    const arr = pts.trim().split(/\s+/).map(p=>p.split(',').map(Number));
    const [tl, tp, tb] = arr;
    const f = n => +n.toFixed(3);

    if (taper) {
      const sw1=eSW(tp[0],tp[1],tl[0],tl[1]), sw2=eSW(tp[0],tp[1],tb[0],tb[1]);
      return <>
        <path d={taperLinePath(tp[0],tp[1],tl[0],tl[1],sw1)} fill={fg} stroke="none"/>
        <path d={taperLinePath(tp[0],tp[1],tb[0],tb[1],sw2)} fill={fg} stroke="none"/>
        {join==="round" && <circle cx={tp[0]} cy={tp[1]} r={+(sw/2).toFixed(2)} fill={fg}/>}
      </>;
    }

    // Arm vectors tip→tail
    const d1x=tl[0]-tp[0], d1y=tl[1]-tp[1], l1=Math.hypot(d1x,d1y);
    const d2x=tb[0]-tp[0], d2y=tb[1]-tp[1], l2=Math.hypot(d2x,d2y);
    const u1x=d1x/l1, u1y=d1y/l1;
    const u2x=d2x/l2, u2y=d2y/l2;

    // Cut radius at tip — proportional to stroke weight, max 45% of arm length
    const esw = Math.max(eSW(tp[0],tp[1],tl[0],tl[1]), eSW(tp[0],tp[1],tb[0],tb[1]));
    const r = Math.min(esw * 1.5, l1 * 0.45, l2 * 0.45);

    // Cut points on each arm at distance r from tip
    const c1x=tp[0]+u1x*r, c1y=tp[1]+u1y*r;
    const c2x=tp[0]+u2x*r, c2y=tp[1]+u2y*r;

    // Bezier handles: same formula as corneredPoly
    // tension=0 → handle at cut (chamfer) | 0.552 → circular arc | >1 → bulge past tip
    let tipSeg;
    if (tn <= 0) {
      tipSeg = `L${f(c1x)},${f(c1y)}L${f(c2x)},${f(c2y)}`;
    } else {
      const h1x=f(c1x+tn*(tp[0]-c1x)), h1y=f(c1y+tn*(tp[1]-c1y));
      const h2x=f(c2x+tn*(tp[0]-c2x)), h2y=f(c2y+tn*(tp[1]-c2y));
      tipSeg = `L${f(c1x)},${f(c1y)}C${h1x},${h1y} ${h2x},${h2y} ${f(c2x)},${f(c2y)}`;
    }

    const d = `M${f(tl[0])},${f(tl[1])}${tipSeg}L${f(tb[0])},${f(tb[1])}`;
    return <path d={d} stroke={fg} strokeWidth={esw}
      strokeLinecap={cap} strokeLinejoin={join} fill="none"/>;
  };

  switch (id) {

    case "document": {
      const dPath = documentBodyPath(cr, tn);
      const midY = 14;
      const halfGap = (sw + pg) / 2;
      const y1 = +(midY - halfGap).toFixed(2);
      const y2 = +(midY + halfGap).toFixed(2);  // both lines distribute from center as pg changes
      if (isFill && !skeleton) return <>
        <defs><clipPath id={`dc${u}`}><path d={dPath}/></clipPath></defs>
        <path d={dPath} fill={fg}/>
        <g clipPath={`url(#dc${u})`}>
          <path d="M14,2V7H19" fill="none" {...kp}/>
          <line x1="8" y1={y1} x2="16" y2={y1} {...kp}/>
          <line x1="8" y1={y2} x2="14" y2={y2} {...kp}/>
        </g>
      </>;
      return <>
        <path d={dPath} {...sp}/>
        <polyline points="14,2 14,7 19,7" {...sp} strokeLinecap="butt"/>
        {L(8,y1,16,y1)} {L(8,y2,14,y2)}
      </>;
    }

    case "share": {
      const sPath = shareBasePath(cr, tn);
      const sa    = shareArrowGeom(axes.chevronAngle);
      // Square cap fix: pull shaft tip back same as taper to avoid bleeding past V tip
      const shaftY2 = (taper || cap==="square") ? sa.tipY + sw*0.5 : sa.tipY;
      // ec at shaft bottom (grows gap into U-box); shaft top connects flush to V tip (e2=0)
      return <>
        {L(12, 15, 12, shaftY2, ec, 0)}
        {V(sa.points)}
        {taper ? <path d={sPath} fill={fg} stroke="none"/> : <path d={sPath} {...sp}/>}
      </>;
    }

    case "globe": {
      const lineClipR = +(9+sw/2).toFixed(2);
      const skS = skeleton ? "#FF6B2B" : null;
      if (isFill && !skeleton) return <>
        <defs><clipPath id={`gf${u}`}><circle cx="12" cy="12" r="9"/></clipPath></defs>
        <circle cx="12" cy="12" r="9" fill={fg}/>
        <g clipPath={`url(#gf${u})`}>
          <ellipse cx="12" cy="12" rx="4.5" ry="9" fill="none" {...kp}/>
          <line x1="0" y1="12" x2="24" y2="12" stroke={bg} strokeWidth={ks} strokeLinecap="butt"/>
        </g>
      </>;
      if (skeleton) return <>
        <defs><clipPath id={`gs${u}`}><circle cx="12" cy="12" r={lineClipR}/></clipPath></defs>
        <circle cx="12" cy="12" r="9" stroke={skS} strokeWidth={0.4} fill="none"/>
        <g clipPath={`url(#gs${u})`}>
          <ellipse cx="12" cy="12" rx="4.5" ry="9" stroke={skS} strokeWidth={0.4} fill="none"/>
          <line x1="0" y1="12" x2="24" y2="12" stroke={skS} strokeWidth={0.4} strokeLinecap="butt"/>
        </g>
      </>;
      return <>
        <defs><clipPath id={`gl${u}`}><circle cx="12" cy="12" r={lineClipR}/></clipPath></defs>
        <circle cx="12" cy="12" r="9" {...sp}/>
        <g clipPath={`url(#gl${u})`}>
          <ellipse cx="12" cy="12" rx="4.5" ry="9" {...sp}/>
          <line x1="0" y1="12" x2="24" y2="12" stroke={fg} strokeWidth={sw} strokeLinecap="butt"/>
        </g>
      </>;
    }

    case "warning": {
      const wPath = corneredPoly(WARN_PTS, cr, tn);
      const dotR  = +(Math.max(0.9, sw*0.72)).toFixed(2);
      // dotCy = max(17-ec, stemVisualBottom + gap + dotR)
      // stemVisualBottom = (14.5 - ec) + sw/2 (round cap extends past endpoint)
      // This ensures dot never crowds stem at heavier weights
      const stemBottom = 14.5 - ec + sw/2;
      const dotCy = +(Math.max(17 - ec, stemBottom + sw*0.4 + dotR)).toFixed(2);
      const dotCyFill = +(Math.max(17 - ec, stemBottom + (ks-sw)/2 + sw*0.4 + dotR)).toFixed(2);
      if (isFill && !skeleton) return <>
        <defs><clipPath id={`wf${u}`}><path d={wPath}/></clipPath></defs>
        <path d={wPath} fill={fg}/>
        <g clipPath={`url(#wf${u})`}>
          <line x1="12" y1="8.5" x2="12" y2="14.5" stroke={bg} strokeWidth={ks} strokeLinecap="round"/>
          <circle cx="12" cy={dotCyFill} r={+(ks*0.55).toFixed(2)} fill={bg}/>
        </g>
      </>;
      return <>
        <path d={wPath} {...sp}/>
        {L(12,8.5,12,14.5)}
        <circle cx="12" cy={dotCy} r={dotR} fill={fg}/>
      </>;
    }

    case "error": {
      if (isFill && !skeleton) return <>
        <defs><clipPath id={`ef${u}`}><circle cx="12" cy="12" r="9"/></clipPath></defs>
        <circle cx="12" cy="12" r="9" fill={fg}/>
        <g clipPath={`url(#ef${u})`}>
          <line x1="8.5" y1="8.5" x2="15.5" y2="15.5" stroke={bg} strokeWidth={ks} strokeLinecap="round"/>
          <line x1="15.5" y1="8.5" x2="8.5" y2="15.5" stroke={bg} strokeWidth={ks} strokeLinecap="round"/>
        </g>
      </>;
      return <>
        <circle cx="12" cy="12" r="9" {...sp}/>
        {L(8.5,8.5,15.5,15.5)} {L(15.5,8.5,8.5,15.5)}
      </>;
    }

    case "close":
      return <>{L(6,6,18,18)} {L(18,6,6,18)}</>;

    case "plus":
      return <>{L(12,5,12,19)} {L(5,12,19,12)}</>;

    case "checkbox":
      return <path d={corneredRect(4,4,16,16,cr,tn)} {...sp}/>;

    case "checkboxFilled": {
      const cbPath = corneredRect(4,4,16,16,cr,tn);
      // Checkmark as single polyline — ec applies only at true endpoints,
      // not at the internal bend (10.5,15) which is a join.
      const ckRaw = [[7.5,12],[10.5,15],[16.5,9]];
      const ckPts = () => {
        if (ec <= 0) return "7.5,12 10.5,15 16.5,9";
        const d0x=ckRaw[1][0]-ckRaw[0][0], d0y=ckRaw[1][1]-ckRaw[0][1], l0=Math.hypot(d0x,d0y);
        const d1x=ckRaw[2][0]-ckRaw[1][0], d1y=ckRaw[2][1]-ckRaw[1][1], l1=Math.hypot(d1x,d1y);
        const p0=[+(ckRaw[0][0]+d0x/l0*ec).toFixed(2), +(ckRaw[0][1]+d0y/l0*ec).toFixed(2)];
        const p2=[+(ckRaw[2][0]-d1x/l1*ec).toFixed(2), +(ckRaw[2][1]-d1y/l1*ec).toFixed(2)];
        return `${p0[0]},${p0[1]} 10.5,15 ${p2[0]},${p2[1]}`;
      };
      if (isFill && !skeleton) return <>
        <defs><clipPath id={`cb${u}`}><path d={cbPath}/></clipPath></defs>
        <path d={cbPath} fill={fg}/>
        <g clipPath={`url(#cb${u})`}><polyline points="7.5,12 10.5,15 16.5,9" fill="none" {...kp}/></g>
      </>;
      return <>
        <path d={cbPath} {...sp}/>
        <polyline points={ckPts()} stroke={fg} strokeWidth={sw}
          strokeLinecap={cap} strokeLinejoin={join} fill="none"/>
      </>;
    }

    case "arrowRight": {
      const g = arrowRightGeom(axes.chevronAngle);
      // Square cap extends sw/2 past endpoint — same pullback as taper to avoid bleeding past V tip
      const shaftX2 = (taper || cap==="square") ? g.tipX - sw*0.5 : g.tipX;
      // ec only at shaft tail (x=4); right end connects flush to V tip (e2=0)
      return <>{L(4,12,shaftX2,12, ec, 0)} {V(g.points)}</>;
    }

    case "chevronRight":
      return V(chevronGeom(axes.chevronAngle).points);

    case "more": {
      const r = skeleton ? 0.5 : +Math.max(0.8, sw*axes.dotScale).toFixed(2);
      const df=skeleton?"none":fg, ds=skeleton?"#FF6B2B":"none", dw=skeleton?0.4:0;
      return <>
        <circle cx="5"  cy="12" r={r} fill={df} stroke={ds} strokeWidth={dw}/>
        <circle cx="12" cy="12" r={r} fill={df} stroke={ds} strokeWidth={dw}/>
        <circle cx="19" cy="12" r={r} fill={df} stroke={ds} strokeWidth={dw}/>
      </>;
    }

    case "editBox": {
      const boxPath = corneredRect(3, 5, 14, 16, cr, tn);
      const ex=20, ey=4, tx=13.5, ty=10.5;
      const dx=tx-ex, dy=ty-ey, pLen=Math.hypot(dx,dy);
      const ux=dx/pLen, uy=dy/pLen;
      const px=-uy*0.85, py=ux*0.85;
      const a1x=+(ex+px).toFixed(2), a1y=+(ey+py).toFixed(2);
      const a2x=+(tx+px).toFixed(2), a2y=+(ty+py).toFixed(2);
      const b1x=+(ex-px).toFixed(2), b1y=+(ey-py).toFixed(2);
      const b2x=+(tx-px).toFixed(2), b2y=+(ty-py).toFixed(2);
      const n1x=+(tx+px*0.94).toFixed(2), n1y=+(ty+py*0.94).toFixed(2);
      const n2x=+(tx-px*0.94).toFixed(2), n2y=+(ty-py*0.94).toFixed(2);
      const koR = +(sw*1.6+1.0).toFixed(2);
      if (isFill && !skeleton) return <>
        <defs><clipPath id={`eb${u}`}><path d={boxPath}/></clipPath></defs>
        <path d={boxPath} fill={fg}/>
        <circle cx={ex} cy={ey} r={koR} fill={bg}/>
        {L(a1x,a1y,a2x,a2y)} {L(b1x,b1y,b2x,b2y)} {L(n1x,n1y,n2x,n2y)}
      </>;
      return <>
        <path d={boxPath} {...sp}/>
        {L(a1x,a1y,a2x,a2y)} {L(b1x,b1y,b2x,b2y)} {L(n1x,n1y,n2x,n2y)}
      </>;
    }

    case "imageAdd": {
      const frame = corneredRect(2, 3, 18, 14, cr, tn);
      const bx=17.5, by=14.5, armL=2.5;
      if (isFill && !skeleton) return <>
        <defs><clipPath id={`ia${u}`}><path d={frame}/></clipPath></defs>
        <path d={frame} fill={fg}/>
        <g clipPath={`url(#ia${u})`}>
          <circle cx="7" cy="8" r="2" fill="none" stroke={bg} strokeWidth={ks} strokeLinecap="butt"/>
          <polyline points="2,16 7,10 12,13 17,7" stroke={bg} strokeWidth={ks} fill="none"
            strokeLinecap="round" strokeLinejoin="round"/>
        </g>
        {L(bx-armL,by,bx+armL,by)} {L(bx,by-armL,bx,by+armL)}
      </>;
      return <>
        <path d={frame} {...sp}/>
        <circle cx="7" cy="8" r="2" {...sp}/>
        <polyline points="2,16 7,10 12,13 17,7" {...sp}/>
        {L(bx-armL,by,bx+armL,by)} {L(bx,by-armL,bx,by+armL)}
      </>;
    }

    case "fileCopy": {
      const front = corneredRect(3,   6.5, 13, 14, cr, tn);
      const back  = corneredRect(5.5, 4,   13, 14, cr, tn);
      if (isFill && !skeleton) return <>
        <path d={back}  fill={fg}/>
        <path d={front} fill={bg} {...sp} stroke={fg}/>
      </>;
      return <>
        <path d={back}  {...sp}/>
        <path d={front} fill={bg} stroke={fg} strokeWidth={sw}
          strokeLinecap={taper?"round":cap} strokeLinejoin={join}/>
      </>;
    }

    default: return null;
  }
}
// ── Ico (small, no zoom) ───────────────────────────────────
function Ico({ id, weight, style, size=24, fg, bg, C, axes=DEFAULT_AXES }) {
  const wc     = BASE_WC[weight];
  const sw     = wc.sw;
  const ks     = +(sw * wc.koMult).toFixed(2);
  const isFill = style === "fill" && REGISTRY[id]?.hasFill;
  const bgColor = (!bg || bg === "transparent") ? C.bg : bg;
  return (
    <div style={{ width:size, height:size, flexShrink:0 }}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Paths id={id} sw={sw} ks={ks} isFill={isFill} fg={fg ?? C.fg} bg={bgColor} axes={axes}/>
      </svg>
    </div>
  );
}

// ── ZoomStage ──────────────────────────────────────────────
// zoom + pan are LIFTED to App so they persist across weight / style /
// theme changes. They only reset when the selected icon changes.
// Grid lines are drawn in screen-pixel space (outside the transform)
// so they are always crisp 1px regardless of zoom level.
// Material Design keylines are always visible as a faint reference layer.
function ZoomStage({ id, weight, style, density, skeleton, showGrid,
                     zoom, setZoom, pan, setPan, C, axes=DEFAULT_AXES }) {
  const stageRef = useRef(null);
  const [stageW, setStageW] = useState(278);
  const STAGE_H = 210;
  const dragging  = useRef(false);
  const lastMouse = useRef({ x:0, y:0 });
  const lastPinch = useRef(null);

  useEffect(() => {
    const el = stageRef.current; if (!el) return;
    const ro = new ResizeObserver(([e]) => setStageW(e.contentRect.width));
    ro.observe(el); return () => ro.disconnect();
  }, []);

  const clamp = v => Math.min(40, Math.max(0.4, v));

  const onWheel = useCallback(e => {
    e.preventDefault();
    setZoom(z => clamp(z * (e.deltaY < 0 ? 1.12 : 1/1.12)));
  }, [setZoom]);

  useEffect(() => {
    const el = stageRef.current; if (!el) return;
    el.addEventListener("wheel", onWheel, { passive:false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [onWheel]);

  const onMD = e => { dragging.current=true; lastMouse.current={x:e.clientX,y:e.clientY}; };
  const onMM = e => {
    if (!dragging.current) return;
    setPan(p => ({ x:p.x+e.clientX-lastMouse.current.x, y:p.y+e.clientY-lastMouse.current.y }));
    lastMouse.current = {x:e.clientX, y:e.clientY};
  };
  const onMU = () => { dragging.current = false; };

  const onTS = e => {
    if (e.touches.length===2) {
      const dx=e.touches[0].clientX-e.touches[1].clientX, dy=e.touches[0].clientY-e.touches[1].clientY;
      lastPinch.current = { dist:Math.hypot(dx,dy), zoom };
    } else { dragging.current=true; lastMouse.current={x:e.touches[0].clientX,y:e.touches[0].clientY}; }
  };
  const onTM = e => {
    e.preventDefault();
    if (e.touches.length===2 && lastPinch.current) {
      const dx=e.touches[0].clientX-e.touches[1].clientX, dy=e.touches[0].clientY-e.touches[1].clientY;
      setZoom(clamp(lastPinch.current.zoom * Math.hypot(dx,dy)/lastPinch.current.dist));
    } else if (e.touches.length===1 && dragging.current) {
      setPan(p => ({ x:p.x+e.touches[0].clientX-lastMouse.current.x, y:p.y+e.touches[0].clientY-lastMouse.current.y }));
      lastMouse.current = {x:e.touches[0].clientX, y:e.touches[0].clientY};
    }
  };
  const onTE = () => { dragging.current=false; lastPinch.current=null; };

  const wc     = BASE_WC[weight];
  const sw     = wc.sw;
  const ks     = +(sw * wc.koMult).toFixed(2);
  const isFill = style==="fill" && REGISTRY[id]?.hasFill;
  const physPx = 24 * density;
  const skBg   = skeleton ? (C.isLight ? "#F0F2FF" : "#070A12") : C.s2;

  // Convert SVG units (0–24) → stage CSS px
  // S = scale factor: 1 SVG unit = S screen px
  const S    = zoom * density;
  const stageCx = stageW/2 + pan.x;
  const stageCy = STAGE_H/2 + pan.y;
  const s2x  = u => stageCx + (u - 12) * S;
  const s2y  = v => stageCy + (v - 12) * S;

  // Icon bounding box in screen px (for clipping grid lines to icon area)
  const iL = s2x(0), iR = s2x(24), iT = s2y(0), iB = s2y(24);

  // ── Grid lines (screen-space, only when showGrid) ──
  const gridLines = [];
  if (showGrid) {
    // Physical sub-pixel lines (density > 1 only)
    if (density > 1) {
      for (let i=0; i <= physPx; i++) {
        if (i % density === 0) continue;
        const sx = s2x(i / density), sy = s2y(i / density);
        const sub = C.isLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.04)";
        if (sx >= iL-1 && sx <= iR+1)
          gridLines.push(<line key={`pv${i}`} x1={sx} y1={iT} x2={sx} y2={iB} stroke={sub} strokeWidth="1"/>);
        if (sy >= iT-1 && sy <= iB+1)
          gridLines.push(<line key={`ph${i}`} x1={iL} y1={sy} x2={iR} y2={sy} stroke={sub} strokeWidth="1"/>);
      }
    }
    // Logical pixel boundaries
    for (let l=0; l <= 24; l++) {
      const sx = s2x(l), sy = s2y(l);
      const isMid = l === 12;
      const logCol = C.isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)";
      if (sx >= iL-1 && sx <= iR+1)
        gridLines.push(<line key={`lv${l}`} x1={sx} y1={iT} x2={sx} y2={iB}
          stroke={isMid ? C.green : logCol} strokeWidth="1" opacity={isMid ? 0.30 : 1}/>);
      if (sy >= iT-1 && sy <= iB+1)
        gridLines.push(<line key={`lh${l}`} x1={iL} y1={sy} x2={iR} y2={sy}
          stroke={isMid ? C.green : logCol} strokeWidth="1" opacity={isMid ? 0.30 : 1}/>);
    }
  }

  // 24×24 icon boundary box — always shown, slightly stronger than grid lines
  const boundaryCol = C.isLight ? "rgba(0,0,0,0.18)" : "rgba(255,255,255,0.18)";
  const boundaryBox = (
    <rect key="bbox" x={iL} y={iT} width={iR-iL} height={iB-iT}
      fill="none" stroke={boundaryCol} strokeWidth="1"/>
  );

  // ── Material Design keylines (always shown) ──
  // Circle 20dp (r=10), Square 18×18, Wide rect 20×16, Tall rect 16×20
  const klC = C.isLight ? "rgba(40,80,200,0.32)" : "rgba(120,160,255,0.38)";
  const klW = "0.75";
  const klDash = "3,2";
  const keylines = [
    <circle key="kl-c" cx={stageCx} cy={stageCy} r={10*S}
      fill="none" stroke={klC} strokeWidth={klW} strokeDasharray={klDash}/>,
    <rect key="kl-sq" x={s2x(3)} y={s2y(3)} width={18*S} height={18*S}
      fill="none" stroke={klC} strokeWidth={klW} strokeDasharray={klDash}/>,
    <rect key="kl-wr" x={s2x(2)} y={s2y(4)} width={20*S} height={16*S}
      fill="none" stroke={klC} strokeWidth={klW} strokeDasharray={klDash}/>,
    <rect key="kl-tr" x={s2x(4)} y={s2y(2)} width={16*S} height={20*S}
      fill="none" stroke={klC} strokeWidth={klW} strokeDasharray={klDash}/>,
  ];

  return (
    <div>
      <div ref={stageRef}
        onMouseDown={onMD} onMouseMove={onMM} onMouseUp={onMU} onMouseLeave={onMU}
        onTouchStart={onTS} onTouchMove={onTM} onTouchEnd={onTE}
        style={{ background:skBg, border:`1px solid ${C.bd}`, borderRadius:6,
                 height:STAGE_H, position:"relative", overflow:"hidden",
                 cursor:"crosshair", userSelect:"none", touchAction:"none" }}
      >
        {/* Icon (CSS-transformed, not the grid) */}
        <div style={{ position:"absolute", left:stageCx, top:stageCy,
                      transform:`translate(-50%,-50%) scale(${zoom})`,
                      transformOrigin:"center center",
                      imageRendering: density===1 ? "pixelated" : "auto" }}>
          <svg width={physPx} height={physPx} viewBox="0 0 24 24" fill="none">
            <Paths id={id} sw={sw} ks={ks} isFill={isFill}
                   fg={skeleton?"transparent":C.fg}
                   bg={skeleton?skBg:C.s2}
                   skeleton={skeleton}
                   axes={axes}/>
          </svg>
        </div>

        {/* Grid + keylines overlay: drawn in screen-pixel space, always crisp */}
        <svg style={{ position:"absolute", inset:0, pointerEvents:"none", zIndex:2, overflow:"visible" }}
             width={stageW} height={STAGE_H}>
          {boundaryBox}
          {keylines}
          {gridLines}
        </svg>

        {skeleton && (
          <div style={{ position:"absolute", top:8, left:8, zIndex:3, display:"flex", gap:8,
                        fontSize:11, fontFamily:SYS,
                        background:C.isLight?"rgba(255,255,255,0.8)":"rgba(0,0,0,0.6)",
                        padding:"3px 8px", borderRadius:3 }}>
            <span style={{color:"#FF6B2B"}}>— stroke</span>
            <span style={{color:"#4B9EFF"}}>— knockout</span>
          </div>
        )}
        <div style={{ position:"absolute", bottom:7, right:8, zIndex:3,
                      fontSize:11, fontFamily:SYS, color:C.fgm,
                      background:C.isLight?"rgba(255,255,255,0.65)":"rgba(0,0,0,0.45)",
                      padding:"2px 7px", borderRadius:3 }}>
          {zoom > 1.05 ? `${zoom.toFixed(1)}×` : "scroll · pinch · drag"}
        </div>
      </div>

      {/* Pixel math row */}
      <div style={{ display:"flex", justifyContent:"space-between",
                    fontSize:11, fontFamily:SYS, color:C.fgd, padding:"5px 1px 0" }}>
        <span>24 logical px</span>
        <span>{density}× = {physPx}px physical</span>
        <span>stroke {+(sw*density).toFixed(1)} phys</span>
        <span>ko {+(ks*density).toFixed(1)} phys</span>
      </div>
    </div>
  );
}

// ── UI Context Preview ──────────────────────────────────────
function UIContextPreview({ id, weight, style, C, axes=DEFAULT_AXES }) {
  const name = REGISTRY[id]?.label ?? id;
  const bodyFw = weight;
  const surfaces = [
    { key:"default",  bg:C.s1,  fg:C.fg,  bd:C.bd },
    { key:"inverted", bg:C.fg,  fg:C.bg,  bd:"transparent" },
    { key:"subtle",   bg:C.s2,  fg:C.fgd, bd:C.bd },
    { key:"accent",   bg:C.acc, fg:"#fff", bd:"transparent" },
  ];
  const rows = [
    { label:"Button md — icon + label", sz:16, fs:13, fw:500, px:12, py:7,  label2:true  },
    { label:"Button md — icon only",    sz:16, fs:13, fw:500, px:8,  py:7,  label2:false },
    { label:"Button sm — icon + label", sz:13, fs:11, fw:500, px:9,  py:5,  label2:true  },
    { label:"Button sm — icon only",    sz:13, fs:11, fw:500, px:5,  py:5,  label2:false },
    { label:"Nav item",                 sz:18, fs:13, fw:400, px:10, py:7,  label2:true  },
    { label:"List row",                 sz:20, fs:14, fw:400, px:12, py:8,  label2:true  },
    { label:"Label xs",                 sz:11, fs:10, fw:500, px:7,  py:3,  label2:true  },
  ];
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      {rows.map(row=>(
        <div key={row.label}>
          <div style={{ fontSize:12, fontFamily:SYS, color:C.fgd, marginBottom:5 }}>{row.label}</div>
          <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
            {surfaces.map(s=>(
              <div key={s.key} style={{
                background:s.bg, border:`1px solid ${s.bd}`, borderRadius:5,
                padding:`${row.py}px ${row.px}px`,
                display:"flex", alignItems:"center", gap:row.label2?6:0, cursor:"default",
              }}>
                <Ico id={id} weight={weight} style={style} size={row.sz}
                  fg={s.fg} bg={s.bg} C={C} axes={axes}/>
                {row.label2 && (
                  <span style={{ fontSize:row.fs, fontWeight:bodyFw,
                                 fontFamily:SYS, color:s.fg,
                                 lineHeight:1, whiteSpace:"nowrap" }}>{name}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
      <div>
        <div style={{ fontSize:12, fontFamily:SYS, color:C.fgd, marginBottom:6 }}>Standalone sizes</div>
        <div style={{ display:"flex", alignItems:"flex-end", gap:14 }}>
          {[12,16,20,24,32].map(sz=>(
            <div key={sz} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
              <Ico id={id} weight={weight} style={style} size={sz} C={C} axes={axes}/>
              <span style={{ fontSize:11, fontFamily:SYS, color:C.fgd }}>{sz}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Theme toggle ────────────────────────────────────────────
function ThemeToggle({ isDark, onToggle }) {
  return (
    <button onClick={onToggle} style={{
      display:"flex", alignItems:"center", gap:7, fontFamily:SYS,
      background:isDark?"#1A1A1A":"#E0DBD2",
      border:`1.5px solid ${isDark?"#303030":"#C0BAB0"}`,
      borderRadius:20, padding:"4px 10px 4px 8px",
      cursor:"pointer", transition:"all 0.18s", userSelect:"none",
    }}>
      <span style={{ fontSize:13, lineHeight:1 }}>{isDark ? "☾" : "☀"}</span>
      <div style={{ width:26, height:13, borderRadius:7,
                    background:isDark?"#282828":"#C4BFB5",
                    position:"relative", transition:"background 0.18s" }}>
        <div style={{ position:"absolute", top:2, left:isDark?13:2,
                      width:7, height:7, borderRadius:"50%",
                      background:isDark?"#FF6B2B":"#C94B0A",
                      transition:"left 0.18s",
                      boxShadow:isDark?"0 0 5px #FF6B2B77":"none" }}/>
      </div>
      <span style={{ fontSize:11, color:isDark?"#505050":"#8A837A", fontWeight:500 }}>
        {isDark ? "Dark" : "Light"}
      </span>
    </button>
  );
}

function Btn({ active, onClick, children, C }) {
  return (
    <button onClick={onClick} style={{
      background:active?C.acc:"transparent", color:active?"#fff":C.fgd,
      border:`1px solid ${active?C.acc:C.bd2}`,
      borderRadius:4, padding:"4px 11px", fontSize:12,
      cursor:"pointer", fontFamily:SYS, fontWeight:active?600:400,
      transition:"all 0.12s", lineHeight:1.4, whiteSpace:"nowrap",
    }}>{children}</button>
  );
}
function Label({ children, C }) {
  return <span style={{ fontSize:11, color:C.fgd, letterSpacing:"0.06em",
    textTransform:"uppercase", fontFamily:SYS, fontWeight:600 }}>{children}</span>;
}
function Divider({ C }) {
  return <div style={{ width:1, height:18, background:C.bd2, flexShrink:0 }}/>;
}

// ── Axis UI components ─────────────────────────────────────

// Custom slider with live value, default marker, and optional inline preview
function AxisSlider({ label, value, min, max, step=1, defaultVal, unit="", fmt, onChange, C, preview }) {
  const pct    = ((value - min) / (max - min)) * 100;
  const defPct = ((defaultVal - min) / (max - min)) * 100;
  const changed  = value !== defaultVal;
  const display  = fmt ? fmt(value) : `${value}${unit}`;
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <span style={{ fontSize:12, fontFamily:SYS, color:C.fgd }}>{label}</span>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          {preview && <div style={{ color:C.fgd, lineHeight:0 }}>{preview(value)}</div>}
          <span style={{
            fontSize:13, fontFamily:SYS, fontWeight:600, minWidth:40, textAlign:"right",
            color:changed ? C.acc : C.fg, fontVariantNumeric:"tabular-nums",
            transition:"color 0.15s",
          }}>{display}</span>
        </div>
      </div>
      <div style={{ position:"relative", height:22, display:"flex", alignItems:"center" }}>
        <div style={{ position:"absolute", left:0, right:0, height:3, background:C.s3, borderRadius:2 }}/>
        <div style={{
          position:"absolute", left:0, width:`${pct}%`, height:3,
          background:changed ? C.acc : C.bd2, borderRadius:2, transition:"background 0.15s",
        }}/>
        <div style={{
          position:"absolute", left:`${defPct}%`, top:"50%",
          transform:"translate(-50%,-50%)",
          width:2, height:10, background:C.bd2, borderRadius:1, pointerEvents:"none",
        }}/>
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(Number(e.target.value))}
          style={{ position:"absolute", inset:0, opacity:0, cursor:"pointer", width:"100%", margin:0 }}
        />
        <div style={{
          position:"absolute", left:`${pct}%`, top:"50%",
          transform:"translate(-50%,-50%)",
          width:15, height:15, borderRadius:"50%", pointerEvents:"none",
          background:changed ? C.acc : C.s1,
          border:`2px solid ${changed ? C.acc : C.bd2}`,
          boxShadow:"0 1px 4px rgba(0,0,0,0.35)",
          transition:"background 0.15s, border-color 0.15s",
        }}/>
      </div>
    </div>
  );
}

// Segmented selector with inline SVG preview glyphs
function SegCtrl({ options, value, onChange, C, vbW=24, vbH=14 }) {
  return (
    <div style={{ display:"flex", gap:2, background:C.s3, borderRadius:5, padding:2 }}>
      {options.map(opt => {
        const active = value === opt.value;
        return (
          <button key={opt.value} onClick={() => onChange(opt.value)} style={{
            flex:1, padding:"6px 4px 5px", border:"none", cursor:"pointer", borderRadius:4,
            background:active ? C.s1 : "transparent",
            color:active ? C.fg : C.fgd,
            fontFamily:SYS, fontSize:10, fontWeight:active ? 600 : 400,
            display:"flex", flexDirection:"column", alignItems:"center", gap:3,
            boxShadow:active ? "0 1px 3px rgba(0,0,0,0.2)" : "none",
            transition:"all 0.1s",
          }}>
            {opt.icon && (
              <svg width={vbW} height={vbH} viewBox={`0 0 ${vbW} ${vbH}`} fill="none"
                style={{ color: active ? C.fg : C.fgd, overflow:"visible" }}>
                {opt.icon}
              </svg>
            )}
            <span style={{ letterSpacing:"0.02em" }}>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// Collapsible axis group
function AxisSection({ title, children, C, changed=false }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ borderBottom:`1px solid ${C.bd}` }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width:"100%", padding:"11px 16px",
        display:"flex", alignItems:"center", justifyContent:"space-between",
        background:"none", border:"none", cursor:"pointer", fontFamily:SYS,
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:7 }}>
          {changed && <div style={{ width:5, height:5, borderRadius:"50%", background:C.acc, flexShrink:0 }}/>}
          <span style={{ fontSize:10, color:C.fgd, fontWeight:700, letterSpacing:"0.08em",
                          textTransform:"uppercase", fontFamily:SYS }}>{title}</span>
        </div>
        <span style={{
          fontSize:11, color:C.fgm, display:"inline-block",
          transform:open ? "rotate(90deg)" : "none", transition:"transform 0.15s",
        }}>›</span>
      </button>
      {open && <div style={{ padding:"2px 16px 16px" }}>{children}</div>}
    </div>
  );
}

// ── Axis Playground ────────────────────────────────────────
function AxisPlayground({ axes, setAxes, weight, style, C }) {
  const [activeAxis, setActiveAxis] = useState(null);
  const [showDiff,   setShowDiff]   = useState(false);
  const timerRef = useRef(null);

  const setAx = useCallback((key, val) => {
    setAxes(prev => ({ ...prev, [key]: val }));
    setActiveAxis(key);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setActiveAxis(null), 2200);
  }, [setAxes]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const isDefault = JSON.stringify(axes) === JSON.stringify(DEFAULT_AXES);
  const groupChanged = (keys) => keys.some(k => axes[k] !== DEFAULT_AXES[k]);
  const activeSensitive = activeAxis ? (AXIS_SENSITIVITY[activeAxis] || []) : null;

  const cr = axes.cornerRadius;
  const tn = axes.tension;
  const capOptions = [
    { value:"round",  label:"Round",
      icon:<line x1="2" y1="7" x2="18" y2="7" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round"/> },
    { value:"square", label:"Square",
      icon:<line x1="2" y1="7" x2="18" y2="7" stroke="currentColor" strokeWidth="4.5" strokeLinecap="square"/> },
  ];
  const joinOptions = [
    { value:"round", label:"Round", icon:<polyline points="2,13 12,1 22,13" stroke="currentColor" strokeWidth="3" strokeLinejoin="round"  fill="none"/> },
    { value:"miter", label:"Miter", icon:<polyline points="2,13 12,1 22,13" stroke="currentColor" strokeWidth="3" strokeLinejoin="miter" strokeMiterlimit="20" fill="none"/> },
  ];


  return (
    <div style={{ display:"flex", height:"calc(100vh - 95px)", overflow:"hidden" }}>

      {/* ── Left: controls ── */}
      <div style={{ width:296, borderRight:`1px solid ${C.bd}`, background:C.s1,
                    overflowY:"auto", flexShrink:0, display:"flex", flexDirection:"column" }}>

        {/* Header */}
        <div style={{ padding:"14px 16px 12px", borderBottom:`1px solid ${C.bd}`,
                      display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontSize:13, fontFamily:SYS, fontWeight:700, color:C.fg }}>Axis Engine</div>
            <div style={{ fontSize:11, fontFamily:SYS, color:C.fgd, marginTop:2 }}>
              Parametric token system
            </div>
          </div>
          {!isDefault && (
            <button onClick={() => setAxes({...DEFAULT_AXES})} style={{
              background:"none", border:`1px solid ${C.bd2}`, borderRadius:4,
              color:C.fgd, cursor:"pointer", padding:"3px 9px",
              fontSize:11, fontFamily:SYS, transition:"all 0.1s",
            }}>Reset all</button>
          )}
        </div>

        {/* ── TERMINALS ── */}
        <AxisSection title="Terminals" C={C} changed={groupChanged(["terminalCap","terminalJoin"])}>
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:11, color:C.fgd, fontFamily:SYS, marginBottom:7 }}>Line cap</div>
            <SegCtrl C={C} value={axes.terminalCap} onChange={v=>setAx("terminalCap",v)} options={capOptions}/>
          </div>
          <div>
            <div style={{ fontSize:11, color:C.fgd, fontFamily:SYS, marginBottom:7 }}>Corner join</div>
            <SegCtrl C={C} value={axes.terminalJoin} onChange={v=>setAx("terminalJoin",v)} options={joinOptions} vbH={15}/>
          </div>
        </AxisSection>

        {/* ── CORNERS ── */}
        <AxisSection title="Corners" C={C} changed={groupChanged(["cornerRadius","tension"])}>
          <div style={{ marginBottom:16 }}>
            <AxisSlider C={C} label="Radius" value={cr} min={0} max={6} step={0.5}
              defaultVal={DEFAULT_AXES.cornerRadius} unit="px"
              onChange={v=>setAx("cornerRadius",v)}
              preview={v => (
                <svg width="26" height="20" viewBox="0 0 24 18" fill="none">
                  <path d={corneredRect(1,1,22,16,v,tn)}
                    stroke="currentColor" strokeWidth="1.5" fill="none"/>
                </svg>
              )}
            />
          </div>
          <div>
            <AxisSlider C={C} label="Tension" value={tn} min={0} max={2} step={0.05}
              defaultVal={DEFAULT_AXES.tension}
              fmt={v => {
                if (v < 0.05) return "Chamfer";
                if (Math.abs(v-0.552)<0.04) return "Circle";
                if (Math.abs(v-1)<0.04) return "Squircle";
                if (v >= 1.9) return "Hyper";
                return v.toFixed(2);
              }}
              onChange={v=>setAx("tension",v)}
              preview={v => (
                <svg width="26" height="20" viewBox="0 0 24 18" fill="none">
                  <path d={corneredRect(1,1,22,16,Math.max(cr,2.5),v)}
                    stroke="currentColor" strokeWidth="1.5" fill="none"/>
                </svg>
              )}
            />
          </div>
        </AxisSection>

        {/* ── GEOMETRY ── */}
        <AxisSection title="Geometry" C={C} changed={groupChanged(["chevronAngle"])}>
          <AxisSlider C={C} label="Arrow / chevron angle" value={axes.chevronAngle}
            min={40} max={150} step={5} defaultVal={DEFAULT_AXES.chevronAngle} unit="°"
            onChange={v=>setAx("chevronAngle",v)}
            preview={v => {
              const g = chevronGeom(v);
              return (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <polyline points={g.points} stroke="currentColor" strokeWidth="1.8"
                    strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                </svg>
              );
            }}
          />
        </AxisSection>

        {/* ── DOTS ── */}
        <AxisSection title="Dots" C={C} changed={groupChanged(["dotScale"])}>
          <AxisSlider C={C} label="Dot scale" value={axes.dotScale}
            min={0.5} max={2.0} step={0.05} defaultVal={DEFAULT_AXES.dotScale}
            fmt={v=>`${v.toFixed(2)}×`}
            onChange={v=>setAx("dotScale",v)}
            preview={v => {
              const r = +(Math.max(0.8, 1.5*v)).toFixed(2);
              return (
                <svg width="32" height="14" viewBox="0 0 32 14" fill="none">
                  <circle cx="4"  cy="7" r={r} fill="currentColor"/>
                  <circle cx="16" cy="7" r={r} fill="currentColor"/>
                  <circle cx="28" cy="7" r={r} fill="currentColor"/>
                </svg>
              );
            }}
          />
        </AxisSection>


        {/* ── SPACING ── */}
        <AxisSection title="Spacing" C={C} changed={groupChanged(["parallelGap","endpointClearance"])}>
          <div style={{ marginBottom:16 }}>
            <AxisSlider C={C} label="Parallel gap" value={axes.parallelGap}
              min={0} max={6} step={0.25} defaultVal={DEFAULT_AXES.parallelGap}
              unit="px"
              onChange={v=>setAx("parallelGap",v)}
              preview={v => {
                const half = Math.max(0.4, v*0.45+0.75);
                return (
                  <svg width="28" height="18" viewBox="0 0 28 18" fill="none">
                    <line x1="2" y1={+(9-half).toFixed(1)} x2="26" y2={+(9-half).toFixed(1)}
                      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <line x1="2" y1={+(9+half).toFixed(1)} x2="26" y2={+(9+half).toFixed(1)}
                      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                );
              }}
            />
          </div>
          <div>
            <AxisSlider C={C} label="Endpoint clearance" value={axes.endpointClearance}
              min={0} max={3} step={0.25} defaultVal={DEFAULT_AXES.endpointClearance}
              unit="px"
              onChange={v=>setAx("endpointClearance",v)}
              preview={v => {
                const gap = Math.min(v*0.9, 4);
                return (
                  <svg width="28" height="18" viewBox="0 0 28 18" fill="none">
                    <line x1="2" y1="9" x2={+(14-gap).toFixed(1)} y2="9"
                      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <line x1={+(14+gap).toFixed(1)} y1="9" x2="26" y2="9"
                      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <line x1="14" y1="3" x2="14" y2="15"
                      stroke="currentColor" strokeWidth="0.75" strokeLinecap="round" strokeOpacity="0.35"/>
                  </svg>
                );
              }}
            />
          </div>
        </AxisSection>

        {/* Bottom note */}
        <div style={{ padding:"14px 16px", marginTop:"auto",
                      fontSize:10, fontFamily:SYS, color:C.fgm, lineHeight:1.6 }}>
          Changes are live across all views. The orange dot marks the default value on each slider.
        </div>
      </div>

      {/* ── Right: proof sheet ── */}
      <div style={{ flex:1, overflowY:"auto", background:C.bg }}>

        {/* Proof header */}
        <div style={{
          padding:"11px 20px", borderBottom:`1px solid ${C.bd}`,
          display:"flex", alignItems:"center", justifyContent:"space-between",
          position:"sticky", top:0, background:C.bg, zIndex:2,
        }}>
          <div style={{ display:"flex", alignItems:"baseline", gap:10 }}>
            <span style={{ fontSize:13, fontFamily:SYS, fontWeight:700, color:C.fg }}>Proof Sheet</span>
            <span style={{ fontSize:11, fontFamily:SYS, color:C.fgd }}>
              {BASE_WC[weight].name} {weight} · {style}
              {activeAxis && <span style={{ color:C.acc, marginLeft:8 }}>
                ← {activeAxis}
              </span>}
            </span>
          </div>
          <button onClick={() => setShowDiff(d=>!d)} style={{
            background:showDiff ? C.accbg : "transparent",
            color:showDiff ? C.acc : C.fgd,
            border:`1px solid ${showDiff ? C.acc+"55" : C.bd2}`,
            borderRadius:4, padding:"4px 10px", fontSize:11,
            cursor:"pointer", fontFamily:SYS, transition:"all 0.1s",
          }}>
            {showDiff ? "◑ Diff on" : "◑ Diff off"}
          </button>
        </div>

        {/* Column headers */}
        <div style={{
          display:"grid", gridTemplateColumns:"120px repeat(6,1fr)",
          padding:"0 16px",
          borderBottom:`1px solid ${C.bd}`,
        }}>
          <div/>
          {[16,20,24,32,48].map(sz => (
            <div key={sz} style={{
              padding:"8px 0", textAlign:"center",
              fontSize:11, fontFamily:SYS, color:C.fgd,
            }}>{sz}px</div>
          ))}
        </div>

        {/* Icon rows */}
        {IDS.map(id => {
          const meta  = REGISTRY[id];
          const isSen = activeSensitive ? activeSensitive.includes(id) : false;
          const isDim = activeSensitive ? !activeSensitive.includes(id) : false;
          const wc    = BASE_WC[weight];
          const sw    = wc.sw;
          const ks    = +(sw * wc.koMult).toFixed(2);
          const isFill = style === "fill" && meta.hasFill;

          return (
            <div key={id} style={{
              display:"grid", gridTemplateColumns:"120px repeat(2,1fr)",
              padding:"0 16px",
              borderBottom:`1px solid ${C.bd}`,
              background:isSen ? (C.isLight ? "rgba(255,107,43,0.04)" : "rgba(255,107,43,0.05)") : "transparent",
              opacity:isDim ? 0.3 : 1,
              transition:"opacity 0.25s, background 0.25s",
            }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, padding:"12px 0" }}>
                {isSen && <div style={{ width:4, height:4, borderRadius:"50%", background:C.acc }}/>}
                <div>
                  <div style={{ fontSize:12, fontFamily:SYS, color:C.fg, fontWeight:500 }}>{meta.label}</div>
                  <div style={{ fontSize:10, fontFamily:SYS, color:C.fgd }}>{meta.cat}</div>
                </div>
              </div>
              {[24,48].map(sz => (
                <div key={sz} style={{
                  display:"flex", alignItems:"center", justifyContent:"center",
                  padding:"10px 0", position:"relative",
                }}>
                  {/* Ghost: default axes in blue at low opacity */}
                  {showDiff && (
                    <div style={{ position:"absolute", pointerEvents:"none",
                                  opacity:C.isLight?0.22:0.28 }}>
                      <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none">
                        <Paths id={id} sw={sw} ks={ks} isFill={isFill}
                          fg={C.blue} bg={C.bg} axes={DEFAULT_AXES}/>
                      </svg>
                    </div>
                  )}
                  {/* Current + 24px boundary box */}
                  <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none">
                    <rect x="0" y="0" width="24" height="24"
                      fill="none"
                      stroke={C.isLight?"rgba(0,0,0,0.12)":"rgba(255,255,255,0.12)"}
                      strokeWidth={+(1/sz*24).toFixed(3)}/>
                    <Paths id={id} sw={sw} ks={ks} isFill={isFill}
                      fg={C.fg} bg={C.bg} axes={axes}/>
                  </svg>
                </div>
              ))}
            </div>
          );
        })}
        <div style={{ height:32 }}/>
      </div>
    </div>
  );
}


function buildSVGString(id, weight, style, axes=DEFAULT_AXES) {
  const wc  = BASE_WC[weight];
  const sw  = wc.sw;
  const ks  = (sw * wc.koMult).toFixed(1);
  const isFill = style==="fill" && REGISTRY[id]?.hasFill;
  const cap  = axes.terminalCap, join = axes.terminalJoin;
  const base = `stroke="currentColor" stroke-width="${sw}" stroke-linecap="${cap}" stroke-linejoin="${join}" fill="none"`;
  const bk   = `stroke="var(--icon-bg,#fff)" stroke-width="${ks}" stroke-linecap="${cap}" stroke-linejoin="${join}"`;
  const tn   = axes.tension;
  const cr   = axes.cornerRadius;
  const dPath = documentBodyPath(cr, tn);
  const g     = arrowRightGeom(axes.chevronAngle);
  const cg    = chevronGeom(axes.chevronAngle);
  const sa    = shareArrowGeom(axes.chevronAngle);
  const sPth  = shareBasePath(cr, tn);
  const dotR  = +Math.max(0.8, sw * axes.dotScale).toFixed(2);
  const cbPath = corneredRect(4,4,16,16,cr,tn);
  const wPath  = corneredPoly(WARN_PTS, cr, tn);
  const map = {
    document: isFill
      ? `<path d="${dPath}" fill="currentColor"/>\n  <path d="M14,2V7H19" fill="none" ${bk}/>\n  <line x1="8" y1="12" x2="16" y2="12" ${bk}/>\n  <line x1="8" y1="16" x2="14" y2="16" ${bk}/>`
      : `<path d="${dPath}" ${base}/>\n  <polyline points="14,2 14,7 19,7" ${base}/>\n  <line x1="8" y1="12" x2="16" y2="12" ${base}/>\n  <line x1="8" y1="16" x2="14" y2="16" ${base}/>`,
    share:`<line x1="12" y1="15" x2="12" y2="${sa.tailY}" ${base}/>\n  <polyline points="${sa.points}" ${base}/>\n  <path d="${sPth}" ${base}/>`,
    globe: isFill
      ? `<circle cx="12" cy="12" r="9" fill="currentColor"/>\n  <ellipse cx="12" cy="12" rx="4.5" ry="9" fill="none" ${bk}/>\n  <line x1="0" y1="8" x2="24" y2="8" stroke="var(--icon-bg,#fff)" stroke-width="${ks}" stroke-linecap="butt"/>\n  <line x1="0" y1="16" x2="24" y2="16" stroke="var(--icon-bg,#fff)" stroke-width="${ks}" stroke-linecap="butt"/>`
      : `<circle cx="12" cy="12" r="9" ${base}/>\n  <ellipse cx="12" cy="12" rx="4.5" ry="9" ${base}/>\n  <line x1="0" y1="8" x2="24" y2="8" stroke="currentColor" stroke-width="${sw}" stroke-linecap="butt"/>\n  <line x1="0" y1="16" x2="24" y2="16" stroke="currentColor" stroke-width="${sw}" stroke-linecap="butt"/>`,
    close:`<line x1="6" y1="6" x2="18" y2="18" ${base}/>\n  <line x1="18" y1="6" x2="6" y2="18" ${base}/>`,
    plus:`<line x1="12" y1="5" x2="12" y2="19" ${base}/>\n  <line x1="5" y1="12" x2="19" y2="12" ${base}/>`,
    checkbox:`<path d="${cbPath}" ${base}/>`,
    checkboxFilled: isFill
      ? `<path d="${cbPath}" fill="currentColor"/>\n  <polyline points="7.5,12 10.5,15 16.5,9" fill="none" ${bk}/>`
      : `<path d="${cbPath}" ${base}/>\n  <polyline points="7.5,12 10.5,15 16.5,9" ${base}/>`,
    arrowRight:`<line x1="4" y1="12" x2="${g.tailX}" y2="12" ${base}/>\n  <polyline points="${g.points}" ${base}/>`,
    chevronRight:`<polyline points="${cg.points}" ${base}/>`,
    warning: isFill
      ? `<path d="${wPath}" fill="currentColor"/>\n  <line x1="12" y1="8.5" x2="12" y2="14.5" stroke="var(--icon-bg,#fff)" stroke-width="${ks}" stroke-linecap="round"/>\n  <circle cx="12" cy="18" r="${+(ks*0.55).toFixed(2)}" fill="var(--icon-bg,#fff)"/>`
      : `<path d="${wPath}" ${base}/>\n  <line x1="12" y1="8.5" x2="12" y2="14.5" ${base}/>\n  <circle cx="12" cy="18" r="${+Math.max(0.9,sw*0.72).toFixed(2)}" fill="currentColor"/>`,
    error: isFill
      ? `<circle cx="12" cy="12" r="9" fill="currentColor"/>\n  <line x1="8.5" y1="8.5" x2="15.5" y2="15.5" stroke="var(--icon-bg,#fff)" stroke-width="${ks}" stroke-linecap="round"/>\n  <line x1="15.5" y1="8.5" x2="8.5" y2="15.5" stroke="var(--icon-bg,#fff)" stroke-width="${ks}" stroke-linecap="round"/>`
      : `<circle cx="12" cy="12" r="9" ${base}/>\n  <line x1="8.5" y1="8.5" x2="15.5" y2="15.5" ${base}/>\n  <line x1="15.5" y1="8.5" x2="8.5" y2="15.5" ${base}/>`,
    more:`<circle cx="5" cy="12" r="${dotR}" fill="currentColor"/>\n  <circle cx="12" cy="12" r="${dotR}" fill="currentColor"/>\n  <circle cx="19" cy="12" r="${dotR}" fill="currentColor"/>`,
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">\n  ${map[id]??""}\n</svg>`;
}


// ══════════════════════════════════════════════════════════
// Version log — localStorage-backed changelog
// ══════════════════════════════════════════════════════════
const VER_KEY = "openicons_versions";
const MAX_AUTO = 40; // max stored auto-saves

function loadVersions() {
  try { return JSON.parse(localStorage.getItem(VER_KEY) || "[]"); }
  catch { return []; }
}

function saveVersions(vs) {
  try { localStorage.setItem(VER_KEY, JSON.stringify(vs)); } catch {}
}

function computeDiff(prevAxes, currAxes) {
  return Object.keys(currAxes).filter(k => {
    const a = prevAxes?.[k], b = currAxes[k];
    return a !== undefined && a !== b;
  }).map(k => ({ key: k, from: prevAxes[k], to: currAxes[k] }));
}

function formatDiff(diff) {
  if (!diff || diff.length === 0) return "baseline";
  return diff.map(d => {
    const fmtVal = (k, v) => {
      if (typeof v === "number") return +v.toFixed(2);
      return v;
    };
    return `${d.key.replace(/([A-Z])/g,' $1').toLowerCase()} ${fmtVal(d.key,d.from)}→${fmtVal(d.key,d.to)}`;
  }).join("  ·  ");
}

function fmtTime(ts) {
  const d = new Date(ts);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const timeStr = d.toLocaleTimeString([], {hour:'numeric', minute:'2-digit'});
  if (isToday) return timeStr;
  return d.toLocaleDateString([], {month:'short', day:'numeric'}) + "  " + timeStr;
}

function pushVersion(vs, axes, label, isNamed) {
  const lastAxes = vs[0]?.axes;
  const diff = computeDiff(lastAxes, axes);
  if (!isNamed && lastAxes && diff.length === 0) return vs; // nothing changed
  const entry = {
    id: Date.now() + "_" + Math.random().toString(36).slice(2,6),
    ts: Date.now(),
    label: label || null,
    named: !!isNamed,
    axes: {...axes},
    diff,
  };
  let next = [entry, ...vs];
  // Trim oldest auto-saves beyond MAX_AUTO (keep all named)
  const autos = next.filter(v => !v.named);
  if (autos.length > MAX_AUTO) {
    let trimmed = 0;
    next = next.filter(v => {
      if (!v.named && trimmed < autos.length - MAX_AUTO) { trimmed++; return false; }
      return true;
    });
  }
  return next;
}

// ── VersionDropdown component ──────────────────────────────
function VersionDropdown({ axes, setAxes, C }) {
  const [open,      setOpen]      = useState(false);
  const [versions,  setVersions]  = useState(loadVersions);
  const [naming,    setNaming]    = useState(false);
  const [nameVal,   setNameVal]   = useState("");
  const [restored,  setRestored]  = useState(null);
  const autoRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-save: debounce 2s after axes change
  useEffect(() => {
    clearTimeout(autoRef.current);
    autoRef.current = setTimeout(() => {
      setVersions(prev => {
        const next = pushVersion(prev, axes, null, false);
        if (next !== prev) saveVersions(next);
        return next;
      });
    }, 2000);
    return () => clearTimeout(autoRef.current);
  }, [JSON.stringify(axes)]);

  // Focus input when naming
  useEffect(() => { if (naming && inputRef.current) inputRef.current.focus(); }, [naming]);

  const handleNamedSave = () => {
    const label = nameVal.trim() || "Saved version";
    setVersions(prev => {
      const next = pushVersion(prev, axes, label, true);
      saveVersions(next);
      return next;
    });
    setNameVal("");
    setNaming(false);
  };

  const handleRestore = (v) => {
    setAxes({...DEFAULT_AXES, ...v.axes});
    setRestored(v.id);
    setOpen(false);
    setTimeout(() => setRestored(null), 2000);
  };

  const count = versions.length;
  const named = versions.filter(v => v.named).length;

  return (
    <div style={{ position:"relative" }}>
      {/* Trigger button */}
      <button onClick={() => setOpen(o => !o)} style={{
        display:"flex", alignItems:"center", gap:6,
        background: open ? C.s3 : "transparent",
        border:`1px solid ${open ? C.bd2 : C.bd}`,
        borderRadius:5, padding:"4px 10px",
        cursor:"pointer", fontFamily:SYS,
        color: restored ? C.green : C.fgd,
        fontSize:11, transition:"all 0.12s",
      }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/>
          <polyline points="12,7 12,12 16,14" stroke="currentColor" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span style={{ fontWeight:500 }}>
          {restored ? "Restored" : count > 0 ? `${count} version${count!==1?"s":""}` : "Versions"}
        </span>
        {named > 0 && (
          <span style={{ background:C.acc+"22", color:C.acc, borderRadius:3,
                         padding:"0 5px", fontSize:9, fontWeight:700 }}>{named} named</span>
        )}
        <span style={{ fontSize:9, color:C.fgm, marginLeft:1 }}>{open?"▲":"▼"}</span>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position:"absolute", top:"calc(100% + 6px)", right:0,
          width:380, maxHeight:460, background:C.s1,
          border:`1px solid ${C.bd2}`, borderRadius:8,
          boxShadow:`0 8px 32px rgba(0,0,0,${C.isLight?0.12:0.5})`,
          zIndex:100, overflow:"hidden", display:"flex", flexDirection:"column",
        }}>
          {/* Header */}
          <div style={{ padding:"12px 14px 10px", borderBottom:`1px solid ${C.bd}`,
                        display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <span style={{ fontSize:12, fontWeight:700, fontFamily:SYS, color:C.fg }}>
              Version History
            </span>
            {naming ? (
              <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                <input ref={inputRef} value={nameVal}
                  onChange={e=>setNameVal(e.target.value)}
                  onKeyDown={e=>{ if(e.key==="Enter") handleNamedSave(); if(e.key==="Escape") setNaming(false); }}
                  placeholder="Version name…"
                  style={{
                    background:C.s2, border:`1px solid ${C.bd2}`, borderRadius:4,
                    color:C.fg, fontFamily:SYS, fontSize:11, padding:"3px 8px",
                    outline:"none", width:140,
                  }}
                />
                <button onClick={handleNamedSave} style={{
                  background:C.acc, color:"#fff", border:"none", borderRadius:4,
                  padding:"3px 10px", fontSize:11, cursor:"pointer", fontFamily:SYS, fontWeight:600,
                }}>Save</button>
                <button onClick={()=>setNaming(false)} style={{
                  background:"none", border:`1px solid ${C.bd2}`, borderRadius:4,
                  color:C.fgd, padding:"3px 8px", fontSize:11, cursor:"pointer", fontFamily:SYS,
                }}>✕</button>
              </div>
            ) : (
              <button onClick={()=>setNaming(true)} style={{
                display:"flex", alignItems:"center", gap:5,
                background:C.accbg, border:`1px solid ${C.acc}44`,
                color:C.acc, borderRadius:4, padding:"4px 10px",
                fontSize:11, cursor:"pointer", fontFamily:SYS, fontWeight:600,
              }}>
                <span style={{fontSize:13, lineHeight:1}}>+</span> Save version
              </button>
            )}
          </div>

          {/* Current state indicator */}
          <div style={{ padding:"8px 14px", borderBottom:`1px solid ${C.bd}`,
                        background:C.isLight?"rgba(0,0,0,0.015)":"rgba(255,255,255,0.02)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <div style={{ width:6, height:6, borderRadius:"50%", background:C.acc, flexShrink:0 }}/>
              <span style={{ fontSize:11, fontFamily:SYS, color:C.fg, fontWeight:600 }}>Current</span>
              <span style={{ fontSize:10, fontFamily:SYS, color:C.fgd, marginLeft:"auto" }}>unsaved changes</span>
            </div>
            <div style={{ fontSize:10, fontFamily:SYS, color:C.fgd, marginTop:3, paddingLeft:12,
                          whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
              {Object.entries(axes).map(([k,v]) => `${k}: ${typeof v==="number"?+v.toFixed(2):v}`).join("  ·  ")}
            </div>
          </div>

          {/* Version list */}
          <div style={{ overflowY:"auto", flex:1 }}>
            {versions.length === 0 ? (
              <div style={{ padding:"24px 14px", textAlign:"center",
                            fontSize:11, fontFamily:SYS, color:C.fgd }}>
                No versions saved yet.<br/>
                <span style={{color:C.fgm}}>Axes changes auto-save after 2s.</span>
              </div>
            ) : versions.map((v, i) => {
              const isCurrent = i === 0;
              return (
                <button key={v.id} onClick={() => handleRestore(v)} style={{
                  width:"100%", padding:"9px 14px",
                  borderBottom:`1px solid ${C.bd}`,
                  background: isCurrent ? (C.isLight?"rgba(0,0,0,0.02)":"rgba(255,255,255,0.03)") : "none",
                  border:"none", borderBottom:`1px solid ${C.bd}`,
                  textAlign:"left", cursor:"pointer", fontFamily:SYS,
                  transition:"background 0.1s",
                }}>
                  <div style={{ display:"flex", alignItems:"baseline", gap:6, marginBottom:2 }}>
                    {v.named && (
                      <div style={{ width:5, height:5, borderRadius:"50%",
                                    background:C.acc, flexShrink:0, marginTop:1 }}/>
                    )}
                    <span style={{ fontSize:11, fontWeight:v.named?700:400,
                                   color:v.named?C.fg:C.fgd, flex:1 }}>
                      {v.label || "Auto-save"}
                    </span>
                    <span style={{ fontSize:10, color:C.fgm, flexShrink:0 }}>{fmtTime(v.ts)}</span>
                  </div>
                  <div style={{ fontSize:10, color:C.fgm, paddingLeft: v.named ? 11 : 0,
                                whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                    {formatDiff(v.diff)}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer */}
          {versions.length > 0 && (
            <div style={{ padding:"8px 14px", borderTop:`1px solid ${C.bd}`,
                          display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontSize:10, fontFamily:SYS, color:C.fgm }}>
                {count} entr{count===1?"y":"ies"}  ·  {named} named
              </span>
              <button onClick={() => {
                if (window.confirm("Clear all version history?")) {
                  setVersions([]); saveVersions([]);
                }
              }} style={{
                background:"none", border:"none", color:C.fgm, fontSize:10,
                cursor:"pointer", fontFamily:SYS, padding:"2px 4px",
              }}>Clear history</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// App
// ══════════════════════════════════════════════════════════
export default function App() {
  const [isDark,       setIsDark]       = useState(true);
  const [weight,       setWeight]       = useState(400);
  const [style,        setStyle]        = useState("line");
  const [selected,     setSelected]     = useState(null);
  const [hovered,      setHovered]      = useState(null);
  const [showGrid,     setShowGrid]     = useState(false);
  const [copied,       setCopied]       = useState(false);
  const [svgColor,     setSvgColor]     = useState('currentColor');
  const [viewMode,     setViewMode]     = useState("grid");
  const [zoomTab,      setZoomTab]      = useState(2);
  const [previewMode,  setPreviewMode]  = useState("render");
  const [inspTab,      setInspTab]      = useState("pixel");
  const [axes,         setAxes]         = useState({...DEFAULT_AXES});

  // Zoom + pan live here so they persist across weight/style/theme changes.
  // Only reset when the selected icon changes.
  const [previewZoom, setPreviewZoom] = useState(1);
  const [previewPan,  setPreviewPan]  = useState({ x:0, y:0 });
  useEffect(() => { setPreviewZoom(1); setPreviewPan({x:0,y:0}); }, [selected]);

  const C    = isDark ? DARK : LIGHT;
  const meta = selected ? REGISTRY[selected] : null;
  const sw   = BASE_WC[weight].sw;

  const copySVG = () => {
    if (!selected) return;
    let svg = buildSVGString(selected, weight, style, axes);
    if (svgColor !== 'currentColor') {
      svg = svg.replace(/currentColor/g, svgColor).replace(/var\(--icon-bg,[^)]+\)/g, '#ffffff');
    }
    navigator.clipboard.writeText(svg).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 1800);
    });
  };

  return (
    <div style={{ fontFamily:SYS, background:C.bg, color:C.fg,
                  minHeight:"100vh", fontSize:13, lineHeight:1.5,
                  transition:"background 0.2s,color 0.2s" }}>

      {/* ── Top bar ── */}
      <div style={{ borderBottom:`1px solid ${C.bd}`, padding:"0 20px",
                    display:"flex", alignItems:"center", height:50, gap:14 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="18" height="18" rx="2" stroke={C.acc} strokeWidth="1.5"/>
            <line x1="3" y1="12" x2="21" y2="12" stroke={C.acc} strokeWidth="1.5"/>
            <line x1="12" y1="3" x2="12" y2="21" stroke={C.acc} strokeWidth="1.5"/>
          </svg>
          <span style={{ fontWeight:700, fontSize:14 }}>Open Icons</span>
        </div>
        <span style={{ color:C.fgm }}>·</span>
        <span style={{ color:C.fgd, fontSize:11 }}>24×24 · pixel-aligned · variable weight</span>
        <div style={{ marginLeft:"auto", display:"flex", gap:10, alignItems:"center" }}>
          <ThemeToggle isDark={isDark} onToggle={() => setIsDark(v=>!v)}/>
          <VersionDropdown axes={axes} setAxes={setAxes} C={C}/>
          <div style={{ background:C.accbg, color:C.acc, border:`1px solid ${C.acc}44`,
                        borderRadius:3, padding:"2px 8px", fontSize:10, fontWeight:600 }}>PLAYGROUND</div>
        </div>
      </div>

      {/* ── Control bar ── */}
      <div style={{ borderBottom:`1px solid ${C.bd}`, padding:"0 20px",
                    display:"flex", alignItems:"center", height:44, gap:12, overflowX:"auto" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
          <Label C={C}>Weight</Label>
          <div style={{ display:"flex", gap:4 }}>
            {[300,400,600].map(w=>(
              <Btn key={w} active={weight===w} onClick={()=>setWeight(w)} C={C}>
                {BASE_WC[w].code} {w}
              </Btn>
            ))}
          </div>
        </div>
        <Divider C={C}/>
        <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
          <Label C={C}>Style</Label>
          <div style={{ display:"flex", gap:4 }}>
            {["line","fill"].map(s=>(
              <Btn key={s} active={style===s} onClick={()=>setStyle(s)} C={C}>{s}</Btn>
            ))}
          </div>
        </div>
        <Divider C={C}/>
        <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
          <Label C={C}>View</Label>
          <div style={{ display:"flex", gap:4 }}>
            <Btn active={viewMode==="grid"}    onClick={()=>setViewMode("grid")}    C={C}>Grid</Btn>
            <Btn active={viewMode==="compare"} onClick={()=>setViewMode("compare")} C={C}>Compare</Btn>
            <Btn active={viewMode==="axes"}    onClick={()=>setViewMode("axes")}    C={C}>Axes</Btn>
          </div>
        </div>
        <Divider C={C}/>
        <Btn active={showGrid} onClick={()=>setShowGrid(v=>!v)} C={C}>
          {showGrid ? "Grid ON" : "Grid OFF"}
        </Btn>
        <div style={{ marginLeft:"auto", display:"flex", gap:16, fontSize:11, color:C.fgd, flexShrink:0 }}>
          <span>stroke <b style={{color:C.fg,fontWeight:600}}>{sw}px</b></span>
          <span>spacing <b style={{color:C.fg,fontWeight:600}}>{BASE_WC[weight].spacing}px</b></span>
        </div>
      </div>

      {/* ── Main ── */}
      <div style={{ display:"flex", minHeight:"calc(100vh - 95px)" }}>

        {/* ── Axis Playground (full-width when active) ── */}
        {viewMode==="axes" && (
          <AxisPlayground axes={axes} setAxes={setAxes} weight={weight} style={style} C={C}/>
        )}

        {/* ── Grid / Compare ── */}
        {viewMode !== "axes" && (
        <div style={{ flex:1, padding:"16px 20px", overflowY:"auto" }}>

          {viewMode==="grid" && (
            <div style={{ display:"grid",
                          gridTemplateColumns:"repeat(auto-fill, minmax(96px, 1fr))",
                          gap:4 }}>
              {IDS.map(id => {
                const m = REGISTRY[id];
                const isSel = selected===id, isHov = hovered===id;
                const lineOnly = style==="fill" && !m.hasFill;
                return (
                  <div key={id}
                    onClick={() => setSelected(selected===id ? null : id)}
                    onMouseEnter={() => setHovered(id)}
                    onMouseLeave={() => setHovered(null)}
                    style={{
                      background: isSel ? C.accbg : isHov ? C.s2 : "transparent",
                      borderRadius:6, padding:"18px 0 12px",
                      display:"flex", flexDirection:"column", alignItems:"center", gap:8,
                      cursor:"pointer", transition:"background 0.1s",
                      userSelect:"none", position:"relative",
                    }}
                  >
                    {lineOnly && (
                      <div style={{ position:"absolute", top:5, right:7,
                                    fontSize:9, fontFamily:SYS, color:C.fgm, fontWeight:500 }}>
                        line-only
                      </div>
                    )}
                    <Ico id={id} weight={weight} style={style} size={28}
                      fg={isSel ? C.acc : C.fg}
                      bg={isSel ? C.accbg : isHov ? C.s2 : C.bg}
                      axes={axes}
                      C={C}/>
                    <div style={{ textAlign:"center", lineHeight:1.3 }}>
                      <div style={{ fontSize:11, fontFamily:SYS, color:isSel?C.accfg:C.fgd }}>{m.label}</div>
                      <div style={{ fontSize:10, fontFamily:SYS, color:C.fgd, marginTop:1 }}>{m.cat}</div>
                    </div>
                  </div>
                );
              })}
              {/* Add placeholder */}
              <div style={{ borderRadius:6, padding:"18px 0 12px",
                            display:"flex", flexDirection:"column", alignItems:"center", gap:8,
                            cursor:"pointer", opacity:0.28, border:`1.5px dashed ${C.bd2}` }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <line x1="12" y1="5" x2="12" y2="19" stroke={C.fgd} strokeWidth="1.5" strokeLinecap="round"/>
                  <line x1="5" y1="12" x2="19" y2="12" stroke={C.fgd} strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <div style={{ fontSize:10, fontFamily:SYS, color:C.fgm }}>add icon</div>
              </div>
            </div>
          )}

          {viewMode==="compare" && (
            <div>
              <div style={{ marginBottom:14, fontSize:12, fontFamily:SYS, color:C.fgd }}>
                All icons · weight comparison · {style}
              </div>
              {/* Header */}
              <div style={{ display:"grid", gridTemplateColumns:"148px 1fr 1fr 1fr",
                            paddingBottom:8, marginBottom:2,
                            borderBottom:`1px solid ${C.bd}` }}>
                <div/>
                {[300,400,600].map(w=>(
                  <div key={w} style={{ textAlign:"center", fontSize:12, fontFamily:SYS,
                                        color:w===weight?C.acc:C.fgd,
                                        fontWeight:w===weight?700:400 }}>
                    {BASE_WC[w].name}
                    <span style={{ marginLeft:4, fontSize:11,
                                   color:w===weight?C.acc+"99":C.fgd }}>
                      {BASE_WC[w].sw}px
                    </span>
                  </div>
                ))}
              </div>
              {/* Rows */}
              {IDS.map(id=>{
                const isSel = selected===id;
                const isHov = hovered===id;
                const rowBg = isSel ? C.accbg : isHov ? C.s2 : "transparent";
                return (
                  <div key={id}
                    onClick={() => setSelected(selected===id ? null : id)}
                    onMouseEnter={() => setHovered(id)}
                    onMouseLeave={() => setHovered(null)}
                    style={{
                      display:"grid", gridTemplateColumns:"148px 1fr 1fr 1fr",
                      cursor:"pointer",
                      borderLeft: isSel ? `2px solid ${C.acc}` : `2px solid transparent`,
                      background: rowBg,
                      transition:"background 0.08s",
                    }}
                  >
                    <div style={{ padding:"10px 12px", display:"flex", alignItems:"center" }}>
                      <span style={{ fontSize:12, fontFamily:SYS,
                                     color:isSel?C.acc:C.fgd,
                                     fontWeight:isSel?600:400 }}>{id}</span>
                    </div>
                    {[300,400,600].map(w=>(
                      <div key={w} style={{ display:"flex", alignItems:"center",
                                            justifyContent:"center", padding:"10px" }}>
                        <Ico id={id} weight={w} style={style} size={22}
                          fg={isSel ? C.acc : C.fg}
                          bg={isSel ? C.accbg : isHov ? C.s2 : C.bg}
                          axes={axes}
                          C={C}/>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        )} {/* end viewMode !== axes */}

        {/* ── Inspector ── */}
        {selected && meta && viewMode !== "axes" && (
          <div style={{ width:312, borderLeft:`1px solid ${C.bd}`, background:C.s1,
                        display:"flex", flexDirection:"column",
                        flexShrink:0, overflowY:"auto" }}>

            {/* Header */}
            <div style={{ padding:"12px 16px", borderBottom:`1px solid ${C.bd}`,
                          display:"flex", alignItems:"center", justifyContent:"space-between",
                          position:"sticky", top:0, background:C.s1, zIndex:2 }}>
              <div>
                <div style={{ fontSize:13, fontFamily:SYS, color:C.acc, fontWeight:700 }}>
                  {meta.label}
                </div>
                <div style={{ fontSize:12, fontFamily:SYS, color:C.fgd, marginTop:2 }}>
                  {selected} · {style}
                </div>
              </div>
              <button onClick={() => setSelected(null)} style={{
                background:"none", border:`1px solid ${C.bd2}`, borderRadius:4,
                color:C.fgd, cursor:"pointer", width:24, height:24, fontSize:14,
                display:"flex", alignItems:"center", justifyContent:"center", fontFamily:SYS,
              }}>×</button>
            </div>

            {/* Tab bar */}
            <div style={{ display:"flex", borderBottom:`1px solid ${C.bd}`,
                          background:C.s1, position:"sticky", top:48, zIndex:1 }}>
              {[{key:"pixel",label:"Pixel Preview"},{key:"ui",label:"UI Context"}].map(t=>(
                <button key={t.key} onClick={()=>setInspTab(t.key)} style={{
                  flex:1, padding:"9px 0", background:"none",
                  borderBottom:`2px solid ${inspTab===t.key?C.acc:"transparent"}`,
                  border:"none", color:inspTab===t.key?C.acc:C.fgd,
                  fontSize:12, cursor:"pointer", fontFamily:SYS,
                  fontWeight:inspTab===t.key?600:400, transition:"all 0.12s",
                }}>{t.label}</button>
              ))}
            </div>

            {/* ── Pixel Preview tab ── */}
            {inspTab==="pixel" && <>
              <div style={{ padding:"14px 16px", borderBottom:`1px solid ${C.bd}` }}>
                {/* Controls row */}
                <div style={{ display:"flex", alignItems:"center",
                              justifyContent:"space-between", marginBottom:10 }}>
                  <div style={{ display:"flex", gap:3 }}>
                    {[{d:1,t:"1× legacy"},{d:2,t:"2× retina"},{d:3,t:"3× hi-DPI"}].map(({d,t})=>(
                      <button key={d} onClick={()=>setZoomTab(d)} title={t} style={{
                        background:zoomTab===d?C.acc:"transparent",
                        color:zoomTab===d?"#fff":C.fgd,
                        border:`1px solid ${zoomTab===d?C.acc:C.bd2}`,
                        borderRadius:3, padding:"3px 8px", fontSize:11,
                        cursor:"pointer", fontFamily:SYS, transition:"all 0.1s",
                      }}>{d}×</button>
                    ))}
                  </div>
                  <div style={{ display:"flex", gap:3 }}>
                    {[{key:"render",label:"Render"},{key:"skeleton",label:"Skeleton"}].map(m=>(
                      <button key={m.key} onClick={()=>setPreviewMode(m.key)} style={{
                        background:previewMode===m.key?(m.key==="skeleton"?(C.isLight?"#F0F2FF":"#070A12"):C.acc):"transparent",
                        color:previewMode===m.key?(m.key==="skeleton"?"#FF6B2B":"#fff"):C.fgd,
                        border:`1px solid ${previewMode===m.key?(m.key==="skeleton"?"#FF6B2B55":C.acc):C.bd2}`,
                        borderRadius:3, padding:"3px 8px", fontSize:11,
                        cursor:"pointer", fontFamily:SYS, transition:"all 0.1s",
                      }}>{m.label}</button>
                    ))}
                  </div>
                </div>
                {/* Context note */}
                <div style={{ fontSize:11, fontFamily:SYS, color:C.fgd, marginBottom:10, lineHeight:1.6 }}>
                  {previewMode==="skeleton"
                    ? <><span style={{color:"#FF6B2B"}}>Orange</span> = stroke · <span style={{color:"#4B9EFF"}}>Blue</span> = knockout</>
                    : zoomTab===1 ? "1× — 24px physical. Pixelated rendering."
                    : zoomTab===2 ? "2× retina — 48px physical."
                    : `3× hi-DPI — 72px physical. Stroke = ${+(sw*3).toFixed(1)} phys.px.`
                  }
                </div>
                <ZoomStage
                  id={selected} weight={weight} style={style}
                  density={zoomTab} skeleton={previewMode==="skeleton"}
                  showGrid={showGrid}
                  zoom={previewZoom} setZoom={setPreviewZoom}
                  pan={previewPan}   setPan={setPreviewPan}
                  axes={axes}
                  C={C}
                />
              </div>

              {/* Weight comparison */}
              <div style={{ padding:"14px 16px", borderBottom:`1px solid ${C.bd}` }}>
                <Label C={C}>Weight Comparison</Label>
                <div style={{ display:"flex", gap:4, marginTop:10 }}>
                  {[300,400,600].map(w=>(
                    <div key={w} onClick={()=>setWeight(w)} style={{
                      flex:1,
                      background: w===weight ? C.s3 : "transparent",
                      border: `1px solid ${w===weight ? C.acc+"55" : C.bd}`,
                      borderRadius:5, padding:"10px 4px",
                      display:"flex", flexDirection:"column", alignItems:"center", gap:6,
                      cursor:"pointer", transition:"all 0.1s",
                    }}>
                      <Ico id={selected} weight={w} style={style} size={24}
                        fg={w===weight ? C.acc : C.fgd}
                        bg={w===weight ? C.s3 : C.s1}
                        axes={axes}
                        C={C}/>
                      <div style={{ fontSize:9, fontFamily:SYS, lineHeight:1.5, textAlign:"center" }}>
                        <div style={{ color:w===weight?C.acc:C.fgd, fontWeight:w===weight?600:400 }}>
                          {BASE_WC[w].code}
                        </div>
                        <div style={{ color:C.fgd }}>{BASE_WC[w].sw}px</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Metadata */}
              <div style={{ padding:"14px 16px", borderBottom:`1px solid ${C.bd}` }}>
                <Label C={C}>Metadata</Label>
                <div style={{ marginTop:10, display:"flex", flexDirection:"column", gap:7 }}>
                  {[
                    ["name",    selected],
                    ["weight",  `${weight} · ${BASE_WC[weight].name}`],
                    ["style",   style],
                    ["grid",    "24 × 24 px"],
                    ["stroke",  `${sw}px`],
                    ["ko",      `${+(sw*BASE_WC[weight].koMult).toFixed(2)}px`],
                    ["spacing", `${BASE_WC[weight].spacing}px`],
                    ["fill",    meta.hasFill ? "yes" : "no"],
                    ["version", "1.0.0"],
                  ].map(([k,v])=>(
                    <div key={k} style={{ display:"flex", justifyContent:"space-between",
                                          alignItems:"baseline" }}>
                      <span style={{ fontSize:11, fontFamily:SYS, color:C.fgd }}>{k}</span>
                      <span style={{ fontSize:12, fontFamily:SYS, fontWeight:500,
                                     color:C.fg }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>}

            {/* ── UI Context tab ── */}
            {inspTab==="ui" && (
              <div style={{ padding:"16px" }}>
                <UIContextPreview id={selected} weight={weight} style={style} axes={axes} C={C}/>
              </div>
            )}

            {/* Copy SVG */}
            <div style={{ padding:"12px 16px", marginTop:"auto" }}>
              {/* Color toggle */}
              <div style={{ display:"flex", gap:4, marginBottom:7 }}>
                {["currentColor","#000000","#ffffff"].map(c => (
                  <button key={c} onClick={()=>setSvgColor(c)} style={{
                    flex:1, padding:"4px 0", fontSize:10, fontFamily:SYS,
                    background: svgColor===c ? C.s3 : "transparent",
                    border:`1px solid ${svgColor===c ? C.bd2 : C.bd}`,
                    color: svgColor===c ? C.fg : C.fgd,
                    borderRadius:4, cursor:"pointer", transition:"all 0.1s",
                    fontWeight: svgColor===c ? 600 : 400,
                  }}>
                    {c==="currentColor" ? "dynamic" : c}
                  </button>
                ))}
              </div>
              <button onClick={copySVG} style={{
                width:"100%",
                background:copied ? C.green+"22" : C.accbg,
                color:copied ? C.green : C.acc,
                border:`1px solid ${copied ? C.green+"55" : C.acc+"55"}`,
                borderRadius:5, padding:"9px", fontSize:12,
                cursor:"pointer", fontFamily:SYS, fontWeight:700,
                transition:"all 0.15s",
              }}>
                {copied ? "✓  Copied" : `↓  Copy SVG  ${svgColor!=="currentColor"?`(${svgColor})`:"(dynamic)"}`}
              </button>
              <div style={{ fontSize:10, fontFamily:SYS, color:C.fgm, marginTop:5, textAlign:"center" }}>
                {svgColor==="currentColor" ? "CSS-ready · inherits color from parent" : "Figma-ready · hardcoded color"}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
