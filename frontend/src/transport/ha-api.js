export async function authenticatedGet(hass,path,timeoutMs=8000) {
  if(hass?.callApi) {
    let timer;
    try {
      return await Promise.race([hass.callApi('GET',path),new Promise((_,reject)=>{
        timer=setTimeout(()=>reject(Error('Home Assistant request timed out')),timeoutMs);
      })]);
    }finally{clearTimeout(timer);}
  }
  const token=hass?.auth?.data?.access_token;
  const response=await fetch('/api/'+path,{headers:token?{Authorization:'Bearer '+token}:{},signal:AbortSignal.timeout(timeoutMs)});
  if(!response.ok)throw Error('Home Assistant request failed ('+response.status+')');
  return response.json();
}
