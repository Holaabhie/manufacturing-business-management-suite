"use client";

import { useEffect, useState } from "react";
import { Users, Search, Shield, ShieldAlert, CheckCircle2, UserCog, Mail, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { AccessDenied } from "@/components/AccessDenied";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface User {
    id: string;
    email: string;
    role: "Admin" | "Staff";
    full_name: string | null;
    subscription_tier: string;
    createdAt: string;
}

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
    const [roleLoading, setRoleLoading] = useState(true);

    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [newRole, setNewRole] = useState<"Admin" | "Staff">("Staff");
    const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
    const [updating, setUpdating] = useState(false);

    const fetchData = async () => {
        try {
            // Fetch current user role first
            const meRes = await fetch("/api/auth/me");
            const meData = await meRes.json();
            const myRole = meData?.user?.role || null;
            setCurrentUserRole(myRole);
            setRoleLoading(false);

            if (myRole === "Admin") {
                const usersRes = await fetch("/api/users");
                if (usersRes.ok) {
                    const usersData = await usersRes.json();
                    setUsers(usersData);
                }
            }
        } catch (error) {
            console.error("Failed to fetch data:", error);
            toast.error("Failed to fetch users");
        } finally {
            setLoading(false);
            setRoleLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleRoleUpdate = async () => {
        if (!selectedUser) return;

        setUpdating(true);
        try {
            const res = await fetch(`/api/users/${selectedUser.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ role: newRole }),
            });

            const data = await res.json();

            if (data.error) {
                toast.error(data.error);
            } else {
                toast.success(`Role updated to ${newRole} for ${selectedUser.email}`);
                // Update local state
                setUsers(users.map(u => u.id === selectedUser.id ? { ...u, role: newRole } : u));
                setIsRoleDialogOpen(false);
            }
        } catch (error) {
            toast.error("Failed to update role");
        } finally {
            setUpdating(false);
        }
    };

    const filteredUsers = users.filter(user =>
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.full_name && user.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (roleLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            </div>
        );
    }

    if (currentUserRole !== "Admin") {
        return (
            <AccessDenied
                title="Restricted Access"
                description="User management is strictly limited to administrators."
            />
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-3">
                        <Users className="h-8 w-8 text-emerald-600" />
                        User Management
                    </h1>
                    <p className="text-zinc-500 dark:text-zinc-400 mt-1">Manage system access and assign user roles.</p>
                </div>

                <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                    <Input
                        placeholder="Search users..."
                        className="pl-10 border-zinc-200 dark:border-zinc-800 focus:ring-emerald-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-950">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-zinc-50 dark:bg-zinc-900/50 hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                                <TableHead className="pl-6 uppercase text-xs font-bold text-zinc-500">User</TableHead>
                                <TableHead className="uppercase text-xs font-bold text-zinc-500">Role</TableHead>
                                <TableHead className="uppercase text-xs font-bold text-zinc-500">Joined</TableHead>
                                <TableHead className="text-right pr-6 uppercase text-xs font-bold text-zinc-500">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-32 text-center text-zinc-500">
                                        Loading users...
                                    </TableCell>
                                </TableRow>
                            ) : filteredUsers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-32 text-center text-zinc-500">
                                        No users found matching "{searchTerm}"
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredUsers.map((user) => (
                                    <TableRow key={user.id} className="group hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                                        <TableCell className="pl-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-bold">
                                                    {user.full_name ? user.full_name[0].toUpperCase() : user.email[0].toUpperCase()}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                                                        {user.full_name || "Unknown Name"}
                                                    </span>
                                                    <span className="text-xs text-zinc-500 flex items-center gap-1">
                                                        <Mail className="h-3 w-3" />
                                                        {user.email}
                                                    </span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className={`gap-1.5 pl-1.5 pr-2.5 py-0.5 rounded-full font-bold ${user.role === "Admin"
                                                    ? "border-purple-200 bg-purple-50 text-purple-700 dark:bg-purple-950/20 dark:border-purple-800 dark:text-purple-300"
                                                    : "border-zinc-200 bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-400"
                                                    }`}
                                            >
                                                {user.role === "Admin" ? (
                                                    <ShieldAlert className="h-3.5 w-3.5" />
                                                ) : (
                                                    <UserCog className="h-3.5 w-3.5" />
                                                )}
                                                {user.role}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm text-zinc-500 flex items-center gap-1.5">
                                                <Calendar className="h-3.5 w-3.5" />
                                                {new Date(user.createdAt).toLocaleDateString()}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="opacity-0 group-hover:opacity-100 transition-opacity font-medium text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                                                onClick={() => {
                                                    setSelectedUser(user);
                                                    setNewRole(user.role);
                                                    setIsRoleDialogOpen(true);
                                                }}
                                            >
                                                Manage Role
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Update User Role</DialogTitle>
                        <DialogDescription>
                            Change access level for <span className="font-semibold text-zinc-900 dark:text-zinc-100">{selectedUser?.email}</span>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <label htmlFor="role" className="text-sm font-medium">Select Role</label>
                            <Select value={newRole} onValueChange={(v: "Admin" | "Staff") => setNewRole(v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Admin">
                                        <div className="flex items-center gap-2">
                                            <ShieldAlert className="h-4 w-4 text-purple-600" />
                                            <span>Admin (Full Access)</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="Staff">
                                        <div className="flex items-center gap-2">
                                            <UserCog className="h-4 w-4 text-zinc-600" />
                                            <span>Staff (Limited Access)</span>
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {newRole === "Admin" && (
                            <div className="flex items-start gap-3 p-3 bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-300 rounded-lg text-sm">
                                <Shield className="h-5 w-5 flex-shrink-0 mt-0.5" />
                                <p>Admins have full control over the system, including financial data, settings, and other users.</p>
                            </div>
                        )}

                        {newRole === "Staff" && (
                            <div className="flex items-start gap-3 p-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-lg text-sm">
                                <Shield className="h-5 w-5 flex-shrink-0 mt-0.5" />
                                <p>Staff members can manage orders and inventory but cannot access billing, payments, or company settings.</p>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsRoleDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleRoleUpdate} disabled={updating || selectedUser?.role === newRole} className="bg-emerald-600 hover:bg-emerald-700">
                            {updating ? "Updating..." : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
