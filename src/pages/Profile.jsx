// src/pages/Profile.jsx
import { useEffect, useState } from "react";
import Container from "../components/Container.jsx";
import { supabase } from "../supabaseClient.js";

export default function Profile({ user }) {
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("user_profiles")
        .select("full_name, bio, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      setLoading(false);
      if (error) {
        console.error("Error fetching profile:", error.message);
      } else if (data) {
        setFullName(data.full_name || "");
        setBio(data.bio || "");
        setAvatarUrl(data.avatar_url || "");
      }
    };
    fetchProfile();
  }, [user]);

  const handleSave = async () => {
    setErrorMsg("");
    setLoading(true);

    let avatar_url = avatarUrl;

    if (imageFile) {
      const fileExt = imageFile.name.split(".").pop();
      const fileName = `avatar_${user.id}_${Date.now()}.${fileExt}`;
      const { error: uploadErr } = await supabase.storage
        .from("avatars")
        .upload(fileName, imageFile, { upsert: true });
      if (uploadErr) {
        console.error("Avatar upload error:", uploadErr.message);
        setErrorMsg("Could not upload avatar");
        setLoading(false);
        return;
      }
      const { data: pub } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);
      avatar_url = pub.publicUrl;
    }

    const { error } = await supabase
      .from("user_profiles")
      .update({
        full_name: fullName,
        bio: bio,
        avatar_url,
      })
      .eq("id", user.id);

    setLoading(false);
    if (error) {
      console.error("Error updating profile:", error.message);
      setErrorMsg("Failed to save profile");
    } else {
      setErrorMsg("Profile saved");
    }
  };

  return (
    <Container>
      <div className="py-8">
        <h2 className="text-2xl font-semibold mb-6">My Profile</h2>
        {loading ? (
          <p>Loading...</p>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">
                  Avatar
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files[0])}
                  className="mt-1 block w-full"
                />
              </label>
              {avatarUrl && (
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className="w-24 h-24 rounded-full object-cover shadow-sm"
                />
              )}
            </div>
            <div>
              <label className="block mb-1 font-medium">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full border px-3 py-2 rounded focus:outline-none focus:ring"
              />
            </div>
            <div>
              <label className="block mb-1 font-medium">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                className="w-full border px-3 py-2 rounded focus:outline-none focus:ring"
              />
            </div>
            <div>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                disabled={loading}
              >
                {loading ? "Saving..." : "Save Profile"}
              </button>
              {errorMsg && (
                <p className="mt-2 text-sm text-red-500">{errorMsg}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </Container>
  );
}
