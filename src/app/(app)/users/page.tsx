import { DataTable, PageHeader } from "@/components/ui";
export default function Users() { return <div className="page"><PageHeader title="Users" subtitle="User access and role management" action="Add User" href="#add" /><DataTable collection="users" columns={[{key:"name",label:"Name"},{key:"username",label:"Username"},{key:"role",label:"Role"},{key:"status",label:"Status"}]} /></div>; }
