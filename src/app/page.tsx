import Image from "next/image";
import { redirect } from "next/navigation";

import LogoutButton from "@/components/LogoutButton";
import FactCard from "@/components/FactCard";

import { UserService } from "@/services/userService";

export default async function HomePage() {

  // record the user access result
  const userAccessResult = await UserService.validateUserAccess();

  // if success false, then redirect
  if (!userAccessResult.success) {
    redirect(userAccessResult.redirectTo)
  }

  // if success true, then we have user
  const user = userAccessResult.user;

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
