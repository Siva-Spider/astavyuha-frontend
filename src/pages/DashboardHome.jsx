import { useOutletContext } from "react-router-dom";

export default function DashboardHome() {
  const { user } = useOutletContext(); // get user from Dashboard Outlet

  return (
    <div>
      <h2>Welcome, {user?.username || "Admin"}!</h2>
      <p>This is your dashboard area.</p>
    </div>
  );
}
