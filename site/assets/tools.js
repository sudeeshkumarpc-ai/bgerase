async function getFile(id){
  const f=document.getElementById(id)?.files?.[0];
  if(!f) throw new Error('Please choose an image.');
  return f;
}
function downloadBlob(blob,name){
  const u=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(u),1000);
}
async function bitmap(file){return createImageBitmap(file)}
async function canvasBlob(c,type='image/png',quality=.92){
  return new Promise((r,j)=>c.toBlob(b=>b?r(b):j(new Error('Could not create image')),type,quality));
}
async function removeBG(file){
  if(!file?.type?.startsWith('image/')) throw new Error('Please choose an image.');
  if(file.size>20*1024*1024) throw new Error('Image is too large. Please use an image under 20 MB.');
  const response=await fetch('/api/remove-bg',{
    method:'POST',
    headers:{'Content-Type':file.type||'image/png'},
    body:file
  });
  if(!response.ok){
    let detail='';
    try{const data=await response.json();detail=data?.detail||data?.error||''}catch(_){}
    throw new Error(detail||`Background removal failed (${response.status})`);
  }
  return response.blob();
}
window.BGEraseTools={getFile,downloadBlob,bitmap,canvasBlob,removeBG};
