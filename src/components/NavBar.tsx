import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "Home" },
  { to: "/miles", label: "Mile Tracker" },
  { to: "/appointments", label: "Appointments" },
  { to: "/clients", label: "Clients" },
];

export const NavBar = () => {
  const location = useLocation();
  return (
    <nav className="w-full bg-white dark:bg-gray-900 shadow mb-6">
      <div className="container mx-auto flex items-center justify-between py-3 px-4">
        <span className="font-bold text-lg text-primary">Contractor App</span>
        <ul className="flex gap-4">
          {navItems.map((item) => (
            <li key={item.to}>
              <Link
                to={item.to}
                className={cn(
                  "px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors",
                  location.pathname === item.to
                    ? "bg-gray-200 dark:bg-gray-800 font-semibold"
                    : ""
                )}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
};