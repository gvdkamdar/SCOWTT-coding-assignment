import Image from "next/image";
import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import LogoutButton from "@/components/LogoutButton";
import FactCard from "@/components/FactCard";


export default async function HomePage() {
  const session = await getAuthSession();
  const user = session?.user;

  if (!user?.email) {
    redirect("/login");
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email },
    select: { favoriteMovieId: true, name: true, email: true, image: true },
  });

  if (!dbUser?.favoriteMovieId) {
    redirect("/onboarding");
  }

  return (
    <main className="container">
      <div className="card">
        <h1>Home</h1>

        <div className="row">
          {user.image ? (
            <Image
              src={user.image}
              alt="Profile"
              width={56}
              height={56}
              style={{ borderRadius: 999 }}
            />
          ) : (
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 999,
                background: "#e5e7eb",
                display: "grid",
                placeItems: "center",
                fontWeight: 600,
              }}
            >
              {user.name?.[0] ?? "U"}
            </div>
          )}
          <div>
            <div style={{ fontWeight: 600 }}>{user.name ?? "No name"}</div>
            <div style={{ color: "#555" }}>{user.email ?? "No email"}</div>
          </div>
        </div>

        <div className="spacer" />
        <p>You will see a new fun fact each refresh.</p>

        <div className="spacer" />
        <LogoutButton />
      </div>

      {/* Fact box */}
      <FactCard />
    </main>
  );
}
