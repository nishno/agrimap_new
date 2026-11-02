import './entry-controls.css';
import React,{useEffect,useState} from 'react';
import {useLanguage} from '../contexts/LanguageContext';

export function LanguageSwitch({ className }: { className?: string } = {}) {
 const {language,setLanguage,t}=useLanguage();
 return <button type="button" className={className || "entry-language"} aria-label={t('entry.language')} onClick={()=>setLanguage(language==='ka'?'en':'ka')}>
  <span className="font-bold text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200 leading-none">{language==='ka'?'GE':'EN'}</span>
  <span className="text-xs font-semibold">{language==='ka'?'ქართული':'English'}</span>
 </button>;
}
export function CloudAccessLinks(){
 const {t}=useLanguage();const local=Boolean((window as any).__AGRIMAP_LOCAL__);
 const [origin,setOrigin]=useState<string|null>(local?null:location.origin);
 useEffect(()=>{if(!local)return;let active=true;fetch('/api/local/status',{cache:'no-store'}).then(r=>r.json()).then(status=>{if(active&&status.cloudUrl)setOrigin(new URL(status.cloudUrl).origin);}).catch(()=>{});return()=>{active=false;};},[local]);
 return <div className="entry-cloud-actions">
  {origin?<><a className="demo-primary" href={origin+'/?register=1'}>{t('entry.cloud_register')}</a><a href={origin+'/?login=1'}>{t('entry.cloud_login')}</a></>:<><button disabled>{t('entry.cloud_register')}</button><p>{t('entry.cloud_restart')}</p></>}
  <small>{t('entry.cloud_separate')}</small>
 </div>;
}
