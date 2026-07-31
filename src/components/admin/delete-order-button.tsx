"use client";

import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export function DeleteOrderButton({ orderId }: { orderId: string }) {
  const router = useRouter();

  async function handleDelete() {
    if (!confirm("Delete this order? This cannot be undone.")) return;
    await fetch(`/api/admin/orders/${orderId}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleDelete} className="text-destructive hover:text-destructive">
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}
