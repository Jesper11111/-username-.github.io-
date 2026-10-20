'use strict';
window.SpriteRenderer = class {
 constructor(host){this.canvas=document.createElement('canvas');this.canvas.width=240;this.canvas.height=300;this.canvas.style.cssText='width:100%;height:100%;display:block';host.appendChild(this.canvas);this.ctx=this.canvas.getContext('2d');this.atlases={};this.ready=Promise.resolve();}
 async load(kind,src,cols,rows,directional=true){const image=new Image();image.src=window.resolveFaxiangAsset(src);await image.decode();const atlas={image,src,cols,rows,directional,frames:[]};
 const scan=document.createElement('canvas');scan.width=image.naturalWidth;scan.height=image.naturalHeight;const c=scan.getContext('2d',{willReadFrequently:true});c.drawImage(image,0,0);const pixels=c.getImageData(0,0,scan.width,scan.height).data;
 for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
  const x0=Math.round(col*scan.width/cols),x1=Math.round((col+1)*scan.width/cols),y0=Math.round(row*scan.height/rows),y1=Math.round((row+1)*scan.height/rows);let bottom=y0,top=y1,left=x1,right=x0;
  // 原素材不是精準格線：只保留本格最大連通角色，排除跨格的腳／飄帶碎片。
  const fw=x1-x0,fh=y1-y0,seen=new Uint8Array(fw*fh),queue=new Int32Array(fw*fh);
  let main=[];
  for(let start=0;start<seen.length;start++){
   if(seen[start]||pixels[((y0+Math.floor(start/fw))*scan.width+x0+start%fw)*4+3]<=8)continue;
   let head=0,tail=1;queue[0]=start;seen[start]=1;
   while(head<tail){const at=queue[head++],xx=at%fw,yy=Math.floor(at/fw);
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
     const nx=xx+dx,ny=yy+dy;if(nx<0||nx>=fw||ny<0||ny>=fh)continue;
     const next=ny*fw+nx;if(!seen[next]&&pixels[((y0+ny)*scan.width+x0+nx)*4+3]>8){seen[next]=1;queue[tail++]=next;}
    }
   }
   if(tail>main.length)main=Array.from(queue.subarray(0,tail));
  }
  const surface=document.createElement('canvas');surface.width=fw;surface.height=fh;
  const sc=surface.getContext('2d'),clean=sc.createImageData(fw,fh);
  // 施法第7格左上角有前一格劍氣，與髮絲相連，須以已量測角區排除。
  const excludeCastCorner=kind==='cast'&&row===0&&col===6;
  for(const at of main){
   if(excludeCastCorner && at%fw<Math.ceil(fw*.1) && Math.floor(at/fw)<Math.ceil(fh*.33))continue;
   const src=((y0+Math.floor(at/fw))*scan.width+x0+at%fw)*4;clean.data.set(pixels.subarray(src,src+4),at*4);}
  sc.putImageData(clean,0,0);
  const alphaAt=(xx,yy)=>clean.data[((yy-y0)*fw+xx-x0)*4+3];
  // Core body region excludes extended swords/ribbons; foot and crown stay stable across poses.
  const counts=[];for(let yy=y0;yy<y1;yy++){let n=0;for(let xx=x0+Math.floor((x1-x0)*.25);xx<x0+Math.floor((x1-x0)*.75);xx++){const a=alphaAt(xx,yy);if(a>140)n++;}counts.push(n);}
  const threshold=Math.max(3,(x1-x0)*.045);for(let yy=y0;yy<y1;yy++)if(counts[yy-y0]>threshold){top=Math.min(top,yy);bottom=Math.max(bottom,yy);}
  // Keep full cell so sword tips and magic remain visible. Shared scale per atlas avoids frame breathing.
  if(top>=bottom){top=y0;bottom=y1-1;}
  let footX=0,n=0;for(let yy=Math.max(top,bottom-10);yy<=bottom;yy++)for(let xx=x0;xx<x1;xx++)if(alphaAt(xx,yy)>140){footX+=xx;n++;}
  atlas.frames.push({surface,x:x0,y:y0,w:x1-x0,h:y1-y0,top,bottom,footX:n?footX/n:(x0+x1)/2});
 }
 const heights=atlas.frames.map(f=>f.bottom-f.top).sort((a,b)=>a-b);atlas.bodyHeight=heights[Math.floor(heights.length/2)];this.atlases[kind]=atlas;return atlas;
 }
 draw(kind,frame,direction,variant=0){const a=this.atlases[kind];if(!a)return false;const row=a.directional?({front:0,side:1,back:2}[direction]??0):variant;const f=a.frames[Math.min(a.rows-1,row)*a.cols+frame%a.cols];const c=this.ctx;c.clearRect(0,0,240,300);const scale=235/a.bodyHeight;c.drawImage(f.surface,0,0,f.w,f.h,120-(f.footX-f.x)*scale,288-(f.bottom-f.y)*scale,f.w*scale,f.h*scale);return true;}
};
