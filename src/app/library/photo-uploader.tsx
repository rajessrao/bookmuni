"use client";

import { type ChangeEvent, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function PhotoUploader({ copyId }: { copyId: string }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setMessage("");
    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setMessage("Your session has expired. Sign in again.");
      setBusy(false);
      return;
    }
    const path = `${user.id}/${copyId}/${crypto.randomUUID()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from("bookmuni-copy-photos").upload(path, file, { upsert: false });
    if (uploadError) {
      setMessage(uploadError.message);
      setBusy(false);
      return;
    }
    const { error: recordError } = await supabase.from("copy_photos").insert({ copy_id: copyId, storage_path: path });
    setMessage(recordError ? recordError.message : "Copy photo uploaded.");
    setBusy(false);
  }

  return <div className="mt-3"><label className="block text-sm font-semibold" htmlFor="copy-photo">Actual-copy photo</label><input id="copy-photo" type="file" accept="image/*" onChange={upload} disabled={busy} className="mt-2 block w-full rounded-xl border bg-white px-4 py-3 text-sm" />{message && <p role="status" className="mt-2 text-sm text-[var(--ink-muted)]">{message}</p>}</div>;
}