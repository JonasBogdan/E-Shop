"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type Profile = {
  full_name: string | null;
  phone: string | null;
  address_line1: string | null;
  city: string | null;
  postal_code: string | null;
};

type Props = {
  email: string;
  profile: Profile | null;
};

export function ProfileForm({ email, profile }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    full_name: profile?.full_name ?? "",
    phone: profile?.phone ?? "",
    address_line1: profile?.address_line1 ?? "",
    city: profile?.city ?? "",
    postal_code: profile?.postal_code ?? "",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSaved(false);
    setError(null);
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSaved(false);
    setError(null);

    const res = await fetch("/api/account/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    setLoading(false);

    if (res.ok) {
      setSaved(true);
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong. Please try again.");
    }
  }

  return (
    <div className="space-y-6">
      {/* Email (read-only) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <p className="mb-1 text-sm font-medium text-muted-foreground">Email</p>
            <p className="text-sm">{email}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Email cannot be changed here.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Editable profile form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="full_name" className="mb-1.5 block text-sm font-medium">
                Full Name
              </label>
              <Input
                id="full_name"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                placeholder="Full name"
                autoComplete="name"
              />
            </div>

            <div>
              <label htmlFor="phone" className="mb-1.5 block text-sm font-medium">
                Phone Number
              </label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+370 600 00000"
                autoComplete="tel"
              />
            </div>

            <Separator />

            <p className="text-sm font-medium text-muted-foreground">
              Default Shipping Address
            </p>

            <div>
              <label htmlFor="address_line1" className="mb-1.5 block text-sm font-medium">
                Address
              </label>
              <Input
                id="address_line1"
                name="address_line1"
                value={formData.address_line1}
                onChange={handleChange}
                placeholder="Street address"
                autoComplete="street-address"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="city" className="mb-1.5 block text-sm font-medium">
                  City
                </label>
                <Input
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="Vilnius"
                  autoComplete="address-level2"
                />
              </div>
              <div>
                <label htmlFor="postal_code" className="mb-1.5 block text-sm font-medium">
                  Postal Code
                </label>
                <Input
                  id="postal_code"
                  name="postal_code"
                  value={formData.postal_code}
                  onChange={handleChange}
                  placeholder="01001"
                  autoComplete="postal-code"
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Save Changes"}
              </Button>
              {saved && (
                <p className="text-sm text-green-600">Profile updated!</p>
              )}
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
