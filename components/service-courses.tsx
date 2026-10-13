"use client";
import {useState} from 'react';
import {Meta,Service,serviceCourses} from '@/lib/ui-types';
import CatalogPicker from '@/components/catalog-picker';
export default function ServiceCourses({courses,service,draftCourseIds}:{courses:Meta[];service:Service|null;draftCourseIds?:string[]}){
 const [selected,setSelected]=useState(()=>service?serviceCourses(service).map(c=>c.id):draftCourseIds||[]);
 return <CatalogPicker title="Cursos del servicio" name="courseIds" items={courses} selected={selected} onChange={setSelected} className="instructor-courses course-picker" description="Selecciona uno o varios cursos. Comparten un solo importe."/>;
}
