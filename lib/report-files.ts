export const FILE_LIMIT=10*1024*1024;
export const REPORT_CATEGORIES:Record<string,string>={FINAL_REPORT:'Informe final',ATTENDANCE:'Asistencia',EVALUATIONS:'Evaluaciones',EVIDENCE:'Evidencias'};
export const REPORT_MIMES:Record<string,string[]>={
 'application/pdf':['pdf'], 'application/msword':['doc'],
 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':['docx'],
 'application/vnd.ms-excel':['xls'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':['xlsx'],
 'image/jpeg':['jpg','jpeg'],'image/png':['png'],'image/webp':['webp']
};
export function fileType(name:string,type:string){const ext=name.split('.').pop()?.toLowerCase();return REPORT_MIMES[type]?.includes(ext??'')?type:Object.keys(REPORT_MIMES).find(t=>REPORT_MIMES[t].includes(ext??''));}
