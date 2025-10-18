// src/pages/profile.jsx
import { useEffect, useState } from "react";
import Container from "../components/Container.jsx";
import { supabase } from "../supabaseClient.js";

export default function Profile({ user }) {
  // States
  const [loading, setLoading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingAuth, setSavingAuth] = useState(false);
  const [msg, setMsg] = useState("");

  // Auth data
  const [currentEmail, setCurrentEmail] = useState(user?.email || "");

  // Profile data
  const [profile, setProfile] = useState(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [imageFile, setImageFile] = useState(null);

  // Preferences
  const [allowEmail, setAllowEmail] = useState(true);
  const [allowSms, setAllowSms] = useState(false);
  const [allowPush, setAllowPush] = useState(true);

  // Auth updates
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // Fetch profile from DB
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) return;
      setLoading(true);
      setMsg("");

      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      setLoading(false);

      if (error) {
        console.error("Error fetching profile:", error.message);
        setMsg("Failed to load profile.");
        return;
      }

      if (data) {
        setProfile(data);
        setFirstName(data.first_name || "");
        setLastName(data.last_name || "");
        setDisplayName(data.display_name || "");
        setBio(data.bio || "");
        setPhone(data.phone || "");
        setAddress(data.address || "");
        setAllowEmail(data.allow_email ?? true);
        setAllowSms(data.allow_sms ?? false);
        setAllowPush(data.allow_push ?? true);
        setAvatarUrl(data.avatar_url || "");
        setCurrentEmail(data.email || user.email || "");
      }
    };

    fetchProfile();
  }, [user]);

  // Save avatar + profile fields
  const handleSaveProfile = async () => {
    if (!profile) return;
    setMsg("");
    setSavingProfile(true);

    let newAvatarUrl = avatarUrl;

    // Upload avatar if new
    if (imageFile) {
      const fileExt = imageFile.name.split(".").pop();
      const fileName = `avatar_${user.id}_${Date.now()}.${fileExt}`;
      const { error: uploadErr } = await supabase.storage
        .from("avatars")
        .upload(fileName, imageFile, { upsert: true });

      if (uploadErr) {
        console.error("Avatar upload error:", uploadErr.message);
        setMsg("Could not upload avatar.");
        setSavingProfile(false);
        return;
      }

      const { data: pub } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);
      newAvatarUrl = pub.publicUrl;
    }

    // Prepare update payload
    const updates = {
      first_name: firstName || null,
      last_name: lastName || null,
      phone: phone || null,
      address: address || null,
      allow_email: allowEmail,
      allow_sms: allowSms,
      allow_push: allowPush,
      bio: bio || null,
      avatar_url: newAvatarUrl || null,
      email: currentEmail || null,
      updated_at: new Date().toISOString(),
    };

    // Admin-only field
    if (profile?.role === "admin") {
      updates.display_name = displayName || null;
    }

    // Save to Supabase
    const { error: updateErr } = await supabase
      .from("user_profiles")
      .update(updates)
      .eq("id", user.id);

    setSavingProfile(false);

    if (updateErr) {
      console.error("Error saving profile:", updateErr.message);
      setMsg("Failed to save profile.");
    } else {
      setAvatarUrl(newAvatarUrl);
      setMsg("✅ Profile saved successfully.");
    }
  };

  // Handle Auth updates (email / password)
  const handleSaveAuth = async () => {
    setMsg("");
    setSavingAuth(true);

    try {
      // Update email
      if (newEmail && newEmail !== currentEmail) {
        const { error } = await supabase.auth.updateUser({ email: newEmail });
        if (error) throw error;

        await supabase
          .from("user_profiles")
          .update({
            email: newEmail,
            updated_at: new Date().toISOString(),
          })
          .eq("id", user.id);

        setCurrentEmail(newEmail);
        setNewEmail("");
      }

      // Update password
      if (newPassword) {
        const { error } = await supabase.auth.updateUser({
          password: newPassword,
        });
        if (error) throw error;
        setNewPassword("");
      }

      setMsg(
        "✅ Account updated. If you changed your email, please verify it via the confirmation link."
      );
    } catch (e) {
      console.error("Auth update error:", e.message);
      setMsg(e.message || "Failed to update account settings.");
    } finally {
      setSavingAuth(false);
    }
  };

  // Render
  return (
    <Container>
      <div className="py-8">
        <h2 className="text-2xl font-semibold mb-6">My Profile</h2>

        {loading ? (
          <p>Loading...</p>
        ) : (
          <div className="space-y-10">
            {/* Feedback */}
            {msg && (
              <div className="p-3 rounded bg-purple-50 text-purple-700 text-sm">
                {msg}
              </div>
            )}

            {/* Profile details */}
            <section className="space-y-6">
              <h3 className="text-lg font-semibold">Profile Details</h3>

              {/* Avatar Upload Section */}
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="flex flex-col items-center">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Profile Photo
                  </label>

                  {/* Upload button with nice border */}
                  <label
                    htmlFor="avatar-upload"
                    className="cursor-pointer flex items-center justify-center w-36 h-36 border-2 border-dashed border-gray-300 rounded-full hover:border-purple-500 hover:bg-purple-50 transition"
                  >
                    {imageFile || avatarUrl ? (
                      <img
                        src={
                          imageFile ? URL.createObjectURL(imageFile) : avatarUrl
                        }
                        alt="Preview"
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <span className="text-sm text-gray-500 text-center px-2">
                        📷 Upload Image
                      </span>
                    )}
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => setImageFile(e.target.files[0])}
                    />
                  </label>

                  {/* Add a clear text fallback under button */}
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    JPG or PNG, up to 2 MB.
                  </p>
                </div>

                {/* Display current avatar on right if exists */}
                {avatarUrl && !imageFile && (
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-1">Current Photo:</p>
                    <img
                      src={avatarUrl}
                      alt="Current avatar"
                      className="w-24 h-24 rounded-full object-cover shadow-sm mx-auto"
                    />
                  </div>
                )}
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 font-medium">First name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full border px-3 py-2 rounded focus:outline-none focus:ring"
                    placeholder="Jane"
                  />
                </div>

                <div>
                  <label className="block mb-1 font-medium">Last name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full border px-3 py-2 rounded focus:outline-none focus:ring"
                    placeholder="Doe"
                  />
                </div>

                {/* Admin-only display name */}
                {profile?.role === "admin" && (
                  <div className="md:col-span-2">
                    <label className="block mb-1 font-medium">
                      Display / Business Name
                    </label>
                    <input
                      type="text"
                      value={displayName || ""}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g. Nico’s Music Events or Green Park Tours"
                      className="w-full border px-3 py-2 rounded focus:outline-none focus:ring"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      This name will appear publicly as your organizer name on
                      events.
                    </p>
                  </div>
                )}

                {/* Bio */}
                <div className="md:col-span-2">
                  <label className="block mb-1 font-medium">Bio</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    className="w-full border px-3 py-2 rounded focus:outline-none focus:ring"
                    placeholder="Tell us a bit about yourself (optional)"
                  />
                </div>
              </div>
            </section>

            {/* Contact & Address */}
            <section className="space-y-4">
              <h3 className="text-lg font-semibold">Contact & Address</h3>
              <p className="text-sm text-gray-500">
                Your phone number and address are private and are not shown to
                other users.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 font-medium">
                    Preferred phone
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full border px-3 py-2 rounded focus:outline-none focus:ring"
                    placeholder="+44 7..."
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block mb-1 font-medium">Home address</label>
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={2}
                    className="w-full border px-3 py-2 rounded focus:outline-none focus:ring"
                    placeholder="Street, City, Postcode, Country"
                  />
                </div>
              </div>
            </section>

            {/* Preferences */}
            <section className="space-y-3">
              <h3 className="text-lg font-semibold">
                Communication Preferences
              </h3>
              <div className="flex flex-col gap-2">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={allowEmail}
                    onChange={(e) => setAllowEmail(e.target.checked)}
                  />
                  <span>Email updates</span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={allowSms}
                    onChange={(e) => setAllowSms(e.target.checked)}
                  />
                  <span>SMS notifications</span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={allowPush}
                    onChange={(e) => setAllowPush(e.target.checked)}
                  />
                  <span>
                    In-app notifications <em>Coming soon</em>
                  </span>
                </label>
              </div>
            </section>

            {/* Save profile */}
            <div>
              <button
                onClick={handleSaveProfile}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60"
                disabled={savingProfile}
              >
                {savingProfile ? "Saving..." : "Save Profile"}
              </button>
            </div>

            {/* Account (Auth) */}
            <section className="space-y-4">
              <h3 className="text-lg font-semibold">Account</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block mb-1 font-medium">
                    Current email
                  </label>
                  <input
                    type="email"
                    value={currentEmail}
                    disabled
                    className="w-full border px-3 py-2 rounded bg-gray-50 text-gray-600"
                  />
                </div>

                <div>
                  <label className="block mb-1 font-medium">Change email</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full border px-3 py-2 rounded focus:outline-none focus:ring"
                    placeholder="new-email@example.com"
                  />
                </div>

                <div>
                  <label className="block mb-1 font-medium">
                    Set new password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full border px-3 py-2 rounded focus:outline-none focus:ring"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                onClick={handleSaveAuth}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-60"
                disabled={savingAuth}
              >
                {savingAuth ? "Saving..." : "Update Account"}
              </button>

              <p className="text-xs text-gray-500 mt-2">
                Changing your email may require email verification. You might be
                signed out and asked to confirm the new address.
              </p>
            </section>
          </div>
        )}
      </div>
    </Container>
  );
}
