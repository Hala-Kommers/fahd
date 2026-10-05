import { onCLS,onINP,onLCP,type Metric } from 'web-vitals';
import { getAnalyticsIdentity } from './analytics';
export function startVitals(){
 const report=(m:Metric)=>{
 if(location.pathname.startsWith('/admin'))return;
 const base=(import.meta.env.VITE_API_BASE_URL||'').replace(/\/$/,'');if(!base)return;
 void fetch(`${base}/api/analytics/events`,{method:'POST',headers:{'Content-Type':'application/json'},keepalive:true,body:JSON.stringify({...getAnalyticsIdentity(),eventType:'web_vital',path:location.pathname,metadata:{name:m.name,value:m.value,rating:m.rating,metricId:m.id,device:matchMedia('(max-width:767px)').matches?'mobile':'desktop'}})}).catch(()=>{});
 };
 onCLS(report);onINP(report);onLCP(report);
}
