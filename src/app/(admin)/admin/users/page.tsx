import { getUsers } from "@/app/actions/admin";
import { AdminUsersTable } from "@/components/admin/users-table";

export default async function AdminUsersPage() {
    const data = await getUsers(1, 50);
    return <AdminUsersTable initialData={data} />;
}
