"use client";

import { CopyIcon, SendIcon, Share2Icon } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { INVITE_DAYS } from "@/lib/invite-settings";
import { createInviteLink } from "../actions";

export function InviteButton({
  clientId,
  clientName,
  invited,
}: {
  clientId: string;
  clientName: string;
  invited: boolean;
}) {
  const [link, setLink] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const firstName = clientName.split(" ")[0];

  function create() {
    startTransition(async () => {
      const result = await createInviteLink(clientId);
      if (result.error) toast.error(result.error);
      else if (result.link) setLink(result.link);
    });
  }

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link copied");
    } catch {
      inputRef.current?.select();
      toast("Select the link and copy it.");
    }
  }

  async function share() {
    if (!link) return;
    try {
      await navigator.share({
        title: "Your Spotter login",
        text: `Hi ${firstName}, here's your link to log in to Spotter:`,
        url: link,
      });
    } catch {
      // The person closed the share sheet.
    }
  }

  const canShare = typeof navigator !== "undefined" && "share" in navigator;

  return (
    <>
      <Button variant={invited ? "outline" : "default"} onClick={create} disabled={pending}>
        <SendIcon />
        {pending ? "Creating link…" : invited ? "Create a new login link" : "Invite to Spotter"}
      </Button>

      <Dialog open={link !== null} onOpenChange={(open) => !open && setLink(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send this link to {firstName}</DialogTitle>
            <DialogDescription>
              They choose a password and are logged in. It works once and
              expires in {INVITE_DAYS} days.
            </DialogDescription>
          </DialogHeader>
          <Input
            ref={inputRef}
            readOnly
            value={link ?? ""}
            aria-label="Login link"
            onFocus={(event) => event.currentTarget.select()}
          />
          <DialogFooter>
            {canShare && (
              <Button variant="outline" onClick={share}>
                <Share2Icon />
                Share
              </Button>
            )}
            <Button onClick={copy}>
              <CopyIcon />
              Copy link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
