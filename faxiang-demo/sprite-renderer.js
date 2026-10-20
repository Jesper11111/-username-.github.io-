'use strict';
// Render-only adapter: keeps source images unchanged, aligns feet and normalizes body height.
window.SpriteRenderer = class {
 constructor(host){this.canvas=document.createElement('canvas');this.canvas.width=240;this.canvas.height=300;this.canvas.style.cssText='width:100%;height:100%;display:block';host.appendChild(this.canvas);this.ctx=this.canvas.getContext('2d');this.atlases={};this.ready=Promise.resolve();}
 async load(kind,src,cols,rows,directional=true){const image=new Image();image.src=window.resolveFaxiangAsset(src);await image.decode();const atlas={image,src,cols,rows,directional,frames:[]};
 const scan=document.createElement('canvas');scan.width=image.naturalWidth;scan.height=image.naturalHeight;const c=scan.getContext('2d',{willReadFrequently:true});c.drawImage(image,0,0);const pixels=c.getImageData(0,0,scan.width,scan.height).data;
 for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
  const x0=Math.round(col*scan.width/cols),x1=Math.round((col+1)*scan.width/cols),y0=Math.round(row*scan.height/rows),y1=Math.round((row+1)*scan.height/rows);let bottom=y0,top=y1,left=x1,right=x0;
  // Core body region excludes extended swords/ribbons; foot and crown stay stable across poses.
  const counts=[];for(let yy=y0;yy<y1;yy++){let n=0;for(let xx=x0+Math.floor((x1-x0)*.25);xx<x0+Math.floor((x1-x0)*.75);xx++){const a=pixels[(yy*scan.width+xx)*4+3];if(a>140)n++;}counts.push(n);}
  const threshold=Math.max(3,(x1-x0)*.045);for(let yy=y0;yy<y1;yy++)if(counts[yy-y0]>threshold){top=Math.min(top,yy);bottom=Math.max(bottom,yy);}
  // Keep full cell so sword tips and magic remain visible. Shared scale per atlas avoids frame breathing.
  if(top>=bottom){top=y0;bottom=y1-1;}
  let footX=0,n=0;for(let yy=Math.max(top,bottom-10);yy<=bottom;yy++)for(let xx=x0;xx<x1;xx++)if(pixels[(yy*scan.width+xx)*4+3]>140){footX+=xx;n++;}
  atlas.frames.push({x:x0,y:y0,w:x1-x0,h:y1-y0,top,bottom,footX:n?footX/n:(x0+x1)/2});
 }
 const heights=atlas.frames.map(f=>f.bottom-f.top).sort((a,b)=>a-b);atlas.bodyHeight=heights[Math.floor(heights.length/2)];this.atlases[kind]=atlas;return atlas;
 }
 draw(kind,frame,direction,variant=0){const a=this.atlases[kind];if(!a)return false;const row=a.directional?({front:0,side:1,back:2}[direction]??0):variant;const f=a.frames[Math.min(a.rows-1,row)*a.cols+frame%a.cols];const c=this.ctx;c.clearRect(0,0,240,300);const scale=235/a.bodyHeight;c.drawImage(a.image,f.x,f.y,f.w,f.h,120-(f.footX-f.x)*scale,288-(f.bottom-f.y)*scale,f.w*scale,f.h*scale);return true;}
};
