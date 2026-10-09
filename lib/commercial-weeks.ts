import type {Period} from '@/lib/monthly-close';
export type WeekRange = { startDate: string; endDate: string };
export type CommercialWeek = WeekRange & {key:string;name:string};
export function periodBounds({year,month}:Period) {
 const prefix=`${year}-${String(month).padStart(2,'0')}`;
 return {first:`${prefix}-01`,last:`${prefix}-${new Date(Date.UTC(year,month,0)).getUTCDate()}`};
}
export function defaultWeekRanges(period:Period):WeekRange[] {
 const {first,last}=periodBounds(period),prefix=first.slice(0,8);
 return [{startDate:first,endDate:prefix+'07'},{startDate:prefix+'08',endDate:prefix+'14'},{startDate:prefix+'15',endDate:prefix+'21'},{startDate:prefix+'22',endDate:last}];
}
export function weekDefinitions(ranges:WeekRange[]):CommercialWeek[]{return ranges.map((range,index)=>({...range,key:`Week ${index+1}`,name:`Semana ${index+1}`}));}
export function nextDay(date:string){return new Date(Date.parse(date+'T12:00:00Z')+86400000).toISOString().slice(0,10);}
export function validateWeekRanges(value:unknown,period:Period):WeekRange[]{
 if(!Array.isArray(value)||value.length<1||value.length>6)throw Error('Configura entre una y seis semanas');
 const {first,last}=periodBounds(period);let expected=first;
 const ranges=value.map((row,index)=>{
  for(const key of ['startDate','endDate']){
   const v=row?.[key];if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v+'T12:00:00Z'))||new Date(v+'T12:00:00Z').toISOString().slice(0,10)!==v||v<first||v>last)throw Error(`Revisa las fechas de la semana ${index+1}: deben pertenecer al mes seleccionado`);
  }
  if(row.endDate<row.startDate)throw Error(`El fin de la semana ${index+1} debe ser igual o posterior al inicio`);
  if(row.startDate!==expected)throw Error('Las semanas deben cubrir todo el mes, en orden, sin días libres ni solapamientos');
  expected=nextDay(row.endDate);
  return {startDate:row.startDate,endDate:row.endDate};
 });
 if(ranges[ranges.length-1].endDate!==last)throw Error('La última semana debe terminar el último día del mes');
 return ranges;
}
export function weekForDate(date:Date,weeks:CommercialWeek[]){const day=date.toISOString().slice(0,10);return weeks.find(w=>day>=w.startDate&&day<=w.endDate)?.key;}
export function shortWeekDate(date:string){return `${date.slice(8,10)}/${date.slice(5,7)}`;}
