import { createClient } from "@/utils/supabase/server";
import UniboxClient from "./unibox-client"; // We'll define a separate client component

export default async function ProtectedPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return <div>No user session found!</div>;
  }

  const { data: backends, error: beError } = await supabase
    .from("backends")
    .select("id, base_url, created_at")
    .eq("user_id", user.id); 

  if (beError) {
    return <div>Error loading backends: {beError.message}</div>;
  }

  const userBackends = backends || [];

  return (
    <section>
      <UniboxClient userBackends={userBackends} />
    </section>
  );
}
