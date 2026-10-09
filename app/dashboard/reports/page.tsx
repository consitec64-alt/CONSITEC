import {redirect} from 'next/navigation';import {currentUser} from '@/lib/current-user';import ReportsPanel from './reports-panel';
export const dynamic='force-dynamic';
export default async function ReportsPage(){const user=await currentUser();if(!user)redirect('/login');if(!['ADMIN','REPORTS'].includes(user.role))redirect('/dashboard');return <ReportsPanel user={{id:user.id,username:user.username,role:user.role}}/>;}
