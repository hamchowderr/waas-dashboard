"use client";

import * as React from "react";
import { Check, Copy, MailIcon, MoreHorizontalIcon, UserPlusIcon, UserMinusIcon, XIcon } from "lucide-react";
import { toast } from "sonner";

import type { Team, TeamInvitation, TeamMember, TeamOf, TeamRole } from "@/lib/api/types";
import { formatDate } from "@/lib/format";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cancelInvitation, inviteTeammate, removeMember, setMemberRole } from "../actions";

/** Below sm the header's button moves under its text instead of squeezing it. */
const headerClass = "max-sm:has-data-[slot=card-action]:grid-cols-1";
const actionClass = "max-sm:col-start-1 max-sm:row-span-1 max-sm:row-start-auto max-sm:justify-self-start";
const tableClass =
  "[&_td:first-child]:ps-(--card-spacing) [&_td:last-child]:pe-(--card-spacing) [&_th:first-child]:ps-(--card-spacing) [&_th:last-child]:pe-(--card-spacing)";

const roles: { value: TeamRole; label: string; about: string }[] = [
  { value: "member", label: "Member", about: "Can look at everything, but not change it." },
  { value: "admin", label: "Admin", about: "Can make changes and invite people." },
  { value: "owner", label: "Owner", about: "Everything an admin can do, and manage owners." },
];
const roleLabel = (role: string) => roles.find((r) => r.value === role)?.label ?? role;

/** The highest of a role list (the API may keep several, comma separated). */
function topRole(role: string): TeamRole {
  const all = role.split(",").map((r) => r.trim());
  return all.includes("owner") ? "owner" : all.includes("admin") ? "admin" : "member";
}

/** The person viewing: role null for the platform admin, who may do anything. */
type Me = { userId: string; role: string | null };

function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={async () => {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <Check /> : <Copy />}
      <span className="sr-only">Copy invitation link</span>
    </Button>
  );
}

/**
 * A storefront's team, or with `reseller` a reseller's (productId and productName are then the
 * reseller's), whose people sign in to every storefront the reseller has.
 */
export function TeamManager({
  productId,
  productName,
  team,
  me,
  reseller = false,
}: {
  productId: string;
  productName: string;
  team: Team;
  me: Me;
  reseller?: boolean;
}) {
  const of: TeamOf = reseller ? { resellerId: productId } : productId;
  const myRole = me.role === null ? null : topRole(me.role);
  const canChange = myRole !== "member";
  const isOwner = myRole === null || myRole === "owner";
  const owners = team.members.filter((m) => topRole(m.role) === "owner").length;
  /** Roles this viewer may hand out: only owners (and the platform admin) touch owners. */
  const grantable = roles.filter((r) => isOwner || r.value !== "owner");

  const [inviting, setInviting] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState<TeamRole>(team.members.length === 0 ? "owner" : "member");
  const [unsent, setUnsent] = React.useState<{ email: string; url: string } | null>(null);
  const [removing, setRemoving] = React.useState<TeamMember | null>(null);
  const [cancelling, setCancelling] = React.useState<TeamInvitation | null>(null);
  const [pending, startTransition] = React.useTransition();

  const mayManage = (m: TeamMember) => {
    if (!canChange || m.userId === me.userId) return false;
    const theirs = topRole(m.role);
    if (theirs === "owner" && !isOwner) return false;
    return true;
  };

  const invite = () =>
    startTransition(async () => {
      const result = await inviteTeammate(of, email, role);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setInviting(false);
      setEmail("");
      if (result.data.emailed) toast.success(`Invitation emailed to ${result.data.email}`);
      else if (result.data.acceptUrl) setUnsent({ email: result.data.email, url: result.data.acceptUrl });
    });

  const changeRole = (m: TeamMember, next: TeamRole) =>
    startTransition(async () => {
      const result = await setMemberRole(of, m.id, next);
      if (result.ok) toast.success(`${m.name || m.email} is now ${roleLabel(next).toLowerCase()}`);
      else toast.error(result.error);
    });

  return (
    <>
      <Card>
        <CardHeader className={headerClass}>
          <CardTitle>{reseller ? "Team" : "People"}</CardTitle>
          <CardDescription>
            {reseller && "Everyone here signs in to all of this reseller's storefronts. "}
            {team.members.length === 0
              ? `Nobody can sign in ${reseller ? "for" : "to"} ${productName} yet. Invite its owner first.`
              : "Owners and admins can make changes. Members can only look."}
          </CardDescription>
          {canChange && (
            <CardAction className={actionClass}>
              <Button size="sm" onClick={() => setInviting(true)}>
                <UserPlusIcon /> Invite
              </Button>
            </CardAction>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <Table className={tableClass}>
            <TableHeader>
              <TableRow>
                <TableHead>Person</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="max-sm:hidden">Joined</TableHead>
                <TableHead className="w-12">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {team.members.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground h-20 text-center">
                    No one yet.
                  </TableCell>
                </TableRow>
              )}
              {team.members.map((m) => {
                const theirs = topRole(m.role);
                return (
                  <TableRow key={m.id}>
                    <TableCell className="whitespace-normal">
                      <div className="font-medium">
                        {m.name || m.email}
                        {m.userId === me.userId && <span className="text-muted-foreground font-normal"> (you)</span>}
                      </div>
                      {m.name && m.name !== m.email && (
                        <div className="text-muted-foreground text-xs break-all">{m.email}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={theirs === "member" ? "secondary" : "outline"}>{roleLabel(theirs)}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap max-sm:hidden">
                      {formatDate(m.dateCreated)}
                    </TableCell>
                    <TableCell>
                      {mayManage(m) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm" disabled={pending}>
                              <span className="sr-only">Actions for {m.name || m.email}</span>
                              <MoreHorizontalIcon />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Role</DropdownMenuLabel>
                            <DropdownMenuRadioGroup
                              value={theirs}
                              onValueChange={(next) => next !== theirs && changeRole(m, next as TeamRole)}
                            >
                              {grantable.map((r) => (
                                <DropdownMenuRadioItem
                                  key={r.value}
                                  value={r.value}
                                  disabled={theirs === "owner" && r.value !== "owner" && owners <= 1}
                                >
                                  {r.label}
                                </DropdownMenuRadioItem>
                              ))}
                            </DropdownMenuRadioGroup>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              disabled={theirs === "owner" && owners <= 1 && myRole !== null}
                              onSelect={() => setRemoving(m)}
                            >
                              <UserMinusIcon /> Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {team.invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Invitations</CardTitle>
            <CardDescription>
              Waiting to be accepted. Each was emailed, and lasts 7 days. Copy a link to send it yourself.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table className={tableClass}>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="max-sm:hidden">Expires</TableHead>
                  <TableHead className="w-24">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {team.invitations.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="whitespace-normal break-all">
                      <MailIcon className="text-muted-foreground me-1.5 inline size-4" />
                      {i.email}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{roleLabel(i.role)}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap max-sm:hidden">
                      {formatDate(i.expiresAt)}
                    </TableCell>
                    <TableCell className="text-end whitespace-nowrap">
                      {i.acceptUrl && <CopyLink url={i.acceptUrl} />}
                      {canChange && (isOwner || i.role !== "owner") && (
                        <Button variant="ghost" size="icon-sm" onClick={() => setCancelling(i)}>
                          <XIcon />
                          <span className="sr-only">Cancel the invitation to {i.email}</span>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={inviting} onOpenChange={(next) => !pending && setInviting(next)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite someone to {productName}</DialogTitle>
            <DialogDescription>
              They get an email with a link. They sign in with this address, then join.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              invite();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="invite-email">Email address</Label>
              <Input
                id="invite-email"
                type="email"
                autoComplete="off"
                placeholder="name@yourbusiness.com"
                required
                value={email}
                maxLength={254}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as TeamRole)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {grantable.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-sm">{roles.find((r) => r.value === role)?.about}</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" disabled={pending} onClick={() => setInviting(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending || !email.trim()}>
                {pending && <Spinner />}
                Send invitation
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={unsent !== null} onOpenChange={(next) => !next && setUnsent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>The email didn&apos;t go</DialogTitle>
            <DialogDescription>
              The invitation for {unsent?.email} is ready, but it couldn&apos;t be emailed. Send them this link yourself.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted flex items-center gap-2 rounded-md border px-3 py-1.5">
            <code className="min-w-0 flex-1 font-mono text-sm break-all">{unsent?.url}</code>
            {unsent && <CopyLink url={unsent.url} />}
          </div>
          <DialogFooter>
            <Button onClick={() => setUnsent(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmAction
        open={removing !== null}
        onOpenChange={(next) => !next && setRemoving(null)}
        title={`Remove ${removing ? removing.name || removing.email : "them"}?`}
        description={
          <p>
            They can no longer sign in {reseller ? "for" : "to"} {productName}. Their account stays, and you can invite them again later.
          </p>
        }
        confirmLabel="Remove"
        destructive
        onConfirm={async () => {
          if (!removing) return false;
          const result = await removeMember(of, removing.id);
          if (result.ok) toast.success(`${removing.name || removing.email} removed`);
          else toast.error(result.error);
          return result.ok;
        }}
      />

      <ConfirmAction
        open={cancelling !== null}
        onOpenChange={(next) => !next && setCancelling(null)}
        title={`Cancel the invitation to ${cancelling?.email ?? ""}?`}
        description={<p>Its link stops working. You can invite them again later.</p>}
        confirmLabel="Cancel invitation"
        destructive
        onConfirm={async () => {
          if (!cancelling) return false;
          const result = await cancelInvitation(of, cancelling.id);
          if (result.ok) toast.success("Invitation cancelled");
          else toast.error(result.error);
          return result.ok;
        }}
      />
    </>
  );
}
